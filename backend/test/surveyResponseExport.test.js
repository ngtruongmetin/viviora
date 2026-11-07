const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { buildWorkbook } = require('../services/surveyResponseExportService');

const matrixRows = ['Dễ sử dụng', 'Sẽ giới thiệu'];
const common = {
  response_id: 'response-1',
  user_id: 'user-1',
  username: 'student.one',
  submitted_at: '2026-11-07T10:00:00.000Z',
  grade_snapshot: '8',
  gender_snapshot: 'Nữ',
};
const answer = (code, type, value, extra = {}) => ({
  ...common,
  answer: value,
  question_snapshot: { code, content: `Câu ${code}`, type, options: [], rows: [], ...extra },
});

test('account response export pivots answers into one Unicode Excel row', async () => {
  const buffer = await buildWorkbook([
    answer('Q1', 'SYSTEM', '8'),
    answer('Q8', 'MULTIPLE', ['Không có thời gian', 'Khác']),
    answer('Q18', 'MATRIX', { 'Dễ sử dụng': 5, 'Sẽ giới thiệu': 4 }, { rows: matrixRows }),
    answer('Q21', 'TEXT', ''),
  ]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet('Responses');
  const headers = sheet.getRow(1).values;
  const values = sheet.getRow(2).values;
  const at = (header) => values[headers.indexOf(header)];
  assert.equal(at('User ID'), 'user-1');
  assert.equal(at('Username'), 'student.one');
  assert.equal(at('Q8 Câu Q8'), 'Không có thời gian | Khác');
  assert.equal(at('Q18.1 Dễ sử dụng'), 5);
  assert.equal(at('Q18.2 Sẽ giới thiệu'), 4);
  assert.equal(at('Q21 Câu Q21'), '');
  assert.ok(sheet.autoFilter);
});
