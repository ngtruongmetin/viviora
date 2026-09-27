const test = require('node:test');
const assert = require('node:assert/strict');
const { questionSchema } = require('../schemas/question');

const mc = (options) => ({ type: 'MC', content: 'Câu hỏi hợp lệ', options });
const option = (isCorrect = false) => ({ label: 'Đáp án', isCorrect });

test('MC accepts exactly four options with one correct answer', () => {
  assert.equal(
    questionSchema.safeParse(mc([option(true), option(), option(), option()])).success,
    true,
  );
});

test('MC rejects three, five, zero-correct, and two-correct options', () => {
  assert.equal(questionSchema.safeParse(mc([option(true), option(), option()])).success, false);
  assert.equal(
    questionSchema.safeParse(mc([option(true), option(), option(), option(), option()])).success,
    false,
  );
  assert.equal(
    questionSchema.safeParse(mc([option(), option(), option(), option()])).success,
    false,
  );
  assert.equal(
    questionSchema.safeParse(mc([option(true), option(true), option(), option()])).success,
    false,
  );
});

test('TF accepts both boolean answers and rejects missing answers', () => {
  assert.equal(
    questionSchema.safeParse({ type: 'TF', content: 'Mệnh đề', correctAnswer: true }).success,
    true,
  );
  assert.equal(
    questionSchema.safeParse({ type: 'TF', content: 'Mệnh đề', correctAnswer: false }).success,
    true,
  );
  assert.equal(questionSchema.safeParse({ type: 'TF', content: 'Mệnh đề' }).success, false);
});

test('question points default to 10 and reject non-positive values', () => {
  assert.equal(
    questionSchema.parse({ ...mc([option(true), option(), option(), option()]) }).point,
    10,
  );
  assert.equal(
    questionSchema.safeParse({ ...mc([option(true), option(), option(), option()]), point: 0 })
      .success,
    false,
  );
  assert.equal(
    questionSchema.safeParse({ ...mc([option(true), option(), option(), option()]), point: 1.5 })
      .success,
    false,
  );
});
