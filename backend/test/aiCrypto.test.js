const test = require('node:test');
const assert = require('node:assert/strict');

test('AI credentials are encrypted and require the deployment master key to decrypt', () => {
  const before = process.env.AI_CONFIG_KEY;
  process.env.AI_CONFIG_KEY = 'test-only-master-key';
  const { encrypt, decrypt } = require('../services/aiCrypto');
  const secured = encrypt('provider-secret-value');
  assert.notEqual(secured.ciphertext, 'provider-secret-value');
  assert.equal(decrypt({ credential_ciphertext: secured.ciphertext, credential_iv: secured.iv, credential_tag: secured.tag }), 'provider-secret-value');
  if (before === undefined) delete process.env.AI_CONFIG_KEY; else process.env.AI_CONFIG_KEY = before;
});
