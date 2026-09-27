const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { parseQuestionWorkbook } = require('../services/questionParser');

async function workbookBuffer(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Questions');
  sheet.addRow([
    'Type',
    'Question',
    'Option 1 / TRUE',
    'Option 2 / FALSE',
    'Option 3',
    'Option 4',
    'Explain',
    'Point',
  ]);
  rows.forEach((row) => sheet.addRow(row));
  return workbook.xlsx.writeBuffer();
}

test('question parser normalizes MC markers and blank points', async () => {
  const parsed = await parseQuestionWorkbook(
    await workbookBuffer([['MC', '1+1=?', '1', '*2', '3', '4', '1+1=2', '']]),
  );
  assert.equal(parsed.invalidRows, 0);
  assert.equal(parsed.allRows[0].point, 10);
  assert.deepEqual(parsed.allRows[0].options, [
    { label: '1', isCorrect: false },
    { label: '2', isCorrect: true },
    { label: '3', isCorrect: false },
    { label: '4', isCorrect: false },
  ]);
});

test('question parser derives TF answers and preserves Excel row errors', async () => {
  const parsed = await parseQuestionWorkbook(
    await workbookBuffer([
      ['TF', 'Statement true', '*', '', '', '', '', 5],
      ['TF', 'Statement invalid', '*', '*', '', '', '', 10],
      ['MC', '', '1', '2', '3', '4', '', -1],
    ]),
  );
  assert.equal(parsed.allRows[0].correctAnswer, true);
  assert.equal(parsed.errors[0].row, 3);
  assert.equal(parsed.errors[1].row, 4);
  assert.equal(parsed.invalidRows, 2);
});
