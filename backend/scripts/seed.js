const bcrypt = require('bcrypt');
const { initialize, pool } = require('../database/db');
const { clearApplicationData } = require('./reset');

const admin = {
  id: 'admin-user',
  username: 'admin',
  name: 'Nguyễn Lê Tấn',
  password: 'admin123',
  role: 'ADMIN',
};

async function seed() {
  await initialize();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await clearApplicationData(client);
    const passwordHash = await bcrypt.hash(admin.password, 12);
    await client.query(
      `INSERT INTO users(id, username, name, email, password_hash, role)
       VALUES($1, $2, $3, NULL, $4, $5)`,
      [admin.id, admin.username, admin.name, passwordHash, admin.role],
    );
    await client.query('COMMIT');
    console.log('Database seed completed. Created the single admin account.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
