const crypto = require('node:crypto');
const { all, get, pool } = require('../database/db');
const { evaluateUser } = require('./achievementService');

function gameError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

async function availability(bookId, type, count) {
  const row = await get(
    `SELECT COUNT(*)::int AS available FROM questions q
     JOIN question_banks qb ON qb.id=q.question_bank_id
     WHERE qb.book_id=? AND q.type=?`,
    [bookId, type],
  );
  const available = Number(row?.available || 0);
  return { available, isAvailable: available >= count };
}

async function shapeGame(row) {
  if (!row) return null;
  const counts = await Promise.all([
    availability(row.book_id, 'MC', row.question_count),
    availability(row.book_id, 'TF', row.question_count),
  ]);
  const selected = row.question_type === 'MC' ? counts[0] : counts[1];
  return {
    id: row.id,
    book_id: row.book_id,
    book: {
      id: row.book_id,
      title: row.book_title,
      author: row.book_author,
      cover_url: row.book_cover_url,
    },
    question_type: row.question_type,
    title: row.title,
    name: row.title,
    description: row.description,
    question_count: Number(row.question_count),
    reward_cups: Number(row.reward_cups ?? 1),
    available_question_count: selected.available,
    is_available: selected.isAvailable,
    created_by: row.created_by,
    created_by_name: row.created_by_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const gameSelect = `SELECT g.*, b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover_url,
  u.name AS created_by_name FROM games g JOIN books b ON b.id=g.book_id
  LEFT JOIN users u ON u.id=g.created_by`;

async function getGame(id) {
  return shapeGame(await get(`${gameSelect} WHERE g.id=?`, [id]));
}

async function listGames() {
  const rows = await all(`${gameSelect} ORDER BY g.updated_at DESC, g.id DESC`);
  return Promise.all(rows.map(shapeGame));
}

async function questionBankCounts(bookId) {
  const book = await get('SELECT id, title, author, cover_url FROM books WHERE id=?', [bookId]);
  if (!book) throw gameError('BOOK_NOT_FOUND', 'Không tìm thấy sách.', 404);
  const bank = await get('SELECT id FROM question_banks WHERE book_id=?', [bookId]);
  const counts = bank
    ? await get(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE type='MC')::int AS mc,
        COUNT(*) FILTER (WHERE type='TF')::int AS tf FROM questions WHERE question_bank_id=?`,
        [bank.id],
      )
    : { total: 0, mc: 0, tf: 0 };
  return {
    book,
    questionBankId: bank?.id || null,
    statistics: { total: Number(counts.total), mc: Number(counts.mc), tf: Number(counts.tf) },
  };
}

async function listQuestionBankBooks(search = '') {
  const term = typeof search === 'string' ? search.trim().slice(0, 120) : '';
  const params = term ? [`%${term}%`, `%${term}%`, `%${term}%`] : [];
  return all(
    `SELECT b.id, b.title, b.author, b.cover_url,
      COUNT(q.id)::int AS question_count,
      COUNT(q.id) FILTER (WHERE q.type='MC')::int AS mc_count,
      COUNT(q.id) FILTER (WHERE q.type='TF')::int AS tf_count
    FROM books b JOIN question_banks qb ON qb.book_id=b.id
    JOIN questions q ON q.question_bank_id=qb.id
    ${term ? "WHERE b.title ILIKE ? OR COALESCE(b.author, '') ILIKE ? OR COALESCE(b.publisher, '') ILIKE ?" : ''}
    GROUP BY b.id HAVING COUNT(q.id) > 0
    ORDER BY lower(b.title), b.id LIMIT 100`,
    params,
  );
}

async function createGame({
  bookId,
  questionType,
  title,
  description,
  questionCount,
  cupReward,
  createdBy,
}) {
  const stats = await questionBankCounts(bookId);
  if (!stats.questionBankId)
    throw gameError('QUESTION_BANK_NOT_FOUND', 'Sách chưa có Question Bank.', 409);
  const available = stats.statistics[questionType.toLowerCase()];
  if (questionCount > available)
    throw gameError(
      'QUESTION_COUNT_EXCEEDS_BANK',
      `Chỉ còn ${available} câu ${questionType} trong Question Bank.`,
      400,
    );
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO games(id, book_id, question_type, title, description, question_count, reward_cups, created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, bookId, questionType, title, description || null, questionCount, cupReward, createdBy],
  );
  return getGame(id);
}

async function updateGame(id, { title, description, questionCount, cupReward }) {
  const existing = await getGame(id);
  if (!existing) throw gameError('GAME_NOT_FOUND', 'Không tìm thấy game.', 404);
  const stats = await questionBankCounts(existing.book_id);
  const available = stats.statistics[existing.question_type.toLowerCase()];
  if (questionCount > available)
    throw gameError(
      'QUESTION_COUNT_EXCEEDS_BANK',
      `Chỉ còn ${available} câu ${existing.question_type} trong Question Bank.`,
      400,
    );
  await pool.query(
    'UPDATE games SET title=$1, description=$2, question_count=$3, reward_cups=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5',
    [title, description || null, questionCount, cupReward, id],
  );
  return getGame(id);
}

async function deleteGame(id) {
  const result = await pool.query('DELETE FROM games WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

function safeQuestion(row) {
  return row.type === 'MC'
    ? {
        id: row.id,
        type: row.type,
        content: row.content,
        point: Number(row.point),
        options: row.options,
      }
    : { id: row.id, type: row.type, content: row.content, point: Number(row.point) };
}

async function startSession(gameId, userId) {
  const game = await getGame(gameId);
  if (!game) throw gameError('GAME_NOT_FOUND', 'Không tìm thấy game.', 404);
  if (!game.is_available)
    throw gameError(
      'GAME_UNAVAILABLE',
      `Game cần ${game.question_count} câu nhưng Question Bank chỉ còn ${game.available_question_count} câu.`,
      409,
    );
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows = await client.query(
      `SELECT q.id, q.type, q.content, q.point,
      COALESCE(json_agg(json_build_object('id', qo.id, 'label', qo.label, 'position', qo.position) ORDER BY qo.position)
        FILTER (WHERE qo.id IS NOT NULL), '[]'::json) AS options
      FROM questions q JOIN question_banks qb ON qb.id=q.question_bank_id
      LEFT JOIN question_options qo ON qo.question_id=q.id
      WHERE qb.book_id=$1 AND q.type=$2 GROUP BY q.id ORDER BY random() LIMIT $3`,
      [game.book_id, game.question_type, game.question_count],
    );
    if (rows.rowCount !== game.question_count)
      throw gameError('GAME_UNAVAILABLE', 'Question Bank không còn đủ câu để bắt đầu game.', 409);
    const sessionId = crypto.randomUUID();
    await client.query(
      `INSERT INTO game_sessions(id, game_id, user_id, total_points, total_questions)
      VALUES($1,$2,$3,$4,$5)`,
      [
        sessionId,
        game.id,
        userId,
        rows.rows.reduce((sum, row) => sum + Number(row.point), 0),
        rows.rowCount,
      ],
    );
    for (const [position, row] of rows.rows.entries()) {
      await client.query(
        'INSERT INTO game_session_questions(id, session_id, question_id, position) VALUES($1,$2,$3,$4)',
        [crypto.randomUUID(), sessionId, row.id, position],
      );
    }
    await client.query('COMMIT');
    return {
      sessionId,
      game,
      questions: rows.rows.map(safeQuestion),
      completedAt: null,
      result: null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getSession(sessionId, userId) {
  const row = await get(
    `${gameSelect.replace('SELECT g.*', 'SELECT gs.id AS session_id, gs.completed_at, gs.score, gs.total_points, gs.correct_count, gs.total_questions, gs.started_at, g.*')} 
    JOIN game_sessions gs ON gs.game_id=g.id
    WHERE gs.id=? AND gs.user_id=?`,
    [sessionId, userId],
  );
  if (!row) throw gameError('SESSION_NOT_FOUND', 'Không tìm thấy phiên chơi.', 404);
  const questions = await all(
    `SELECT q.id, q.type, q.content, q.point,
      COALESCE(json_agg(json_build_object('id', qo.id, 'label', qo.label, 'position', qo.position) ORDER BY qo.position)
        FILTER (WHERE qo.id IS NOT NULL), '[]'::json) AS options
    FROM game_session_questions gsq
    JOIN questions q ON q.id=gsq.question_id
    LEFT JOIN question_options qo ON qo.question_id=q.id
    WHERE gsq.session_id=?
    GROUP BY q.id, gsq.position
    ORDER BY gsq.position`,
    [sessionId],
  );
  const session = {
    sessionId,
    game: await shapeGame(row),
    questions: questions.map(safeQuestion),
    completedAt: row.completed_at,
    result: null,
  };
  if (row.completed_at) session.result = await resultFor(sessionId, userId);
  return session;
}

async function previewQuestions(gameId) {
  const game = await getGame(gameId);
  if (!game) throw gameError('GAME_NOT_FOUND', 'Không tìm thấy game.', 404);
  const rows = await all(
    `SELECT q.id, q.type, q.content, q.point,
    COALESCE(json_agg(json_build_object('id', qo.id, 'label', qo.label, 'position', qo.position) ORDER BY qo.position)
      FILTER (WHERE qo.id IS NOT NULL), '[]'::json) AS options
    FROM questions q JOIN question_banks qb ON qb.id=q.question_bank_id
    LEFT JOIN question_options qo ON qo.question_id=q.id
    WHERE qb.book_id=? AND q.type=? GROUP BY q.id ORDER BY random() LIMIT ?`,
    [game.book_id, game.question_type, game.question_count],
  );
  return rows.map(safeQuestion);
}

async function answer(sessionId, userId, questionId, selectedAnswer) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (
      await client.query(
        `SELECT gs.id, gs.completed_at, g.question_type, gsq.question_id,
      q.type, q.point, q.correct_answer, q.answer_explanation,
      COALESCE((SELECT json_agg(json_build_object('id', qo.id, 'is_correct', qo.is_correct)) FROM question_options qo WHERE qo.question_id=q.id), '[]'::json) AS options,
      gsq.selected_answer, gsq.is_correct FROM game_sessions gs JOIN games g ON g.id=gs.game_id
      JOIN game_session_questions gsq ON gsq.session_id=gs.id JOIN questions q ON q.id=gsq.question_id
      WHERE gs.id=$1 AND gs.user_id=$2 AND gsq.question_id=$3 FOR UPDATE`,
        [sessionId, userId, questionId],
      )
    ).rows[0];
    if (!row)
      throw gameError('SESSION_QUESTION_NOT_FOUND', 'Câu hỏi không thuộc phiên chơi này.', 404);
    if (row.completed_at) throw gameError('SESSION_COMPLETED', 'Phiên chơi đã hoàn thành.', 409);
    if (row.selected_answer !== null && row.is_correct)
      throw gameError('DUPLICATE_ANSWER', 'Câu hỏi này đã được trả lời đúng.', 409);
    if (row.type === 'MC') {
      if (
        typeof selectedAnswer !== 'string' ||
        !row.options.some((option) => option.id === selectedAnswer)
      )
        throw gameError('INVALID_ANSWER', 'Đáp án MC không hợp lệ.');
    } else if (
      typeof selectedAnswer !== 'boolean' &&
      selectedAnswer !== 'true' &&
      selectedAnswer !== 'false'
    )
      throw gameError('INVALID_ANSWER', 'Đáp án TF không hợp lệ.');
    let correct = false;
    if (row.type === 'MC')
      correct = Boolean(row.options.find((option) => option.id === selectedAnswer)?.is_correct);
    else
      correct =
        Boolean(row.correct_answer) === (selectedAnswer === true || selectedAnswer === 'true');
    const points = correct ? Number(row.point) : 0;
    await client.query(
      'UPDATE game_session_questions SET selected_answer=$1, is_correct=$2, points_awarded=$3, answered_at=CURRENT_TIMESTAMP WHERE session_id=$4 AND question_id=$5',
      [String(selectedAnswer), correct, points, sessionId, questionId],
    );
    // Wrong attempts remain retryable; only a correct answer is committed as final.
    if (!correct) {
      await client.query(
        'UPDATE game_session_questions SET selected_answer=NULL, is_correct=NULL, points_awarded=0, answered_at=NULL WHERE session_id=$1 AND question_id=$2',
        [sessionId, questionId],
      );
    }
    await client.query(
      'UPDATE game_sessions SET score=score+$1, correct_count=correct_count+$2 WHERE id=$3',
      [points, correct ? 1 : 0, sessionId],
    );
    await client.query('COMMIT');
    return {
      questionId,
      isCorrect: correct,
      pointsAwarded: points,
      explanation: row.answer_explanation || null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function complete(sessionId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const session = (
      await client.query(
        `SELECT gs.*, g.title AS game_title, g.reward_cups FROM game_sessions gs JOIN games g ON g.id=gs.game_id WHERE gs.id=$1 AND gs.user_id=$2 FOR UPDATE`,
        [sessionId, userId],
      )
    ).rows[0];
    if (!session) throw gameError('SESSION_NOT_FOUND', 'Không tìm thấy phiên chơi.', 404);
    if (session.completed_at) {
      await client.query('COMMIT');
      return resultFor(sessionId, userId);
    }
    const unanswered = await client.query(
      'SELECT COUNT(*)::int AS count FROM game_session_questions WHERE session_id=$1 AND question_id IS NOT NULL AND selected_answer IS NULL',
      [sessionId],
    );
    if (Number(unanswered.rows[0].count) > 0)
      throw gameError(
        'SESSION_INCOMPLETE',
        'Hãy trả lời tất cả câu hỏi trước khi hoàn thành.',
        400,
      );
    await client.query('UPDATE game_sessions SET completed_at=CURRENT_TIMESTAMP WHERE id=$1', [
      sessionId,
    ]);
    const reward = await client.query(
      `INSERT INTO user_game_rewards(id, user_id, game_id, cup_count, earned_on, week_start)
      VALUES($1, $2, $3, $4, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
        ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - (EXTRACT(ISODOW FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::int - 1)))
      ON CONFLICT (user_id, game_id, earned_on) DO NOTHING RETURNING id`,
      [crypto.randomUUID(), userId, session.game_id, Number(session.reward_cups || 1)],
    );
    await client.query('UPDATE game_sessions SET cup_earned=$1 WHERE id=$2', [
      reward.rowCount > 0,
      sessionId,
    ]);
    await client.query('COMMIT');
    const achievementEvents = await evaluateUser(userId);
    return { ...(await resultFor(sessionId, userId)), achievementEvents };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function resultFor(sessionId, userId) {
  const session = await get(
    `SELECT gs.*, g.title AS game_title, g.question_type, g.reward_cups,
    gs.cup_earned AS cup_earned
    FROM game_sessions gs JOIN games g ON g.id=gs.game_id WHERE gs.id=? AND gs.user_id=?`,
    [sessionId, userId],
  );
  if (!session) throw gameError('SESSION_NOT_FOUND', 'Không tìm thấy phiên chơi.', 404);
  const answers = await all(
    `SELECT gsq.question_id, gsq.position, gsq.is_correct, gsq.points_awarded, gsq.selected_answer, q.content, q.answer_explanation
    FROM game_session_questions gsq LEFT JOIN questions q ON q.id=gsq.question_id WHERE gsq.session_id=? ORDER BY gsq.position`,
    [sessionId],
  );
  return {
    id: session.id,
    game_id: session.game_id,
    game_title: session.game_title,
    question_type: session.question_type,
    reward_cups: Number(session.reward_cups || 1),
    cup_earned: Boolean(session.cup_earned),
    cup_awarded: Boolean(session.cup_earned),
    score: Number(session.score),
    total_points: Number(session.total_points),
    correct_count: Number(session.correct_count),
    answered_count: answers.filter((answer) => answer.selected_answer !== null).length,
    total_questions: Number(session.total_questions),
    started_at: session.started_at,
    completed_at: session.completed_at,
    answers,
  };
}

module.exports = {
  answer,
  complete,
  createGame,
  deleteGame,
  getGame,
  getSession,
  listGames,
  listQuestionBankBooks,
  previewQuestions,
  questionBankCounts,
  resultFor,
  startSession,
  updateGame,
};
