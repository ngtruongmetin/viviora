const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { parseLibraryWorkbook } = require('../services/libraryParser');

async function writeWorkbook(rows) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'viviora-library-test-'));
  const filePath = path.join(directory, 'library.xlsx');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Kho sach');
  rows.forEach((row) => sheet.addRow(row));
  sheet.mergeCells('H3:H4');
  sheet.mergeCells('I3:I4');
  sheet.mergeCells('J3:J4');
  await workbook.xlsx.writeFile(filePath);
  return { directory, filePath };
}

test('library parser maps C,D,E,G,H,I,J from row 5 and skips blank trailing rows', async () => {
  const rows = [
    [],
    [],
    [null, null, 'Tác giả', 'Tên sách', null, null, null, 'Đơn giá', 'Môn loại', 'Cutter'],
    [null, null, null, null, 'Nhà xuất bản', null, 'Năm xuất bản'],
    [null, 1, 'Nguyễn Nhật Ánh', 'Mắt biếc', 'NXB Trẻ', null, 2020, '50.000 đ', 'Văn học', 'A123'],
    [null, 2, 'Tác giả hai', 'Sách hai', 'NXB Giáo dục', null, '2019', 42000, 'Khoa học', 'B234'],
    [],
  ];
  const { directory, filePath } = await writeWorkbook(rows);
  try {
    const result = await parseLibraryWorkbook(filePath);
    assert.equal(result.summary.totalRows, 2);
    assert.equal(result.summary.validBooks, 2);
    assert.equal(result.summary.errorRows, 0);
    assert.equal(result.summary.authorCount, 2);
    assert.deepEqual(result.summary.yearRange, { min: 2019, max: 2020 });
    assert.deepEqual(result.summary.categories, ['Khoa học', 'Văn học']);
    assert.deepEqual(result.allBooks[0], {
      row: 5,
      title: 'Mắt biếc',
      author: 'Nguyễn Nhật Ánh',
      publisher: 'NXB Trẻ',
      publication_year: 2020,
      price: 50000,
      category: 'Văn học',
      cutter: 'A123',
      issues: [],
    });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('library parser reports row errors without aborting valid titles', async () => {
  const rows = [
    [],
    [],
    [],
    [],
    [null, 1, 'Tác giả', '', 'NXB', null, 2021, 50000, 'Văn học', 'A'],
    [null, 2, 'Tác giả hai', 'Sách vẫn hợp lệ', 'NXB', null, 'hai nghìn', 'không rõ', 'Khoa học', 'B'],
  ];
  const { directory, filePath } = await writeWorkbook(rows);
  try {
    const result = await parseLibraryWorkbook(filePath);
    assert.equal(result.summary.totalRows, 2);
    assert.equal(result.summary.validBooks, 1);
    assert.equal(result.summary.errorRows, 2);
    assert.deepEqual(result.errors[0], { row: 5, messages: ['Thiếu tên sách'] });
    assert.deepEqual(result.errors[1], {
      row: 6,
      messages: ['Năm xuất bản không hợp lệ', 'Đơn giá không hợp lệ'],
    });
    assert.equal(result.allBooks[0].publication_year, null);
    assert.equal(result.allBooks[0].price, null);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('library parser reads an external cover URL from column V without downloading it', async () => {
  const rows = [[], [], [], [], [null, 1, 'Tac gia', 'Sach co bia', 'NXB', null, 2021, 50000, 'Van hoc', 'A', null, null, null, null, null, null, null, null, null, null, null, 'https://example.com/book-cover.jpg']];
  const { directory, filePath } = await writeWorkbook(rows);
  try {
    const result = await parseLibraryWorkbook(filePath);
    assert.equal(result.allBooks[0].cover_url, 'https://example.com/book-cover.jpg');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
