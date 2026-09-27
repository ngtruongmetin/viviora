const ExcelJS = require('exceljs');

const DATA_START_ROW = 2;
const MAX_POINT = 100000;

function text(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('result' in value) return text(value.result);
    if ('text' in value) return text(value.text);
    if ('richText' in value)
      return value.richText
        .map((part) => part.text)
        .join('')
        .trim();
  }
  return String(value).trim().replace(/\s+/g, ' ');
}

function cellValue(sheet, rowIndex, columnIndex) {
  return sheet.getRow(rowIndex).getCell(columnIndex).value;
}

function parsePoint(value) {
  const raw = text(value);
  if (!raw) return 10;
  const point = Number(raw);
  if (!Number.isInteger(point) || point <= 0 || point > MAX_POINT) return null;
  return point;
}

function parseQuestionRow(sheet, rowNumber) {
  const type = text(cellValue(sheet, rowNumber, 1)).toUpperCase();
  const question = text(cellValue(sheet, rowNumber, 2));
  const options = [3, 4, 5, 6].map((column) => text(cellValue(sheet, rowNumber, column)));
  const explanation = text(cellValue(sheet, rowNumber, 7)) || null;
  const point = parsePoint(cellValue(sheet, rowNumber, 8));
  const errors = [];

  if (type !== 'MC' && type !== 'TF') errors.push('Type phải là MC hoặc TF.');
  if (!question) errors.push('Câu hỏi không được để trống.');
  if (point === null) errors.push('Point phải là số lớn hơn 0.');
  let normalized = { rowNumber, type, question, explanation, point: point === null ? 10 : point };
  if (type === 'MC') {
    if (options.some((option) => !option)) errors.push('MC phải có đủ 4 đáp án.');
    const correctIndexes = options
      .map((option, index) => (option.startsWith('*') ? index : -1))
      .filter((index) => index !== -1);
    if (correctIndexes.length !== 1) errors.push('MC phải có đúng 1 đáp án được đánh dấu *.');
    normalized = {
      ...normalized,
      options: options.map((option) => ({
        label: option.startsWith('*') ? option.slice(1).trim() : option,
        isCorrect: option.startsWith('*'),
      })),
    };
  } else if (type === 'TF') {
    const trueMarked = options[0] === '*';
    const falseMarked = options[1] === '*';
    if (trueMarked === falseMarked) errors.push('TF phải đánh dấu * ở cột C hoặc D.');
    if (options[2] || options[3])
      errors.push('TF chỉ được sử dụng cột C hoặc D để đánh dấu đáp án.');
    normalized = { ...normalized, correctAnswer: trueMarked };
  }
  return { ...normalized, valid: errors.length === 0, errors };
}

async function parseQuestionWorkbook(filePath, { maxRows = 50000, previewLimit = 100 } = {}) {
  const workbook = new ExcelJS.Workbook();
  try {
    if (Buffer.isBuffer(filePath)) await workbook.xlsx.load(filePath);
    else await workbook.xlsx.readFile(filePath);
  } catch {
    const error = new Error('Không thể đọc file Excel .xlsx này.');
    error.code = 'INVALID_EXCEL_FILE';
    throw error;
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    const error = new Error('File Excel không có dữ liệu để nhập.');
    error.code = 'EMPTY_EXCEL_FILE';
    throw error;
  }
  const rows = [];
  const errors = [];
  for (let rowNumber = DATA_START_ROW; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const values = [1, 2, 3, 4, 5, 6, 7, 8].map((column) =>
      text(cellValue(sheet, rowNumber, column)),
    );
    if (!values.some(Boolean)) continue;
    if (rows.length >= maxRows) {
      const error = new Error(
        `File có quá nhiều dòng. Giới hạn là ${maxRows.toLocaleString('vi-VN')} dòng dữ liệu.`,
      );
      error.code = 'EXCEL_TOO_LARGE';
      throw error;
    }
    const parsed = parseQuestionRow(sheet, rowNumber);
    rows.push(parsed);
    if (!parsed.valid) errors.push({ row: rowNumber, messages: parsed.errors });
  }
  const validRows = rows.filter((row) => row.valid);
  return {
    totalRows: rows.length,
    validRows: validRows.length,
    invalidRows: errors.length,
    statistics: {
      total: rows.length,
      mc: rows.filter((row) => row.type === 'MC').length,
      tf: rows.filter((row) => row.type === 'TF').length,
    },
    rows: rows.slice(0, previewLimit),
    allRows: rows,
    errors,
  };
}

module.exports = { DATA_START_ROW, parseQuestionRow, parseQuestionWorkbook, parsePoint };
