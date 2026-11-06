const path = require('node:path');
const ExcelJS = require('exceljs');
const { pool } = require('../database/db');

const REQUIRED_HEADERS = ['Họ tên', 'Giới tính', 'Mã lớp', 'Username', 'Password'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEK_SPECS = [
  { start: '2026-09-21T00:00:00.000Z', quota: 72 },
  { start: '2026-09-28T00:00:00.000Z', quota: 72 },
  { start: '2026-10-05T00:00:00.000Z', quota: 72 },
  { start: '2026-10-12T00:00:00.000Z', quota: 71 },
  { start: '2026-10-19T00:00:00.000Z', quota: 71 },
];

function argumentValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function normalizedText(value) {
  if (value && typeof value === 'object' && 'text' in value) value = value.text;
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalizedGender(value) {
  const input = normalizedText(value).toLocaleLowerCase('vi-VN');
  if (input === 'nam') return 'Nam';
  if (input === 'nữ' || input === 'nu') return 'Nữ';
  return null;
}

function hash32(input) {
  let hash = 2166136261;
  for (const character of input) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableOrder(accounts, salt) {
  return [...accounts].sort((left, right) => {
    const difference = hash32(`${salt}:${left.username}`) - hash32(`${salt}:${right.username}`);
    return difference || left.username.localeCompare(right.username, 'en');
  });
}

function parseStudentRows(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('Workbook không có dữ liệu.');
  const headers = Object.keys(rows[0]);
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    throw new Error(`Thiếu cột bắt buộc: ${missingHeaders.join(', ')}.`);
  }

  const usernames = new Set();
  return rows.map((row, index) => {
    const sourceRow = index + 2;
    const name = normalizedText(row['Họ tên']);
    const gender = normalizedGender(row['Giới tính']);
    const className = normalizedText(row['Mã lớp']);
    const username = normalizedText(row.Username);
    const password = normalizedText(row.Password);

    if (!name || !gender || !className || !username || !password) {
      throw new Error(`Dòng ${sourceRow} thiếu hoặc có giá trị không hợp lệ.`);
    }
    if (!/^[6-9]A[0-9]+$/u.test(className)) {
      throw new Error(`Dòng ${sourceRow} có mã lớp không hợp lệ: ${className}.`);
    }
    if (!/^[A-Za-z0-9._-]{3,80}$/u.test(username)) {
      throw new Error(`Dòng ${sourceRow} có username không hợp lệ: ${username}.`);
    }
    if (usernames.has(username)) throw new Error(`Username bị trùng: ${username}.`);
    usernames.add(username);
    return { sourceRow, name, gender, className, username };
  });
}

async function readStudentWorkbook(inputPath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputPath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('Workbook không có sheet nào.');

  const headerRow = sheet.getRow(1);
  const headerByColumn = new Map();
  for (let column = 1; column <= headerRow.cellCount; column += 1) {
    const header = normalizedText(headerRow.getCell(column).value);
    if (header) headerByColumn.set(header, column);
  }
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerByColumn.has(header));
  if (missingHeaders.length) throw new Error(`Thiếu cột bắt buộc: ${missingHeaders.join(', ')}.`);

  const rows = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values = Object.fromEntries(
      REQUIRED_HEADERS.map((header) => [header, row.getCell(headerByColumn.get(header)).value]),
    );
    if (REQUIRED_HEADERS.every((header) => !normalizedText(values[header]))) continue;
    rows.push(values);
  }
  return parseStudentRows(rows);
}

function planCreatedAt(accounts) {
  const expected = WEEK_SPECS.reduce((total, week) => total + week.quota, 0);
  if (accounts.length !== expected) {
    throw new Error(`Workbook phải có đúng ${expected} học sinh, hiện có ${accounts.length}.`);
  }

  const shuffled = stableOrder(accounts, 'week');
  let offset = 0;
  const planned = [];
  for (const week of WEEK_SPECS) {
    const group = stableOrder(shuffled.slice(offset, offset + week.quota), 'time');
    const start = Date.parse(week.start);
    group.forEach((account, index) => {
      const timestamp = start + Math.floor(((index + 0.5) * WEEK_MS) / group.length);
      planned.push({
        ...account,
        createdAt: new Date(timestamp).toISOString(),
        weekStart: week.start,
      });
    });
    offset += week.quota;
  }
  return planned;
}

async function resolveAccounts(accounts) {
  const result = await pool.query(
    'SELECT username, role FROM users WHERE username = ANY($1::text[])',
    [accounts.map((account) => account.username)],
  );
  const usersByUsername = new Map(result.rows.map((user) => [user.username, user]));
  const matched = [];
  const missing = [];
  const nonStudents = [];
  for (const account of accounts) {
    const user = usersByUsername.get(account.username);
    if (!user) missing.push(account.username);
    else if (user.role !== 'STUDENT')
      nonStudents.push({ username: account.username, role: user.role });
    else matched.push(account);
  }
  return { matched, missing, nonStudents };
}

async function applyUpdates(accounts) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const account of accounts) {
      const result = await client.query(
        "UPDATE users SET gender=$1, class_name=$2, created_at=$3 WHERE username=$4 AND role='STUDENT'",
        [account.gender, account.className, account.createdAt, account.username],
      );
      if (result.rowCount !== 1)
        throw new Error(`Không thể cập nhật username: ${account.username}.`);
    }
    await client.query('COMMIT');
    return accounts.length;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function printReport({ total, matched, missing, nonStudents, updated, apply }) {
  console.log(`Tổng XLSX: ${total}`);
  console.log(`Tài khoản STUDENT khớp: ${matched.length}`);
  console.log(apply ? `Đã cập nhật: ${updated}` : 'Dry-run: chưa ghi thay đổi vào database.');
  console.log(`Không tìm thấy: ${missing.length}`);
  console.log(`Không phải STUDENT: ${nonStudents.length}`);
  if (missing.length) console.log(`Username không tìm thấy: ${missing.join(', ')}`);
  if (nonStudents.length) {
    console.log(
      `Username không phải STUDENT: ${nonStudents.map((user) => `${user.username} (${user.role})`).join(', ')}`,
    );
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const inputPath = path.resolve(argumentValue('--input', '/import/dshsv3.xlsx'));
  const students = await readStudentWorkbook(inputPath);
  const planned = planCreatedAt(students);
  const resolved = await resolveAccounts(planned);
  const updated = apply ? await applyUpdates(resolved.matched) : 0;
  printReport({ total: students.length, ...resolved, updated, apply });
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(`Lỗi đồng bộ: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = {
  REQUIRED_HEADERS,
  WEEK_SPECS,
  parseStudentRows,
  planCreatedAt,
  readStudentWorkbook,
};
