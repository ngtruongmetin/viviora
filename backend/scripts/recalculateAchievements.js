const { initialize, pool, all } = require('../database/db');
const { recalculateUserAchievements } = require('../services/achievementService');

initialize()
  .then(async () => {
    const users = await all('SELECT id FROM users');
    for (const user of users) await recalculateUserAchievements(user.id);
    console.log(`Recalculated achievements for ${users.length} users.`);
  })
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => pool.end());
