const crypto = require('node:crypto');
const { all, get, pool } = require('../database/db');

function normalizeQuestion(row) {
  if (!row) return null;
  return {
    id: row.id,
    question_bank_id: row.question_bank_id,
    type: row.type,
    content: row.content,
    answer_explanation: row.answer_explanation,
    correct_answer: row.type === 'TF' ? row.correct_answer : undefined,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    options: row.options || [],
  };
}

async function questionRows(where, params) {
  return all(
    `SELECT q.*, COALESCE(
       json_agg(json_build_object('id', qo.id, 'label', qo.label, 'position', qo.position, 'is_correct', qo.is_correct)
         ORDER BY qo.position) FILTER (WHERE qo.id IS NOT NULL), '[]'::json
     ) AS options
     FROM questions q
     LEFT JOIN question_options qo ON qo.question_id = q.id
     WHERE ${where}
     GROUP BY q.id
     ORDER BY q.created_at DESC, q.id DESC`,
    params,
  );
}

async function getQuestion(questionId) {
  const rows = await questionRows('q.id=?', [questionId]);
  return normalizeQuestion(rows[0]);
}

async function getBank(bankId) {
  const bank = await get(
    `SELECT qb.id, qb.book_id, qb.created_by, qb.created_at, qb.updated_at,
            b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover_url
     FROM question_banks qb JOIN books b ON b.id=qb.book_id WHERE qb.id=?`,
    [bankId],
  );
  if (!bank) return null;
  const statistics = await get(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE type='MC')::int AS mc,
            COUNT(*) FILTER (WHERE type='TF')::int AS tf
     FROM questions WHERE question_bank_id=?`,
    [bankId],
  );
  return {
    id: bank.id,
    book: {
      id: bank.book_id,
      title: bank.book_title,
      author: bank.book_author,
      cover_url: bank.book_cover_url,
    },
    statistics: {
      total: Number(statistics.total),
      mc: Number(statistics.mc),
      tf: Number(statistics.tf),
    },
    created_at: bank.created_at,
    updated_at: bank.updated_at,
  };
}

async function listBanks() {
  const rows = await all(
    `SELECT qb.id, qb.book_id, qb.created_at, qb.updated_at,
            b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover_url,
            COUNT(q.id)::int AS total,
            COUNT(q.id) FILTER (WHERE q.type='MC')::int AS mc,
            COUNT(q.id) FILTER (WHERE q.type='TF')::int AS tf
     FROM question_banks qb JOIN books b ON b.id=qb.book_id
     LEFT JOIN questions q ON q.question_bank_id=qb.id
     GROUP BY qb.id, b.id ORDER BY qb.updated_at DESC, qb.id DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    book: {
      id: row.book_id,
      title: row.book_title,
      author: row.book_author,
      cover_url: row.book_cover_url,
    },
    statistics: { total: Number(row.total), mc: Number(row.mc), tf: Number(row.tf) },
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

async function getBankByBook(bookId) {
  const bank = await get('SELECT id FROM question_banks WHERE book_id=?', [bookId]);
  return bank ? getBank(bank.id) : null;
}

async function listQuestions(bankId, type) {
  const rows = await questionRows(
    type ? 'q.question_bank_id=? AND q.type=?' : 'q.question_bank_id=?',
    type ? [bankId, type] : [bankId],
  );
  return rows.map(normalizeQuestion);
}

function throwConflict(message) {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = 'QUESTION_BANK_EXISTS';
  throw error;
}

async function createBank(bookId, userId) {
  const id = crypto.randomUUID();
  try {
    await pool.query(
      'INSERT INTO question_banks(id, book_id, created_by) SELECT $1, id, $2 FROM books WHERE id=$3',
      [id, userId, bookId],
    );
  } catch (error) {
    if (error.code === '23505') throwConflict('Cuốn sách này đã có kho câu hỏi.');
    throw error;
  }
  const bank = await getBank(id);
  if (!bank) {
    const error = new Error('Không tìm thấy sách.');
    error.statusCode = 404;
    error.code = 'BOOK_NOT_FOUND';
    throw error;
  }
  return bank;
}

async function deleteBank(bankId) {
  const result = await pool.query('DELETE FROM question_banks WHERE id=$1 RETURNING id', [bankId]);
  return result.rowCount > 0;
}

async function updateBank(bankId, bookId) {
  try {
    const result = await pool.query(
      'UPDATE question_banks SET book_id=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id',
      [bookId, bankId],
    );
    if (!result.rowCount) return null;
    return getBank(bankId);
  } catch (error) {
    if (error.code === '23505') throwConflict('Cuốn sách này đã có kho câu hỏi.');
    throw error;
  }
}

async function saveQuestion({
  bankId,
  questionId,
  type,
  content,
  answerExplanation,
  options,
  correctAnswer,
  userId,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let id = questionId;
    if (id) {
      const result = await client.query(
        `UPDATE questions SET content=$1, answer_explanation=$2, correct_answer=$3, point=$4, updated_at=CURRENT_TIMESTAMP
         WHERE id=$5 AND question_bank_id=$6 AND type=$7 RETURNING id`,
        [
          content,
          answerExplanation || null,
          type === 'TF' ? correctAnswer : null,
          10,
          id,
          bankId,
          type,
        ],
      );
      if (!result.rowCount) {
        const error = new Error('Không tìm thấy câu hỏi hoặc không thể đổi loại câu hỏi.');
        error.statusCode = 404;
        error.code = 'QUESTION_NOT_FOUND';
        throw error;
      }
      if (type === 'MC')
        await client.query('DELETE FROM question_options WHERE question_id=$1', [id]);
    } else {
      id = crypto.randomUUID();
      const result = await client.query(
        `INSERT INTO questions(id, question_bank_id, type, content, answer_explanation, correct_answer, point, created_by)
         SELECT $1, id, $2, $3, $4, $5, $6, $7 FROM question_banks WHERE id=$8 RETURNING id`,
        [
          id,
          type,
          content,
          answerExplanation || null,
          type === 'TF' ? correctAnswer : null,
          10,
          userId,
          bankId,
        ],
      );
      if (!result.rowCount) {
        const error = new Error('Không tìm thấy kho câu hỏi.');
        error.statusCode = 404;
        error.code = 'QUESTION_BANK_NOT_FOUND';
        throw error;
      }
    }
    if (type === 'MC') {
      for (const [position, option] of options.entries()) {
        await client.query(
          'INSERT INTO question_options(id, question_id, label, position, is_correct) VALUES($1, $2, $3, $4, $5)',
          [crypto.randomUUID(), id, option.label, position, option.isCorrect],
        );
      }
    }
    await client.query('UPDATE question_banks SET updated_at=CURRENT_TIMESTAMP WHERE id=$1', [
      bankId,
    ]);
    await client.query('COMMIT');
    return getQuestion(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteQuestion(questionId) {
  const result = await pool.query('DELETE FROM questions WHERE id=$1 RETURNING id', [questionId]);
  return result.rowCount > 0;
}

async function importQuestions({ bankId, rows, userId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bank = await client.query('SELECT id FROM question_banks WHERE id=$1', [bankId]);
    if (!bank.rowCount) {
      const error = new Error('Không tìm thấy kho câu hỏi.');
      error.statusCode = 404;
      error.code = 'QUESTION_BANK_NOT_FOUND';
      throw error;
    }
    for (const row of rows) {
      const questionId = crypto.randomUUID();
      await client.query(
        `INSERT INTO questions(id, question_bank_id, type, content, answer_explanation, correct_answer, point, created_by)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          questionId,
          bankId,
          row.type,
          row.question,
          row.explanation || null,
          row.type === 'TF' ? row.correctAnswer : null,
          10,
          userId,
        ],
      );
      if (row.type === 'MC') {
        for (const [position, option] of row.options.entries()) {
          await client.query(
            'INSERT INTO question_options(id, question_id, label, position, is_correct) VALUES($1, $2, $3, $4, $5)',
            [crypto.randomUUID(), questionId, option.label, position, option.isCorrect],
          );
        }
      }
    }
    await client.query('UPDATE question_banks SET updated_at=CURRENT_TIMESTAMP WHERE id=$1', [
      bankId,
    ]);
    await client.query('COMMIT');
    return getBank(bankId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createBank,
  deleteBank,
  deleteQuestion,
  getBank,
  getBankByBook,
  getQuestion,
  importQuestions,
  listBanks,
  listQuestions,
  saveQuestion,
  updateBank,
};
