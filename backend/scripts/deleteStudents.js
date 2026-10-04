const path = require('node:path');
const ExcelJS = require('exceljs');
const { initialize, pool, get, run } = require('../database/db');

function argumentValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function text(value) {
  return String(value ?? '').normalize('NFC').trim();
}

async function readNicknames(inputPath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputPath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('File nickname khong co sheet nao.');
  const names = [];
  const seen = new Set();
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const username = text(sheet.getRow(rowNumber).getCell(1).value);
    const repeated = text(sheet.getRow(rowNumber).getCell(2).value);
    if (!username && !repeated) continue;
    if (!username || username !== repeated) {
      throw new Error(`Dong ${rowNumber} cua nickname khong hop le.`);
    }
    if (!/^[A-Za-z0-9._-]{3,80}$/u.test(username)) {
      throw new Error(`Nickname khong hop le: ${username}`);
    }
    if (seen.has(username)) throw new Error(`Nickname bi trung: ${username}`);
    seen.add(username);
    names.push(username);
  }
  return names;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const inputPath = path.resolve(argumentValue('--nicknames', '/import/nickname.xlsx'));
  const names = await readNicknames(inputPath);
  await initialize();
  const matched = [];
  for (const username of names) {
    const user = await get('SELECT id, username, role, name FROM users WHERE username=?', [username]);
    if (user) matched.push(user);
  }

  if (dryRun) {
    console.log(`Dry-run: tim thay ${matched.length}/${names.length} tai khoan.`);
    return;
  }

  let deleted = 0;
  let skipped = 0;
  for (const user of matched) {
    // Only remove student accounts created by the importer; never touch staff/admin accounts.
    if (user.role !== 'STUDENT') {
      console.warn(`Bo qua ${user.username}: role=${user.role}.`);
      skipped += 1;
      continue;
    }
    await run('DELETE FROM users WHERE id=? AND role=?', [user.id, 'STUDENT']);
    deleted += 1;
  }
  console.log(`Da xoa: ${deleted} tai khoan STUDENT.`);
  console.log(`Khong tim thay: ${names.length - matched.length}; bo qua: ${skipped}.`);
}

main()
  .catch((error) => {
    console.error(`Loi xoa tai khoan: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
