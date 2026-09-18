const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c timezone=Asia/Ho_Chi_Minh',
  max: Number(process.env.DB_POOL_SIZE || 10),
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

function sqlWithParams(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

const query = (sql, params = []) => pool.query(sqlWithParams(sql), params);
const run = (sql, params = []) => query(sql, params);
const get = async (sql, params = []) => (await query(sql, params)).rows[0];
const all = async (sql, params = []) => (await query(sql, params)).rows;

async function initialize() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrationsDirectory = path.join(__dirname, 'migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDirectory)
    .filter((filename) => /^\d+_.+\.sql$/.test(filename))
    .sort();

  for (const filename of migrationFiles) {
    const applied = await get('SELECT filename FROM schema_migrations WHERE filename=?', [filename]);
    if (applied) continue;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(migrationsDirectory, filename), 'utf8'));
      await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [filename]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { pool, query, run, get, all, initialize };
