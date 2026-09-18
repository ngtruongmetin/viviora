const crypto = require('node:crypto');
const { all } = require('../database/db');

async function recordActivity(client, { userId, type, metadata = {} }) {
  await client.query(
    'INSERT INTO user_activities(id, user_id, type, metadata) VALUES($1, $2, $3, $4)',
    [crypto.randomUUID(), userId, type, metadata],
  );
}

async function listActivities(userId, limit = 12) {
  return all(
    `SELECT id, type, metadata, created_at
     FROM user_activities WHERE user_id=?
     ORDER BY created_at DESC, id DESC LIMIT ?`,
    [userId, Math.min(Math.max(Number(limit) || 12, 1), 30)],
  );
}

module.exports = { listActivities, recordActivity };
