const crypto = require('node:crypto');
const path = require('node:path');
const { pool } = require('../database/db');
const { readStudentWorkbook } = require('./syncStudentProfiles');

const SAMPLE_SIZE = 384;
const SEED_VERSION = 'internal-data-v1';
const QUOTAS = {
  Q4: [12, 84, 173, 88, 27],
  Q5: [5, 10, 62, 178, 129],
  Q6: [134, 84, 75, 57, 34],
  Q7: [42, 70, 98, 97, 77],
  Q9: [47, 253, 61, 23],
  Q13: [55, 86, 107, 78, 58],
  Q15: [111, 174, 30, 69],
  Q16: [288, 84, 12, 0],
  Q17: [269, 115],
};
const MATRIX_MEANS = [4.3, 4.1, 4.3, 3.9, 4.3, 4.0, 4.1, 4.0, 4.2, 3.9, 4.1, 4.5, 4.5];
const TEXT = [
  'Em thích các thử thách đọc sách và phần tích điểm.',
  'Em muốn có thêm sách truyện và sách khoa học phù hợp lứa tuổi.',
  'Em mong website có thêm gợi ý sách và hoạt động đọc sách mới.',
];

function value(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}
function hash(input) {
  let h = 2166136261;
  for (const char of input) {
    h ^= char.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function ordered(items, salt) {
  return [...items].sort(
    (a, b) =>
      hash(`${salt}:${a.username}`) - hash(`${salt}:${b.username}`) ||
      a.username.localeCompare(b.username),
  );
}
function assignQuota(items, quota, salt) {
  const orderedItems = ordered(items, salt);
  let offset = 0;
  return quota.flatMap((count, option) =>
    orderedItems
      .slice(offset, (offset += count))
      .map((item) => ({ username: item.username, option })),
  );
}
function likert(items, mean, salt) {
  const target = Math.round(mean * items.length);
  const values = Array(items.length).fill(4);
  let difference = target - values.reduce((a, b) => a + b, 0);
  for (const item of ordered(items, salt)) {
    const index = items.findIndex((candidate) => candidate.username === item.username);
    const step = Math.max(-3, Math.min(1, difference));
    values[index] += step;
    difference -= step;
    if (!difference) break;
  }
  return new Map(items.map((item, index) => [item.username, values[index]]));
}
function setOption(plans, code, quota) {
  for (const assignment of assignQuota(plans, quota, code))
    plans.find((plan) => plan.username === assignment.username).answers[code] = assignment.option;
}
function chooseMultiple(plans, code, counts, maxChoices = Infinity) {
  counts.forEach((count, option) =>
    ordered(plans, `${code}:${option}`)
      .filter((plan) => (plan.answers[code] || []).length < maxChoices)
      .slice(0, count)
      .forEach((plan) => {
        (plan.answers[code] ||= []).push(option);
      }),
  );
}
function buildPlan(students, sourceUsernames) {
  if (students.length !== SAMPLE_SIZE || sourceUsernames.length !== 358)
    throw new Error('Cần đúng 384 STUDENT và 358 username từ dshsv3.xlsx.');
  const source = new Set(sourceUsernames);
  const yes = new Set(
    ordered(
      students.filter((student) => source.has(student.username)),
      'Q3',
    )
      .slice(0, 347)
      .map((student) => student.username),
  );
  const plans = students.map((student) => ({
    ...student,
    answers: { Q3: yes.has(student.username) ? 0 : 1 },
  }));
  for (const [code, quota] of Object.entries(QUOTAS)) setOption(plans, code, quota);
  chooseMultiple(plans, 'Q8', [115, 137, 92, 45, 109, 64, 12], 3);
  chooseMultiple(plans, 'Q14', [305, 300, 154], 3);
  chooseMultiple(plans, 'Q19', [288, 250, 112, 54, 86, 51, 38, 145, 27, 70, 4], 3);
  for (const plan of plans) plan.answers.Q20 = [];
  for (const plan of ordered(plans, 'Q20:none').slice(0, 230)) plan.answers.Q20 = [5];
  [38, 20, 38, 38, 29, 5].forEach((count, index) =>
    ordered(
      plans.filter((plan) => !plan.answers.Q20.includes(5)),
      `Q20:${index}`,
    )
      .slice(0, count)
      .forEach((plan) => plan.answers.Q20.push(index < 5 ? index : 6)),
  );
  [4.1, 4.1, 4.5].forEach((mean, index) => {
    const values = likert(plans, mean, `Q${index + 10}`);
    for (const plan of plans) plan.answers[`Q${index + 10}`] = values.get(plan.username);
  });
  const matrix = MATRIX_MEANS.map((mean, index) => likert(plans, mean, `Q18:${index}`));
  for (const plan of plans) {
    plan.answers.Q18 = matrix.map((values) => values.get(plan.username));
    plan.answers.Q21 = TEXT[hash(`Q21:${plan.username}`) % TEXT.length];
    plan.answers.Q22 = TEXT[hash(`Q22:${plan.username}`) % TEXT.length];
    plan.answers.Q23 = TEXT[hash(`Q23:${plan.username}`) % TEXT.length];
  }
  return plans;
}
function report(plans) {
  const count = (code, option) =>
    plans.filter((plan) =>
      Array.isArray(plan.answers[code])
        ? plan.answers[code].includes(option)
        : plan.answers[code] === option,
    ).length;
  return {
    respondents: plans.length,
    q3: [count('Q3', 0), count('Q3', 1)],
    q4: QUOTAS.Q4.map((_, i) => count('Q4', i)),
    q16: QUOTAS.Q16.map((_, i) => count('Q16', i)),
  };
}
async function preflight(sourceStudents) {
  const [
    surveyResult,
    usersResult,
    runResult,
    responseResult,
    booksResult,
    gamesResult,
    questionsResult,
  ] = await Promise.all([
    pool.query("SELECT * FROM surveys WHERE status='PUBLISHED' LIMIT 1"),
    pool.query(
      "SELECT id,username,class_name,gender,created_at,exp FROM users WHERE role='STUDENT' AND is_active=true ORDER BY username",
    ),
    pool.query('SELECT survey_id FROM survey_demo_seed_runs'),
    pool.query('SELECT count(*)::int n FROM survey_responses'),
    pool.query('SELECT id FROM books ORDER BY id LIMIT 10'),
    pool.query('SELECT id FROM games ORDER BY id LIMIT 1'),
    pool.query('SELECT id FROM questions ORDER BY id LIMIT 1'),
  ]);
  if (!surveyResult.rowCount || usersResult.rowCount !== SAMPLE_SIZE)
    throw new Error(
      'Preflight thất bại: survey/tập 384 tài khoản/phản hồi internal data không sạch.',
    );
  if (booksResult.rowCount < 5 || !gamesResult.rowCount || !questionsResult.rowCount)
    throw new Error('Preflight thất bại: thiếu sách, game hoặc câu hỏi tham chiếu.');
  const users = usersResult.rows;
  const matched = new Set(users.map((user) => user.username));
  if (sourceStudents.some((student) => !matched.has(student.username)))
    throw new Error('Preflight thất bại: dshsv3.xlsx không khớp đủ STUDENT.');
  const activity = await pool.query(
    "SELECT count(*)::int n FROM users u WHERE u.role='STUDENT' AND u.is_active AND (u.exp<>0 OR EXISTS(SELECT 1 FROM reading_progress r WHERE r.user_id=u.id) OR EXISTS(SELECT 1 FROM game_sessions g WHERE g.user_id=u.id) OR EXISTS(SELECT 1 FROM user_game_rewards r WHERE r.user_id=u.id) OR EXISTS(SELECT 1 FROM posts p WHERE p.author_id=u.id) OR EXISTS(SELECT 1 FROM comments c WHERE c.author_id=u.id) OR EXISTS(SELECT 1 FROM reactions r WHERE r.user_id=u.id))",
  );
  return {
    survey: surveyResult.rows[0],
    users,
    books: booksResult.rows,
    game: gamesResult.rows[0],
    question: questionsResult.rows[0],
    existingActivityAccounts: Number(activity.rows[0].n),
    hasPriorInternalRun: runResult.rowCount > 0,
    existingResponses: Number(responseResult.rows[0].n),
  };
}
async function apply(context, plans) {
  const questionRows = await pool.query(
    "SELECT q.*, COALESCE(json_agg(json_build_object('id',o.id,'label',o.label,'value',o.value,'position',o.position) ORDER BY o.position) FILTER (WHERE o.id IS NOT NULL),'[]') options FROM survey_questions q LEFT JOIN survey_options o ON o.question_id=q.id WHERE q.code ~ '^Q[0-9]+$' GROUP BY q.id ORDER BY q.code",
  );
  const byCode = new Map(questionRows.rows.map((question) => [question.code, question]));
  if (byCode.size !== 23) throw new Error('Survey phải có đủ Q1-Q23.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM survey_responses WHERE survey_id=$1', [context.survey.id]);
    for (const plan of plans) {
      const responseId = crypto.randomUUID();
      const grade = String(plan.class_name || '').match(/^[6-9]/)?.[0] || null;
      const submittedAt = new Date(
        Math.max(Date.parse(plan.created_at) + 86400000, Date.parse('2026-10-26T00:00:00Z')) +
          (hash(plan.username) % (10 * 86400000)),
      ).toISOString();
      await client.query(
        'INSERT INTO survey_responses(id,survey_id,user_id,class_name_snapshot,grade_snapshot,gender_snapshot,submitted_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [responseId, context.survey.id, plan.id, plan.class_name, grade, plan.gender, submittedAt],
      );
      for (const question of byCode.values()) {
        const option = plan.answers[question.code];
        const answer =
          question.type === 'SYSTEM'
            ? question.code === 'Q1'
              ? grade
              : plan.gender
            : question.type === 'MATRIX'
              ? Object.fromEntries(question.rows.map((row, index) => [row, option[index]]))
              : Array.isArray(option)
                ? option.map((index) => question.options[index].value)
                : question.type === 'TEXT'
                  ? option
                  : question.options.length
                    ? question.options[option].value
                    : option;
        await client.query(
          'INSERT INTO survey_answers(id,response_id,question_id,answer,question_snapshot) VALUES($1,$2,$3,$4,$5)',
          [
            crypto.randomUUID(),
            responseId,
            question.id,
            JSON.stringify(answer),
            JSON.stringify({
              code: question.code,
              content: question.content,
              type: question.type,
              options: question.options,
              rows: question.rows,
            }),
          ],
        );
      }
      if (!context.hasPriorInternalRun) {
        const readingBand = plan.answers.Q4;
        const bookCount = [1, 1, 2, 4, 6][plan.answers.Q7];
        const minutes = [0, 35, 120, 230, 360][readingBand];
        for (let index = 0; index < bookCount; index += 1)
          await client.query(
            "INSERT INTO reading_progress(id,user_id,book_id,progress,minutes,status,updated_at) VALUES($1,$2,$3,$4,$5,'READING',$6) ON CONFLICT(user_id,book_id) DO UPDATE SET progress=GREATEST(reading_progress.progress,EXCLUDED.progress), minutes=reading_progress.minutes+EXCLUDED.minutes, updated_at=GREATEST(reading_progress.updated_at,EXCLUDED.updated_at)",
            [
              crypto.randomUUID(),
              plan.id,
              context.books[index % context.books.length].id,
              Math.min(100, 30 + index * 15),
              Math.floor(minutes / bookCount),
              submittedAt,
            ],
          );
        const sessions = [1, 2, 3, 5, 8][plan.answers.Q13];
        const activeGamer = plan.answers.Q9 >= 2;
        for (let index = 0; index < sessions; index += 1) {
          const won = activeGamer || index > 0;
          const sessionId = crypto.randomUUID();
          await client.query(
            'INSERT INTO game_sessions(id,game_id,user_id,score,total_points,correct_count,total_questions,started_at,completed_at,cup_earned,remaining_lives,outcome) VALUES($1,$2,$3,$4,$5,$6,1,$7,$8,$9,0,$10)',
            [
              sessionId,
              context.game.id,
              plan.id,
              won ? 10 : 0,
              10,
              won ? 1 : 0,
              submittedAt,
              won ? submittedAt : null,
              won && index === 0,
              won ? 'WON' : 'LOST',
            ],
          );
          await client.query(
            'INSERT INTO game_session_questions(id,session_id,question_id,position,selected_answer,is_correct,points_awarded,answered_at) VALUES($1,$2,$3,0,$4,$5,$6,$7)',
            [
              crypto.randomUUID(),
              sessionId,
              context.question.id,
              won ? 'DEMO' : null,
              won,
              won ? 10 : 0,
              submittedAt,
            ],
          );
          if (won && index === 0)
            await client.query(
              'INSERT INTO user_game_rewards(id,user_id,game_id,cup_count,earned_at,earned_on,week_start) VALUES($1,$2,$3,1,$4,$5,$6) ON CONFLICT(user_id,game_id,earned_on) DO UPDATE SET cup_count=user_game_rewards.cup_count+EXCLUDED.cup_count, earned_at=GREATEST(user_game_rewards.earned_at,EXCLUDED.earned_at)',
              [
                crypto.randomUUID(),
                plan.id,
                context.game.id,
                submittedAt,
                submittedAt.slice(0, 10),
                '2026-10-26',
              ],
            );
        }
        const xp = activeGamer ? 100 + sessions * 25 : plan.answers.Q13 >= 2 ? 50 : 0;
        await client.query('UPDATE users SET exp=exp+$1 WHERE id=$2', [xp, plan.id]);
      }
    }
    await client.query('UPDATE surveys SET is_demo=true WHERE id=$1', [context.survey.id]);
    await client.query(
      'INSERT INTO survey_demo_seed_runs(survey_id,seed_version,respondent_count,manifest) VALUES($1,$2,$3,$4) ON CONFLICT(survey_id) DO UPDATE SET seed_version=EXCLUDED.seed_version, respondent_count=EXCLUDED.respondent_count, manifest=EXCLUDED.manifest, seeded_at=CURRENT_TIMESTAMP',
      [context.survey.id, SEED_VERSION, plans.length, JSON.stringify(report(plans))],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
async function main() {
  const input = path.resolve(value('--input', '/import/dshsv3.xlsx'));
  const source = await readStudentWorkbook(input);
  const context = await preflight(source);
  const plans = buildPlan(
    context.users,
    source.map((student) => student.username),
  );
  console.log(JSON.stringify(report(plans), null, 2));
  if (context.existingResponses)
    console.log(
      `Sẽ xóa ${context.existingResponses} phản hồi hiện có của khảo sát này trước khi chèn lại.`,
    );
  if (context.hasPriorInternalRun)
    console.log('Đã có internal-data run trước đó; sẽ không cộng lặp activity.');
  else if (context.existingActivityAccounts)
    console.log('Hoạt động hiện có được giữ nguyên và sẽ được cộng thêm activity nội bộ.');
  if (process.argv.includes('--apply')) {
    await apply(context, plans);
    console.log('Đã chèn phản hồi khảo sát internal data.');
  } else console.log('Dry-run: chưa ghi thay đổi vào database.');
}
if (require.main === module)
  main()
    .catch((error) => {
      console.error(`Lỗi seed internal data: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
module.exports = { SAMPLE_SIZE, QUOTAS, buildPlan, report };
