const ExcelJS = require('exceljs');

const DATA_START_ROW = 5;
const MAX_YEAR = new Date().getUTCFullYear() + 1;
const COLUMNS = {
  author: 3,
  title: 4,
  publisher: 5,
  publication_year: 7,
  price: 8,
  category: 9,
  cutter: 10,
  cover_url: 22,
};

function text(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return String(value.getUTCFullYear());
  return String(value).trim().replace(/\s+/g, ' ');
}

function parseYear(value) {
  const raw = text(value);
  if (!raw) return { value: null };
  if (!/^\d{4}$/.test(raw)) return { value: null, error: 'Năm xuất bản không hợp lệ' };
  const year = Number(raw);
  if (year < 1000 || year > MAX_YEAR) return { value: null, error: 'Năm xuất bản không hợp lệ' };
  return { value: year };
}

function parsePrice(value) {
  if (value === null || value === undefined || value === '') return { value: null };
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return { value: null, error: 'Đơn giá không hợp lệ' };
    return { value: Math.round(value * 100) / 100 };
  }

  let raw = text(value)
    .replace(/[₫đ]|vnd/gi, '')
    .replace(/\s/g, '');
  if (!raw) return { value: null };
  if (!/^-?[\d.,]+$/.test(raw)) return { value: null, error: 'Đơn giá không hợp lệ' };

  const lastDot = raw.lastIndexOf('.');
  const lastComma = raw.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    const decimalIndex = Math.max(lastDot, lastComma);
    const decimalDigits = raw.length - decimalIndex - 1;
    const decimal = decimalDigits > 0 && decimalDigits <= 2 ? raw[decimalIndex] : null;
    raw = raw.replace(/[.,]/g, '');
    if (decimal) raw = `${raw.slice(0, raw.length - decimalDigits)}.${raw.slice(-decimalDigits)}`;
  } else if (lastDot !== -1 || lastComma !== -1) {
    const separatorIndex = Math.max(lastDot, lastComma);
    const decimalDigits = raw.length - separatorIndex - 1;
    if (decimalDigits > 0 && decimalDigits <= 2) {
      raw = `${raw.slice(0, separatorIndex).replace(/[.,]/g, '')}.${raw.slice(separatorIndex + 1)}`;
    } else {
      raw = raw.replace(/[.,]/g, '');
    }
  }

  const price = Number(raw);
  if (!Number.isFinite(price) || price < 0 || price > 999999999999.99)
    return { value: null, error: 'Đơn giá không hợp lệ' };
  return { value: Math.round(price * 100) / 100 };
}

function parseCoverUrl(value) {
  const raw = text(value);
  if (!raw) return { value: null };
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      throw new Error('invalid protocol');
    return { value: raw };
  } catch {
    return { value: null, error: 'Liên kết ảnh bìa không hợp lệ' };
  }
}

function cellValue(sheet, rowIndex, columnIndex) {
  const value = sheet.getRow(rowIndex).getCell(columnIndex).value;
  if (value && typeof value === 'object') {
    if (value instanceof Date) return value;
    if ('result' in value) return value.result;
    if ('text' in value) return value.text;
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('hyperlink' in value) return value.text;
  }
  return value;
}

function hasBookData(sheet, rowIndex) {
  return Object.values(COLUMNS).some((columnIndex) =>
    text(cellValue(sheet, rowIndex, columnIndex)),
  );
}

function createError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function parseLibraryWorkbook(filePath, { maxRows = 50000, previewLimit = 30 } = {}) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(filePath);
  } catch {
    throw createError('INVALID_EXCEL_FILE', 'Không thể đọc file Excel .xlsx này.');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount === 0)
    throw createError('EMPTY_EXCEL_FILE', 'File Excel không có dữ liệu để nhập.');

  if (sheet.rowCount < DATA_START_ROW) {
    return {
      summary: {
        totalRows: 0,
        validBooks: 0,
        errorRows: 0,
        authorCount: 0,
        yearRange: null,
        categories: [],
      },
      errors: [],
      books: [],
    };
  }
  if (sheet.rowCount - DATA_START_ROW + 1 > maxRows)
    throw createError(
      'EXCEL_TOO_LARGE',
      `File có quá nhiều dòng. Giới hạn là ${maxRows.toLocaleString('vi-VN')} dòng dữ liệu.`,
    );

  const books = [];
  const errors = [];
  const authors = new Set();
  const categories = new Set();
  const years = [];
  let totalRows = 0;

  for (let rowIndex = DATA_START_ROW; rowIndex <= sheet.rowCount; rowIndex += 1) {
    if (!hasBookData(sheet, rowIndex)) continue;
    totalRows += 1;
    const row = rowIndex;
    const title = text(cellValue(sheet, rowIndex, COLUMNS.title));
    const author = text(cellValue(sheet, rowIndex, COLUMNS.author)) || null;
    const publisher = text(cellValue(sheet, rowIndex, COLUMNS.publisher)) || null;
    const category = text(cellValue(sheet, rowIndex, COLUMNS.category)) || null;
    const cutter = text(cellValue(sheet, rowIndex, COLUMNS.cutter)) || null;
    const coverUrl = text(cellValue(sheet, rowIndex, COLUMNS.cover_url)) || null;
    const yearResult = parseYear(cellValue(sheet, rowIndex, COLUMNS.publication_year));
    const priceResult = parsePrice(cellValue(sheet, rowIndex, COLUMNS.price));
    const coverResult = parseCoverUrl(coverUrl);
    const rowIssues = [];

    if (!title) rowIssues.push('Thiếu tên sách');
    if (yearResult.error) rowIssues.push(yearResult.error);
    if (priceResult.error) rowIssues.push(priceResult.error);
    if (coverResult.error) rowIssues.push(coverResult.error);
    if (rowIssues.length) errors.push({ row, messages: rowIssues });
    if (!title) continue;

    if (author) authors.add(author.toLocaleLowerCase('vi'));
    if (category) categories.add(category);
    if (yearResult.value) years.push(yearResult.value);
    books.push({
      row,
      title,
      author,
      publisher,
      publication_year: yearResult.value,
      price: priceResult.value,
      category,
      cutter,
      ...(coverResult.value ? { cover_url: coverResult.value } : {}),
      issues: rowIssues,
    });
  }

  const sortedCategories = Array.from(categories).sort((left, right) =>
    left.localeCompare(right, 'vi'),
  );
  return {
    summary: {
      totalRows,
      validBooks: books.length,
      errorRows: errors.length,
      authorCount: authors.size,
      yearRange: years.length ? { min: Math.min(...years), max: Math.max(...years) } : null,
      categories: sortedCategories,
    },
    errors,
    books: books.slice(0, previewLimit),
    allBooks: books,
  };
}

module.exports = {
  COLUMNS,
  DATA_START_ROW,
  parseCoverUrl,
  parseLibraryWorkbook,
  parsePrice,
  parseYear,
};
