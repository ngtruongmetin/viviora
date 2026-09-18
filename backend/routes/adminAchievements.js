const express = require('express');
const { all, get } = require('../database/db');
const { requireRole } = require('../middlewares/auth');
const { resetAllProgress } = require('../services/achievementService');

const router = express.Router();
router.use(requireRole('ADMIN'));
router.get('/', async (_req, res, next) => { try { res.json({ items: await all(`SELECT a.*, COUNT(ua.id)::int AS unlocked_count FROM achievements a LEFT JOIN user_achievements ua ON ua.achievement_id=a.id GROUP BY a.id ORDER BY a.sort_order`) }); } catch (error) { next(error); } });
router.get('/progress', async (_req, res, next) => { try { const stats = await get(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_supported)::int AS supported, COUNT(*) FILTER (WHERE NOT is_supported)::int AS unsupported, (SELECT COUNT(*)::int FROM user_achievements) AS unlocks FROM achievements`); const top = await all(`SELECT id,name,username,exp FROM users WHERE is_active=true ORDER BY exp DESC, lower(name) LIMIT 10`); res.json({ data: { stats, top } }); } catch (error) { next(error); } });
router.post('/reset', async (_req, res, next) => { try { await resetAllProgress(); res.json({ ok: true }); } catch (error) { next(error); } });
module.exports = router;
