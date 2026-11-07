const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const {
  BASE_COLUMNS,
  Q18_ROWS,
  QUESTION_LABELS,
  buildWorkbook,
} = require('../services/surveyResponseExportService');

const common = {
  response_id: 'response-1',
  user_id: 'user-1',
  full_name: 'Nguyễn Minh An',
  submitted_at: '2026-11-07T10:00:00.000Z',
  grade_snapshot: '8',
  gender_snapshot: 'Nữ',
};
const answer = (code, type, value, extra = {}) => ({
  ...common,
  answer: value,
  question_snapshot: { code, content: 'snapshot', type, options: [], rows: [], ...extra },
});
async function readSheet(rows) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await buildWorkbook(rows));
  return workbook.getWorksheet('Responses');
}

test('response export uses a fixed Vietnamese Q1-Q23 schema and separate Q18 columns', async () => {
  const sheet = await readSheet([
    answer('Q8', 'MULTIPLE', ['Không có thời gian', 'Khác']),
    answer('Q18', 'MATRIX', { [Q18_ROWS[0]]: 5, [Q18_ROWS[12]]: 4 }, { rows: Q18_ROWS }),
  ]);
  const headers = sheet.getRow(1).values.slice(1);
  const values = sheet.getRow(2).values;
  const at = (header) => values[headers.indexOf(header) + 1];
  assert.equal(sheet.name, 'Responses');
  assert.deepEqual(
    headers.slice(0, 6),
    BASE_COLUMNS.map(([, header]) => header),
  );
  assert.equal(headers.length, 41);
  for (let number = 1; number <= 23; number += 1) {
    const code = `Q${number}`;
    if (code !== 'Q18') assert.ok(headers.includes(`${code}. ${QUESTION_LABELS[code]}`));
  }
  assert.equal(headers.filter((header) => header.startsWith('Q18.')).length, 13);
  assert.equal(at('User ID'), 'user-1');
  assert.equal(at('Họ và tên'), 'Nguyễn Minh An');
  assert.equal(at(`Q8. ${QUESTION_LABELS.Q8}`), 'Không có thời gian | Khác');
  assert.equal(at(`Q18.1. ${Q18_ROWS[0]}`), 5);
  assert.equal(at(`Q18.13. ${Q18_ROWS[12]}`), 4);
  assert.ok(sheet.autoFilter);
});

test('response export maps legacy unaccented Q18 snapshots to the fixed rows', async () => {
  const legacyRows = Q18_ROWS.map((row) =>
    row
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/gu, '')
      .replace(/đ/gu, 'd'),
  );
  const legacyAnswer = Object.fromEntries(legacyRows.map((row, index) => [row, index + 1]));
  const sheet = await readSheet([answer('Q18', 'MATRIX', legacyAnswer, { rows: legacyRows })]);
  const headers = sheet.getRow(1).values.slice(1);
  const values = sheet.getRow(2).values;
  Q18_ROWS.forEach((label, index) => {
    assert.equal(values[headers.indexOf(`Q18.${index + 1}. ${label}`) + 1], index + 1);
  });
});
