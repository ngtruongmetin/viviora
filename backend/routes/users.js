const express = require('express');
const { requireLogin } = require('../middlewares/auth');
const { get } = require('../database/db');
const { listPosts, roleLabel } = require('../services/communityService');
const { getUserAchievements } = require('../services/achievementService');

const router = express.Router();
router.get('/:userId', requireLogin, async (req, res, next) => {
  try {
    const user = await get(
      `SELECT id, name, username, role, class_name, specialization, avatar_url, bio, created_at, exp,
         (SELECT COALESCE(MAX(l.level), 1) FROM levels l WHERE l.required_exp <= users.exp)::int AS level,
         (SELECT COALESCE(MAX(l.required_exp), 0) FROM levels l WHERE l.required_exp <= users.exp)::int AS current_level_exp,
         (SELECT MIN(l.required_exp) FROM levels l WHERE l.required_exp > users.exp) AS next_level_exp,
         (SELECT COALESCE(SUM(ugr.cup_count), 0)::int FROM user_game_rewards ugr WHERE ugr.user_id=users.id AND ugr.week_start=((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - (EXTRACT(ISODOW FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::int - 1))) AS trophy_count,
         (SELECT COALESCE(SUM(ugr.cup_count), 0)::int FROM user_game_rewards ugr WHERE ugr.user_id=users.id AND ugr.week_start=((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - (EXTRACT(ISODOW FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::int - 1))) AS current_week_cups
       FROM users WHERE id=? AND is_active=true`,
      [req.params.userId],
    );
    if (!user) return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Không tìm thấy người dùng.' } });
    const posts = await listPosts({ viewerId: req.session.user.id, authorId: user.id, limit: 10 });
    res.json({ data: { ...user, roleLabel: roleLabel(user.role), posts: posts.items, achievements: await getUserAchievements(user.id) } });
  } catch (error) { next(error); }
});
module.exports = router;
