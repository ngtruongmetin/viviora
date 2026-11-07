const test = require('node:test');
const assert = require('node:assert/strict');
const { QUOTAS, buildPlan, report } = require('../scripts/seedDemoSurvey');

const students = Array.from({ length: 384 }, (_, index) => ({
  id: `user-${index}`,
  username: `student_${String(index).padStart(3, '0')}`,
  class_name: '8A1',
  gender: index % 2 ? 'Nữ' : 'Nam',
  created_at: '2026-10-01T00:00:00.000Z',
}));
const source = students.slice(0, 358).map((student) => student.username);

function count(plans, code, option) {
  return plans.filter((plan) => {
    const answer = plan.answers[code];
    return Array.isArray(answer) ? answer.includes(option) : answer === option;
  }).length;
}

test('demo survey planner produces deterministic 384-account quotas', () => {
  const first = buildPlan(students, source);
  const second = buildPlan(students, source);
  assert.deepEqual(first, second);
  assert.deepEqual(report(first).q3, [347, 37]);
  for (const [code, quota] of Object.entries(QUOTAS)) {
    assert.deepEqual(
      quota.map((_, index) => count(first, code, index)),
      quota,
    );
  }
  assert.equal(count(first, 'Q8', 0), 115);
  assert.equal(count(first, 'Q19', 0), 288);
  assert.equal(count(first, 'Q19', 1), 250);
  assert.equal(count(first, 'Q20', 5), 230);
  assert.equal(count(first, 'Q20', 0), 38);
  assert.deepEqual(
    [0, 1, 2, 3, 4, 6].map((option) => count(first, 'Q20', option)),
    [38, 20, 38, 38, 29, 5],
  );
  assert.ok(
    first.every((plan) =>
      ['Q8', 'Q14', 'Q19', 'Q20'].every((code) => plan.answers[code].length > 0),
    ),
  );
  assert.ok(first.every((plan) => plan.answers.Q19.length <= 3));
  assert.ok(first.every((plan) => !plan.answers.Q20.includes(5) || plan.answers.Q20.length === 1));
  ['Q21', 'Q22', 'Q23'].forEach((code) => {
    const answers = first.map((plan) => plan.answers[code]);
    assert.equal(new Set(answers).size, 384);
    assert.ok(answers.every((answer) => answer.trim().length > 0));
  });
});
