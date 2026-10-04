const path = require('node:path');
const ExcelJS = require('exceljs');
const { initialize, pool, get } = require('../database/db');
const { createUser } = require('../services/adminUserService');
const { registerSchema } = require('../routes/auth');

function argumentValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function normalizedText(value) {
  return String(value ?? '').normalize('NFC').replace(/\s+/gu, ' ').trim();
}

function normalizedGender(value) {
  const input = normalizedText(value).toLocaleLowerCase('vi-VN');
  if (['nam', 'male', 'm'].includes(input)) return 'Nam';
  if (['nữ', 'nu', 'female', 'f'].includes(input)) return 'Nữ';
  return null;
}

function isBlankStudentRow(row) {
  return [1, 2, 3, 4].every((column) => !normalizedText(row.getCell(column).value));
}

async function readStudents(inputPath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputPath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('dshs.xlsx khong co sheet nao.');

  const students = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (isBlankStudentRow(row)) continue;

    const name = normalizedText(row.getCell(1).value);
    const className = normalizedText(row.getCell(4).value);
    if (!name) throw new Error(`Dong ${rowNumber} cua dshs.xlsx thieu ho ten.`);
    if (!/^[6-9]A[0-9]+$/u.test(className)) {
      throw new Error(`Dong ${rowNumber} co lop khong hop le: ${className || '(trong)'}.`);
    }

    students.push({
      sourceRow: rowNumber,
      name,
      className,
      gender: normalizedGender(row.getCell(3).value),
    });
  }
  return students;
}

async function readNicknames(inputPath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputPath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('nickname.xlsx khong co sheet nao.');
  if (normalizedText(sheet.getRow(1).getCell(1).value) !== 'Nickname') {
    throw new Error('nickname.xlsx phai co tieu de Nickname tai o A1.');
  }

  const nicknames = [];
  const seen = new Set();
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const username = normalizedText(row.getCell(1).value);
    const repeatedNickname = normalizedText(row.getCell(2).value);
    if (!username && !repeatedNickname) continue;
    if (!username || username !== repeatedNickname) {
      throw new Error(`Dong ${rowNumber} cua nickname.xlsx khong co hai cot nickname giong nhau.`);
    }
    if (!/^[A-Za-z0-9._-]{3,80}$/u.test(username)) {
      throw new Error(`Dong ${rowNumber} co nickname khong phu hop username: ${username}`);
    }
    if (seen.has(username)) throw new Error(`Nickname bi trung: ${username}`);
    seen.add(username);
    nicknames.push(username);
  }
  return nicknames;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const studentsPath = path.resolve(argumentValue('--students', '/import/dshs.xlsx'));
  const nicknamesPath = path.resolve(argumentValue('--nicknames', '/import/nickname.xlsx'));
  const students = await readStudents(studentsPath);
  const nicknames = await readNicknames(nicknamesPath);
  if (students.length !== nicknames.length) {
    throw new Error(`So hoc sinh (${students.length}) khac so nickname (${nicknames.length}).`);
  }

  const accounts = students.map((student, index) => ({
    ...student,
    username: nicknames[index],
    password: nicknames[index],
  }));
  for (const account of accounts) {
    const validation = registerSchema.safeParse({
      ...account,
      email: null,
      confirmPassword: account.password,
      role: 'STUDENT',
      specialization: null,
    });
    if (!validation.success) {
      throw new Error(
        `Dong ${account.sourceRow} khong qua validation dang ky: ${validation.error.issues[0].message}`,
      );
    }
  }

  if (dryRun) {
    console.log(`Da kiem tra: ${accounts.length} tai khoan hop le.`);
    return;
  }

  await initialize();
  let created = 0;
  let skipped = 0;
  for (const account of accounts) {
    const existing = await get('SELECT id FROM users WHERE username=?', [account.username]);
    if (existing) {
      skipped += 1;
      continue;
    }
    await createUser({
      name: account.name,
      username: account.username,
      email: null,
      password: account.password,
      role: 'STUDENT',
      className: account.className,
      gender: account.gender,
      specialization: null,
      avatarUrl: null,
      bio: null,
      isActive: true,
    });
    created += 1;
  }
  console.log(`Da tao: ${created} tai khoan STUDENT.`);
  console.log(`Da bo qua: ${skipped} username da ton tai.`);
}

main()
  .catch((error) => {
    console.error(`Loi import: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
