const ExcelJS = require('exceljs');

const BASE_COLUMNS = [
  ['response_id', 'Response ID'],
  ['user_id', 'User ID'],
  ['username', 'Username'],
  ['submitted_at', 'Submitted at'],
  ['grade', 'Grade'],
  ['gender', 'Gender'],
];
const QUESTION_LABELS = {
  Q1: 'Em đang học khối lớp mấy?',
  Q2: 'Giới tính của em?',
  Q3: 'Em có tham gia khảo sát về thói quen đọc sách lần trước (trước khi dùng Viviora) không?',
  Q4: 'Hiện nay, em đọc sách ngoài sách giáo khoa khoảng bao nhiêu thời gian mỗi tuần?',
  Q5: 'So với trước khi dùng Viviora, thời gian đọc sách của em thay đổi thế nào?',
  Q6: 'Em mượn sách tại thư viện trường với tần suất nào?',
  Q7: 'Từ khi dùng Viviora, em đã đọc hoặc mượn khoảng bao nhiêu cuốn sách?',
  Q8: 'Điều gì khiến em ít đọc sách? (Chọn tối đa 3 ý)',
  Q9: 'Em chơi game với tần suất nào?',
  Q10: 'Mức độ hứng thú của em với việc đọc sách hiện nay?',
  Q11: 'Mức độ hài lòng của em với thư viện trường hiện nay?',
  Q12: 'Nhìn chung, em hài lòng với Viviora ở mức nào?',
  Q13: 'Em sử dụng Viviora với tần suất nào?',
  Q14: 'Em đã sử dụng những phân hệ nào? (Chọn nhiều)',
  Q15: 'Phân hệ em thích nhất?',
  Q16: 'Khi làm thử thách trong phân hệ Trò chơi, em thường làm thế nào?',
  Q17: 'Em có từng đọc một cuốn sách mà trước đây em sẽ không tự chọn không?',
  Q18: 'Em đồng ý đến mức nào với từng nhận định sau?',
  Q19: 'Điều gì khiến em muốn đọc sách và dùng Viviora nhất? (Chọn tối đa 3 ý)',
  Q20: 'Em gặp khó khăn gì khi dùng Viviora? (Chọn nhiều)',
  Q21: 'Điều em thích nhất ở Viviora là gì?',
  Q22: 'Em muốn Viviora cải thiện hoặc bổ sung điều gì?',
  Q23: 'Em muốn thư viện có thêm sách hoặc chủ đề nào?',
};
const Q18_ROWS = [
  'Làm thử thách và tích điểm giúp em cảm thấy mình tiến bộ trong việc đọc.',
  'Các thử thách trong Trò chơi có độ khó vừa sức với em.',
  'Em được tự chọn cuốn sách mình thích đọc.',
  'Em đọc sách vì em muốn đọc, không chỉ vì bị yêu cầu.',
  'Bảng tin giúp em biết thêm sách hay từ bạn bè và thầy cô.',
  'Chia sẻ và trò chuyện về sách giúp em gần gũi hơn với bạn bè, thầy cô.',
  'Phân hệ Thư viện giúp em dễ tìm được sách phù hợp hơn trước.',
  'Bảng xếp hạng chỉ hiện biệt danh giúp em thi đua vui vẻ, không bị áp lực.',
  'Nhờ Viviora, em đọc sách nhiều hơn trước.',
  'Em vẫn muốn đọc sách kể cả khi không có điểm hay quà.',
  'Em hiểu và nhớ nội dung sách tốt hơn khi làm thử thách.',
  'Em sẽ giới thiệu Viviora cho bạn bè.',
  'Viviora dễ sử dụng.',
];

function formatAnswer(answer) {
  if (Array.isArray(answer)) return answer.join(' | ');
  if (answer === null || answer === undefined) return '';
  if (typeof answer === 'object') return JSON.stringify(answer);
  return answer;
}
function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/đ/gu, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/gu, '');
}
function matrixValue(answer, snapshotRows, label, index) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return '';
  if (Object.hasOwn(answer, label)) return answer[label];
  const normalized = normalizeLabel(label);
  const matchingKey = Object.keys(answer).find((key) => normalizeLabel(key) === normalized);
  if (matchingKey) return answer[matchingKey];
  const legacyLabel = snapshotRows?.[index];
  if (legacyLabel && Object.hasOwn(answer, legacyLabel)) return answer[legacyLabel];
  const legacyKey = Object.keys(answer).find(
    (key) => legacyLabel && normalizeLabel(key) === normalizeLabel(legacyLabel),
  );
  return legacyKey ? answer[legacyKey] : (Object.values(answer)[index] ?? '');
}
function buildRows(answerRows) {
  const responses = new Map();
  const snapshots = new Map();
  for (const row of answerRows) {
    const snapshot = row.question_snapshot;
    if (!snapshot?.code || !QUESTION_LABELS[snapshot.code]) continue;
    snapshots.set(snapshot.code, snapshot);
    if (!responses.has(row.response_id))
      responses.set(row.response_id, {
        response_id: row.response_id,
        user_id: row.user_id,
        username: row.username,
        submitted_at: row.submitted_at,
        grade: row.grade_snapshot || '',
        gender: row.gender_snapshot || '',
        answers: new Map(),
      });
    responses.get(row.response_id).answers.set(snapshot.code, row.answer);
  }
  return { responses: [...responses.values()], snapshots };
}
async function buildWorkbook(answerRows) {
  const { responses, snapshots } = buildRows(answerRows);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Responses', { views: [{ state: 'frozen', ySplit: 1 }] });
  const columns = BASE_COLUMNS.map(([key, header]) => ({
    key,
    header,
    width: Math.max(14, header.length + 2),
  }));
  for (let number = 1; number <= 23; number += 1) {
    const code = `Q${number}`;
    if (code === 'Q18')
      Q18_ROWS.forEach((label, index) =>
        columns.push({
          key: `${code}_${index + 1}`,
          header: `${code}.${index + 1}. ${label}`,
          width: 34,
        }),
      );
    else columns.push({ key: code, header: `${code}. ${QUESTION_LABELS[code]}`, width: 34 });
  }
  sheet.columns = columns;
  for (const response of responses) {
    const row = Object.fromEntries(BASE_COLUMNS.map(([key]) => [key, response[key]]));
    for (let number = 1; number <= 23; number += 1) {
      const code = `Q${number}`;
      if (code === 'Q18')
        Q18_ROWS.forEach((label, index) => {
          row[`${code}_${index + 1}`] = matrixValue(
            response.answers.get(code),
            snapshots.get(code)?.rows,
            label,
            index,
          );
        });
      else row[code] = formatAnswer(response.answers.get(code));
    }
    sheet.addRow(row);
  }
  sheet.autoFilter = { from: 'A1', to: { row: 1, column: columns.length } };
  sheet.getRow(1).font = { bold: true };
  sheet.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true };
  });
  return workbook.xlsx.writeBuffer();
}
module.exports = { BASE_COLUMNS, QUESTION_LABELS, Q18_ROWS, buildRows, buildWorkbook, matrixValue };
