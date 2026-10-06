const express = require('express');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('node:path');
const PostgresSessionStore = require('./sessionStore');
const auth = require('./routes/auth');
const feed = require('./routes/feed');
const posts = require('./routes/posts');
const moderation = require('./routes/moderation');
const profile = require('./routes/profile');
const library = require('./routes/library');
const adminLibrary = require('./routes/adminLibrary');
const adminUsers = require('./routes/adminUsers');
const users = require('./routes/users');
const questionBanks = require('./routes/questionBanks');
const questions = require('./routes/questions');
const games = require('./routes/games');
const leaderboard = require('./routes/leaderboard');
const adminAchievements = require('./routes/adminAchievements');
const weeklyMissions = require('./routes/weeklyMissions');
const ai = require('./routes/ai');

const app = express();
app.set('trust proxy', 1);
app.use(
  cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5080', credentials: true }),
);
app.use(express.json({ limit: '2mb' }));
app.use(
  rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }),
);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore(),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);
app.use(
  '/uploads/avatars',
  express.static(
    path.join(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'), 'avatars'),
  ),
);
app.use(
  '/uploads/library-covers',
  express.static(
    path.join(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'), 'library-covers'),
  ),
);
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, service: 'vv-backend', database: 'postgresql' }),
);
app.use('/api/auth', auth);
app.use('/api/profile', profile);
app.use('/api/feed', feed);
app.use('/api/posts', posts);
app.use('/api/moderation', moderation);
app.use('/api/library', library);
app.use('/api/admin/library', adminLibrary);
app.use('/api/admin/users', adminUsers);
app.use('/api/users', users);
app.use('/api/question-banks', questionBanks);
app.use('/api/questions', questions);
app.use('/api/games', games);
app.use('/api/leaderboard', leaderboard);
app.use('/api/admin/achievements', adminAchievements);
app.use('/api/weekly-missions', weeklyMissions);
app.use('/api/ai', ai);
app.get('/api/notifications', async (req, res, next) => {
  try {
    if (!req.session.user)
      return res
        .status(401)
        .json({ error: { code: 'AUTH_REQUIRED', message: 'Vui lòng đăng nhập' } });
    const { all } = require('./database/db');
    res.json({
      items: await all(
        'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30',
        [req.session.user.id],
      ),
    });
  } catch (e) {
    next(e);
  }
});
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.type === 'entity.parse.failed')
    return res
      .status(400)
      .json({ error: { code: 'INVALID_JSON', message: 'Dữ liệu gửi lên không hợp lệ.' } });
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Đã có lỗi xảy ra' } });
});
module.exports = app;
