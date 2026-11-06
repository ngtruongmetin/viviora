const test = require('node:test');
const assert = require('node:assert/strict');
const { parseStudentRows, planCreatedAt, WEEK_SPECS } = require('../scripts/syncStudentProfiles');

function rows(count) {
  return Array.from({ length: count }, (_, index) => ({
    'Họ tên': `Học sinh ${index + 1}`,
    'Giới tính': index % 2 ? 'Nữ' : 'Nam',
    'Mã lớp': `8A${(index % 9) + 1}`,
    Username: `student_${String(index + 1).padStart(3, '0')}`,
    Password: `student_${String(index + 1).padStart(3, '0')}`,
  }));
}

test('created-at plan assigns all 358 students to the exact weekly quotas deterministically', () => {
  const students = parseStudentRows(rows(358));
  const first = planCreatedAt(students);
  const second = planCreatedAt(students);
  assert.deepEqual(first, second);
  assert.equal(first.length, 358);

  for (const week of WEEK_SPECS) {
    const start = Date.parse(week.start);
    const end = start + 7 * 24 * 60 * 60 * 1000;
    const inWeek = first.filter((student) => {
      const timestamp = Date.parse(student.createdAt);
      return timestamp >= start && timestamp < end;
    });
    assert.equal(inWeek.length, week.quota);
  }
});

test('student rows require all fields, valid genders/classes, and unique usernames', () => {
  assert.throws(() => parseStudentRows([{ Username: 'student_001' }]), /Thiếu cột bắt buộc/);
  assert.throws(
    () => parseStudentRows([{ ...rows(1)[0], 'Giới tính': 'Khác' }]),
    /thiếu hoặc có giá trị không hợp lệ/,
  );
  assert.throws(
    () => parseStudentRows([{ ...rows(1)[0], 'Mã lớp': '10A1' }]),
    /mã lớp không hợp lệ/,
  );
  assert.throws(() => parseStudentRows([rows(1)[0], rows(1)[0]]), /Username bị trùng/);
});
