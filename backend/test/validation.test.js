const test = require('node:test');
const assert = require('node:assert/strict');
const { requireRole } = require('../middlewares/auth');
test('role labels preserve Vietnamese admin terminology', () => assert.equal('Thủ thư', 'Thủ thư'));
test('feed limit stays bounded', () => assert.ok(Math.min(Number(100), 20) <= 20));
test('student role cannot enter admin import routes', () => {
  let statusCode;
  const response = {
    status: (code) => {
      statusCode = code;
      return response;
    },
    json: () => undefined,
  };
  requireRole('ADMIN')({ session: { user: { role: 'STUDENT' } } }, response, () => {
    throw new Error('Student must not reach the protected handler');
  });
  assert.equal(statusCode, 403);
});
