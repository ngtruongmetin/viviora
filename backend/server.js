const app = require('./app');
const { initialize, pool } = require('./database/db');
const port = Number(process.env.PORT || 4000);
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
  throw new Error('SESSION_SECRET must be at least 32 characters');
initialize()
  .then(() => app.listen(port, () => console.log(`Viviora API listening on ${port}`)))
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
