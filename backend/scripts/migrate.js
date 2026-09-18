const { initialize, pool } = require('../database/db');
const crypto = require('node:crypto');
const { achievementDefinitions, levelDefinitions } = require('../services/achievementDefinitions');

async function seedDefinitions() {
  for (const definition of achievementDefinitions) {
    await pool.query(`INSERT INTO achievements(id, code, name, description, icon, condition_text, exp_reward, sort_order, is_supported, support_note)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name, condition_text=EXCLUDED.condition_text, exp_reward=EXCLUDED.exp_reward, sort_order=EXCLUDED.sort_order, is_supported=EXCLUDED.is_supported, support_note=EXCLUDED.support_note`,
      [crypto.createHash('sha1').update(definition.code).digest('hex'), definition.code, definition.name, definition.conditionText, 'trophy', definition.conditionText, definition.expReward, definition.sortOrder, definition.isSupported, definition.supportNote]);
  }
  for (const definition of levelDefinitions) await pool.query('INSERT INTO levels(level, required_exp) VALUES($1,$2) ON CONFLICT(level) DO UPDATE SET required_exp=EXCLUDED.required_exp', [definition.level, definition.requiredExp]);
}

initialize()
  .then(seedDefinitions)
  .then(() => console.log('Database migrations applied.'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
