const crypto = require('node:crypto');

const ttlMs = Math.max(60_000, Number(process.env.LIBRARY_IMPORT_TTL_MS || 30 * 60 * 1000));
const imports = new Map();

function cleanupExpiredImports() {
  const now = Date.now();
  for (const [id, item] of imports) {
    if (item.expiresAt <= now) imports.delete(id);
  }
}

const cleanupTimer = setInterval(cleanupExpiredImports, Math.min(ttlMs, 5 * 60 * 1000));
cleanupTimer.unref();

function createImport({ userId, collection, parsed }) {
  cleanupExpiredImports();
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  imports.set(id, {
    id,
    userId,
    collection,
    parsed,
    status: 'READY',
    createdAt,
    expiresAt: createdAt + ttlMs,
  });
  return imports.get(id);
}

function getImport(id, userId) {
  cleanupExpiredImports();
  const item = imports.get(id);
  if (!item || item.userId !== userId) return null;
  return item;
}

function beginConfirmation(id, userId) {
  const item = getImport(id, userId);
  if (!item || item.status !== 'READY') return null;
  item.status = 'CONFIRMING';
  return item;
}

function releaseConfirmation(id) {
  const item = imports.get(id);
  if (item) item.status = 'READY';
}

function completeImport(id) {
  imports.delete(id);
}

function cancelImport(id, userId) {
  const item = getImport(id, userId);
  if (!item || item.status === 'CONFIRMING') return false;
  imports.delete(id);
  return true;
}

module.exports = {
  beginConfirmation,
  cancelImport,
  completeImport,
  createImport,
  getImport,
  releaseConfirmation,
};
