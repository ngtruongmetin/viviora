const { initialize, pool } = require('../database/db');
const fs = require('node:fs');
const path = require('node:path');

const applicationTables = [
  'user_game_rewards',
  'game_session_questions',
  'game_sessions',
  'games',
  'user_activities',
  'post_library_books',
  'poll_votes',
  'user_achievements',
  'reading_progress',
  'notifications',
  'reactions',
  'comments',
  'moderation_feedback',
  'moderation',
  'post_media',
  'post_books',
  'poll_options',
  'polls',
  'posts',
  'books',
  'library_collections',
  'community_books',
  'achievements',
  'users',
  'sessions',
];

async function clearApplicationData(client) {
  for (const table of applicationTables) {
    await client.query(`DELETE FROM ${table}`);
  }
}

async function reset() {
  await initialize();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await clearApplicationData(client);
    await client.query('UPDATE users SET exp=0');
    await client.query('COMMIT');
    const coverDirectory = path.join(
      process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
      'library-covers',
    );
    await fs.promises.rm(coverDirectory, { recursive: true, force: true });
    console.log('Application data reset completed.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  reset()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { applicationTables, clearApplicationData, reset };
