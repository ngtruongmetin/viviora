const test = require('node:test');
const assert = require('node:assert/strict');
const authRouter = require('../routes/auth');

const registerSchema = authRouter.registerSchema;
const base = { name: 'Nguyen Van A', username: 'nguyenvana', email: 'a@example.com', password: 'password123', confirmPassword: 'password123', role: 'STUDENT', className: '8A1', specialization: null, gender: null };

test('registration accepts a student with a valid class', () => {
  assert.equal(registerSchema.safeParse(base).success, true);
});

test('registration accepts a teacher with specialization and rejects admin', () => {
  assert.equal(registerSchema.safeParse({ ...base, role: 'TEACHER', className: null, specialization: 'Toán' }).success, true);
  assert.equal(registerSchema.safeParse({ ...base, role: 'ADMIN' }).success, false);
});

test('registration rejects invalid password confirmation and role-specific fields', () => {
  assert.equal(registerSchema.safeParse({ ...base, confirmPassword: 'different' }).success, false);
  assert.equal(registerSchema.safeParse({ ...base, className: 'wrong' }).success, false);
  assert.equal(registerSchema.safeParse({ ...base, role: 'TEACHER', className: null, specialization: null }).success, false);
});
