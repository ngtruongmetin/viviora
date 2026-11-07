const ExcelJS = require('exceljs');

const BASE_COLUMNS = [
  ['response_id', 'Response ID'],
  ['user_id', 'User ID'],
  ['username', 'Username'],
  ['submitted_at', 'Submitted at'],
  ['grade', 'Grade'],
  ['gender', 'Gender'],
];

function questionOrder(code) {
  const match = /^Q(\d+)$/u.exec(code || '');
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function formatAnswer(answer) {
  if (Array.isArray(answer)) return answer.join(' | ');
  if (answer === null || answer === undefined) return '';
  if (typeof answer === 'object') return JSON.stringify(answer);
  return answer;
}

function buildRows(answerRows) {
  const responses = new Map();
  const questions = new Map();
  for (const row of answerRows) {
    const snapshot = row.question_snapshot;
    if (!snapshot?.code) continue;
    if (!questions.has(snapshot.code)) questions.set(snapshot.code, snapshot);
    if (!responses.has(row.response_id)) {
      responses.set(row.response_id, {
        response_id: row.response_id,
        user_id: row.user_id,
        username: row.username,
        submitted_at: row.submitted_at,
        grade: row.grade_snapshot || '',
        gender: row.gender_snapshot || '',
        answers: new Map(),
      });
    }
    responses.get(row.response_id).answers.set(snapshot.code, row.answer);
  }
  return {
    responses: [...responses.values()],
    questions: [...questions.values()].sort(
      (a, b) => questionOrder(a.code) - questionOrder(b.code),
    ),
  };
}

async function buildWorkbook(answerRows) {
  const { responses, questions } = buildRows(answerRows);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Responses', { views: [{ state: 'frozen', ySplit: 1 }] });
  const columns = [
    ...BASE_COLUMNS.map(([key, header]) => ({
      key,
      header,
      width: Math.max(14, header.length + 2),
    })),
  ];
  for (const question of questions) {
    if (question.type === 'MATRIX') {
      question.rows.forEach((row, index) =>
        columns.push({
          key: `${question.code}_${index + 1}`,
          header: `${question.code}.${index + 1} ${row}`,
          width: 28,
        }),
      );
    } else
      columns.push({
        key: question.code,
        header: `${question.code} ${question.content}`,
        width: 28,
      });
  }
  sheet.columns = columns;
  for (const response of responses) {
    const row = Object.fromEntries(BASE_COLUMNS.map(([key]) => [key, response[key]]));
    for (const question of questions) {
      const answer = response.answers.get(question.code);
      if (question.type === 'MATRIX') {
        question.rows.forEach((label, index) => {
          row[`${question.code}_${index + 1}`] = answer?.[label] ?? '';
        });
      } else row[question.code] = formatAnswer(answer);
    }
    sheet.addRow(row);
  }
  sheet.autoFilter = { from: 'A1', to: { row: 1, column: columns.length } };
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: 'top', wrapText: true };
  sheet.eachRow((row, number) => {
    if (number > 1) row.alignment = { vertical: 'top', wrapText: true };
  });
  return workbook.xlsx.writeBuffer();
}

module.exports = { buildRows, buildWorkbook };
