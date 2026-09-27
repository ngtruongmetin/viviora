const express = require('express');
const { requireLogin } = require('../middlewares/auth');
const service = require('../services/weeklyMissionService');
const router = express.Router();
router.use(requireLogin);
router.get('/', async (req, res, next) => {
  try {
    res.json({ data: await service.list(req.session.user.id) });
  } catch (e) {
    next(e);
  }
});
router.get('/history', async (req, res, next) => {
  try {
    const { all } = require('../database/db');
    res.json({
      items: await all(
        'SELECT DISTINCT week_start FROM weekly_mission_assignments WHERE user_id=? ORDER BY week_start DESC',
        [req.session.user.id],
      ),
    });
  } catch (e) {
    next(e);
  }
});
router.get('/:weekStart', async (req, res, next) => {
  try {
    res.json({ data: await service.list(req.session.user.id, req.params.weekStart) });
  } catch (e) {
    next(e);
  }
});
router.post('/:missionId/claim', async (req, res, next) => {
  try {
    const mission = await service.claim(req.session.user.id, req.params.missionId);
    res.json({
      data: {
        mission,
        achievementEvents: {
          rewardType: 'CUP',
          unlocked: [
            {
              code: `MISSION_${mission.mission_no}`,
              name: mission.name,
              condition_text: mission.requirement_text,
              exp_reward: mission.cup_reward,
            },
          ],
        },
      },
    });
  } catch (e) {
    next(e);
  }
});
module.exports = router;
