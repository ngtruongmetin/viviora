const express = require('express');
const { requireLogin } = require('../middlewares/auth');
const { listLeaderboard, listWeeks } = require('../services/leaderboardService');

const router = express.Router();
router.get('/', requireLogin, async (req, res, next) => {
  try {
    res.json({
      items: await listLeaderboard(
        req.query.limit,
        req.query.week === 'current' ? null : req.query.week,
      ),
    });
  } catch (error) {
    next(error);
  }
});
router.get('/weeks', requireLogin, async (_req, res, next) => {
  try {
    res.json({ items: await listWeeks() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
