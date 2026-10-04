const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { generateGenZNickname } = require('vietnamese-name-generator');

function argumentValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const inputPath = path.resolve(argumentValue('--input', 'dshs.xlsx'));
const outputPath = path.resolve(argumentValue('--output', 'nickname.xlsx'));
const MAX_RETRIES = 10_000;

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalizeGender(value) {
  const gender = String(value ?? '').trim().toLocaleLowerCase('vi-VN');
  if (['nam', 'male', 'm'].includes(gender)) return 'male';
  if (['nữ', 'nu', 'female', 'f'].includes(gender)) return 'female';
  return 'unknown';
}

function formatDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeBirthDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed ? formatDate(parsed.y, parsed.m, parsed.d) : null;
  }

  const text = String(value ?? '').trim();
  let match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/u);
  if (match) return formatDate(Number(match[3]), Number(match[2]), Number(match[1]));

  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/u);
  if (match) return formatDate(Number(match[1]), Number(match[2]), Number(match[3]));

  return null;
}

function hashToSeed(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest().readUInt32BE(0);
}

function cleanNickname(value) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/gu, '')
    .replace(/[\x00-\x1F\x7F]/gu, '')
    .replace(/\s+/gu, '')
    .trim();
}

function createNickname(fullName, gender, identityHash, usedNicknames) {
  for (let retry = 0; retry < MAX_RETRIES; retry += 1) {
    const retrySeedText = retry === 0 ? identityHash : `${identityHash}:retry:${retry}`;
    const seed = hashToSeed(retrySeedText);
    const options = { name: fullName, style: 'social-handle', seed };
    if (gender === 'male' || gender === 'female') options.gender = gender;

    const nickname = cleanNickname(generateGenZNickname(options).nickname);
    if (nickname && !usedNicknames.has(nickname)) {
      return { nickname, retries: retry };
    }
  }
  throw new Error(`Khong the tao nickname duy nhat cho: ${fullName}`);
}

function validateOutput(expectedCount) {
  if (!fs.existsSync(outputPath)) throw new Error(`Khong tim thay file output sau khi ghi: ${outputPath}`);

  const workbook = XLSX.readFile(outputPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows[0]?.[0] !== 'Nickname' || rows[0]?.[1] !== 'Nickname') {
    throw new Error('Tieu de output khong dung o hang 1.');
  }
  if (rows.length - 1 !== expectedCount) {
    throw new Error(`So dong output sai: ${rows.length - 1}/${expectedCount}.`);
  }

  const seen = new Set();
  for (let index = 1; index < rows.length; index += 1) {
    const [left, right] = rows[index];
    if (!left || left !== right) throw new Error(`Dong ${index + 1} khong hop le.`);
    if (seen.has(left)) throw new Error(`Nickname trung tai dong ${index + 1}: ${left}`);
    seen.add(left);
  }
}

function main() {
  if (!fs.existsSync(inputPath)) throw new Error(`Khong tim thay file input: ${inputPath}`);

  const workbook = XLSX.readFile(inputPath, { cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', raw: true });
  const outputRows = [['Nickname', 'Nickname']];
  const usedNicknames = new Set();
  let readCount = 0;
  let skippedCount = 0;
  let collisionCount = 0;

  for (let index = 1; index < rows.length; index += 1) {
    const rowNumber = index + 1;
    const [nameValue, birthValue, genderValue, classValue] = rows[index];
    if ([nameValue, birthValue, genderValue, classValue].every((value) => String(value ?? '').trim() === '')) {
      skippedCount += 1;
      continue;
    }

    const fullName = normalizeName(nameValue);
    if (!fullName) {
      console.warn(`Canh bao dong ${rowNumber}: thieu ho ten, da bo qua.`);
      skippedCount += 1;
      continue;
    }
    readCount += 1;

    const gender = normalizeGender(genderValue);
    if (gender === 'unknown') {
      console.warn(`Canh bao dong ${rowNumber}: gioi tinh khong hop le, dung unknown.`);
    }

    const birthDate = normalizeBirthDate(birthValue);
    if (!birthDate) {
      console.warn(`Canh bao dong ${rowNumber}: ngay sinh khong hop le, dung fallback seed.`);
    }

    const seedName = fullName.toLocaleLowerCase('vi-VN');
    const identity = `${seedName}|${gender}|${birthDate ?? 'invalid-birth-date'}`;
    const identityHash = crypto.createHash('sha256').update(identity, 'utf8').digest('hex');
    const { nickname, retries } = createNickname(fullName, gender, identityHash, usedNicknames);
    usedNicknames.add(nickname);
    outputRows.push([nickname, nickname]);
    collisionCount += retries;
  }

  const outputWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outputWorkbook, XLSX.utils.aoa_to_sheet(outputRows), 'Nickname');
  XLSX.writeFile(outputWorkbook, outputPath);
  validateOutput(outputRows.length - 1);

  console.log(`Da doc: ${readCount} hoc sinh`);
  console.log(`Da tao: ${outputRows.length - 1} nickname`);
  console.log(`Bo qua: ${skippedCount} dong`);
  console.log(`Nickname trung da xu ly: ${collisionCount}`);
  console.log(`File dau ra: ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(`Loi: ${error.message}`);
  process.exitCode = 1;
}
