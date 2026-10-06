const crypto = require('node:crypto');
const fs = require('node:fs');

function masterKey() {
  const file = process.env.AI_CONFIG_KEY_FILE || '/run/secrets/ai_config_key';
  const raw = process.env.AI_CONFIG_KEY || (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
  if (!raw.trim()) throw new Error('AI configuration secret is unavailable.');
  return crypto.createHash('sha256').update(raw.trim()).digest();
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}

function decrypt(record) {
  if (!record?.credential_ciphertext || !record?.credential_iv || !record?.credential_tag) return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey(), Buffer.from(record.credential_iv, 'base64'));
  decipher.setAuthTag(Buffer.from(record.credential_tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(record.credential_ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { decrypt, encrypt };
