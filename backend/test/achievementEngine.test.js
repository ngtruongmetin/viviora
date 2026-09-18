const test = require('node:test');
const assert = require('node:assert/strict');
const { achievementRegistry, evaluateDefinition } = require('../services/achievementService');

const definition = (code) => ({ code });
const context = (distinctBooks, distinctCategories) => ({ distinctBooks, distinctCategories });

test('library explorer counts distinct books, not view repetitions', () => {
  assert.equal(evaluateDefinition(definition('ACH_002'), context(1, 1)).current, 1);
  assert.equal(evaluateDefinition(definition('ACH_002'), context(10, 1)).current, 10);
});

test('library scan counts distinct categories independently of book count', () => {
  assert.equal(evaluateDefinition(definition('ACH_003'), context(10, 1)).current, 1);
  assert.equal(evaluateDefinition(definition('ACH_003'), context(10, 10)).current, 10);
  assert.equal(achievementRegistry.ACH_003.target, 10);
});
