const crypto = require('node:crypto');

const ttlMs = Math.max(60_000, Number(process.env.QUESTION_IMPORT_TTL_MS || 30 * 60 * 1000));
const imports = new Map();

function cleanup() {
  const now = Date.now();
  for (const [id, item] of imports) if (item.expiresAt <= now) imports.delete(id);
}

function createImport({ userId, bankId, fileName, parsed }) {
  cleanup();
  const id = crypto.randomUUID();
  const item = { id, userId, bankId, fileName, parsed, status: 'READY', expiresAt: Date.now() + ttlMs };
  imports.set(id, item);
  return item;
}

function beginConfirmation(id, userId, bankId) {
  cleanup();
  const item = imports.get(id);
  if (!item || item.userId !== userId || item.bankId !== bankId || item.status !== 'READY') return null;
  item.status = 'CONFIRMING';
  return item;
}

function releaseConfirmation(id) { if (imports.has(id)) imports.get(id).status = 'READY'; }
function completeImport(id) { imports.delete(id); }
function cancelImport(id, userId, bankId) {
  cleanup();
  const item = imports.get(id);
  if (!item || item.userId !== userId || item.bankId !== bankId || item.status === 'CONFIRMING') return false;
  imports.delete(id);
  return true;
}

module.exports = { beginConfirmation, cancelImport, completeImport, createImport, releaseConfirmation };
