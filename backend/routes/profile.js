const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const { get, run, pool } = require('../database/db');
const { requireLogin } = require('../middlewares/auth');
const bcrypt = require('bcrypt');
const { imageSize } = require('image-size');
const { recordActivity, listActivities } = require('../services/activityService');
const { evaluateUser, getUserAchievements, getUserAchievementProgress } = require('../services/achievementService');

const router = express.Router();
router.use(requireLogin);

const profileColumns = `
  id, username, name, email, role, class_name, gender,
  specialization, avatar_url, bio, is_active, created_at,
  (SELECT COALESCE(SUM(ugr.cup_count), 0) FROM user_game_rewards ugr WHERE ugr.user_id=users.id AND ugr.week_start=((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - (EXTRACT(ISODOW FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::int - 1)))::int AS trophy_count,
  (SELECT COALESCE(SUM(ugr.cup_count), 0) FROM user_game_rewards ugr WHERE ugr.user_id=users.id AND ugr.week_start=((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - (EXTRACT(ISODOW FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::int - 1)))::int AS current_week_cups,
  users.exp,
  (SELECT COALESCE(MAX(l.level), 1) FROM levels l WHERE l.required_exp <= users.exp)::int AS level,
  (SELECT COALESCE(MAX(l.required_exp), 0) FROM levels l WHERE l.required_exp <= users.exp)::int AS current_level_exp,
  (SELECT MIN(l.required_exp) FROM levels l WHERE l.required_exp > users.exp) AS next_level_exp`;
const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
const avatarDirectory = path.join(uploadDirectory, 'avatars');
const maxAvatarSize = Number(process.env.AVATAR_MAX_SIZE || 5 * 1024 * 1024);
const mimeExtensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    fs.mkdir(avatarDirectory, { recursive: true }, (error) => callback(error, avatarDirectory));
  },
  filename: (_req, _file, callback) => callback(null, `${crypto.randomUUID()}.upload`),
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: maxAvatarSize, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!mimeExtensions[file.mimetype]) {
      const error = new Error('Định dạng ảnh không được hỗ trợ. Hãy dùng JPG, PNG hoặc WEBP.');
      error.code = 'INVALID_AVATAR_TYPE';
      return callback(error);
    }
    callback(null, true);
  },
});

function publicProfile(row) {
  return row || null;
}

function localAvatarPath(avatarUrl) {
  const prefix = '/uploads/avatars/';
  if (typeof avatarUrl !== 'string' || !avatarUrl.startsWith(prefix)) return null;
  const filename = avatarUrl.slice(prefix.length);
  if (!filename || filename !== path.basename(filename)) return null;
  const resolved = path.resolve(avatarDirectory, filename);
  return path.dirname(resolved) === avatarDirectory ? resolved : null;
}

async function removeLocalAvatar(avatarUrl) {
  const filePath = localAvatarPath(avatarUrl);
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function avatarExtensionFromSignature(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return '.webp';
  return null;
}

async function validateSquareAvatar(filePath) {
  const buffer = await fs.promises.readFile(filePath);
  const extension = avatarExtensionFromSignature(buffer.subarray(0, 16));
  if (!extension) {
    const error = new Error('Nội dung file không phải ảnh JPG, PNG hoặc WEBP hợp lệ.');
    error.code = 'INVALID_AVATAR_CONTENT';
    throw error;
  }
  let dimensions;
  try { dimensions = imageSize(buffer); } catch {
    const error = new Error('Không thể đọc kích thước ảnh đại diện.');
    error.code = 'INVALID_AVATAR_CONTENT';
    throw error;
  }
  if (!dimensions.width || !dimensions.height || dimensions.width !== dimensions.height) {
    const error = new Error('Ảnh đại diện phải là ảnh vuông 1:1.');
    error.code = 'AVATAR_NOT_SQUARE';
    throw error;
  }
  return extension;
}

async function getCurrentProfile(userId) {
  return get(`SELECT ${profileColumns} FROM users WHERE id=?`, [userId]);
}

async function listGameProgress(userId) {
  const { all } = require('../database/db');
  return all(`SELECT g.id AS game_id, g.title AS game_title, g.reward_cups,
      MAX(gs.score)::int AS score, MAX(gs.total_points)::int AS total_points,
      BOOL_OR(gs.completed_at IS NOT NULL) AS completed,
      (SELECT COUNT(*)::int FROM game_session_questions gsq WHERE gsq.session_id=(SELECT latest.id FROM game_sessions latest WHERE latest.game_id=g.id AND latest.user_id=$1 ORDER BY latest.started_at DESC LIMIT 1) AND gsq.selected_answer IS NOT NULL) AS answered_count,
      (SELECT COALESCE(SUM(cup_count), 0)::int FROM user_game_rewards r WHERE r.user_id=$1 AND r.game_id=g.id) AS cup_earned
    FROM games g JOIN game_sessions gs ON gs.game_id=g.id AND gs.user_id=$1
    GROUP BY g.id ORDER BY MAX(gs.started_at) DESC`, [userId]);
}

async function updateAvatar(userId, avatarUrl) {
  const current = await getCurrentProfile(userId);
  if (!current) return null;
  await run('UPDATE users SET avatar_url=? WHERE id=?', [avatarUrl, userId]);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await recordActivity(client, { userId, type: 'PROFILE_UPDATED', metadata: { fields: ['avatar_url'] } });
    await client.query('COMMIT');
  } finally { client.release(); }
  try {
    await removeLocalAvatar(current.avatar_url);
  } catch (error) {
    console.error('Could not remove replaced avatar file:', error);
  }
  return { ...publicProfile(await getCurrentProfile(userId)), activities: await listActivities(userId, 12), game_progress: await listGameProgress(userId) };
}

function handleAvatarUpload(req, res, next) {
  avatarUpload.single('avatar')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE')
      return res.status(413).json({ error: { code: 'AVATAR_TOO_LARGE', message: 'Ảnh đại diện không được vượt quá 5 MB.' } });
    if (error.code === 'INVALID_AVATAR_TYPE')
      return res.status(400).json({ error: { code: error.code, message: error.message } });
    next(error);
  });
}

router.get('/', async (req, res, next) => {
  try {
    const user = await getCurrentProfile(req.session.user.id);
    if (!user) return res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Không tìm thấy hồ sơ' } });
    res.json({ data: { ...publicProfile(user), activities: await listActivities(user.id, 12), game_progress: await listGameProgress(user.id), achievements: await getUserAchievementProgress(user.id) } });
  } catch (error) {
    next(error);
  }
});

router.post('/avatar', handleAvatarUpload, async (req, res, next) => {
  let uploadedPath;
  try {
    if (!req.file) return res.status(400).json({ error: { code: 'AVATAR_REQUIRED', message: 'Hãy chọn một ảnh đại diện.' } });
    uploadedPath = req.file.path;
    const extension = await validateSquareAvatar(uploadedPath);
    if (mimeExtensions[req.file.mimetype] !== extension) {
      await fs.promises.unlink(uploadedPath).catch(() => undefined);
      return res.status(400).json({ error: { code: 'AVATAR_MIME_MISMATCH', message: 'MIME type không khớp với nội dung ảnh.' } });
    }
    const filename = `${crypto.randomUUID()}${extension}`;
    const finalPath = path.join(avatarDirectory, filename);
    await fs.promises.rename(uploadedPath, finalPath);
    uploadedPath = finalPath;
    const updated = await updateAvatar(req.session.user.id, `/uploads/avatars/${filename}`);
    if (!updated) return res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Không tìm thấy hồ sơ' } });
    req.session.user = updated;
    res.json({ data: updated });
  } catch (error) {
    if (uploadedPath) await fs.promises.unlink(uploadedPath).catch(() => undefined);
    if (['INVALID_AVATAR_CONTENT', 'AVATAR_NOT_SQUARE'].includes(error?.code))
      return res.status(400).json({ error: { code: error.code, message: error.message } });
    next(error);
  }
});

router.delete('/avatar', async (req, res, next) => {
  try {
    const updated = await updateAvatar(req.session.user.id, null);
    if (!updated) return res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Không tìm thấy hồ sơ' } });
    req.session.user = updated;
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

router.patch('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const updates = [];
    const values = [];
    const add = (column, value) => {
      updates.push(`${column}=?`);
      values.push(value);
    };

    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 120)
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Họ và tên phải từ 1 đến 120 ký tự' } });
      add('name', body.name.trim());
    }
    if (Object.prototype.hasOwnProperty.call(body, 'email')) {
      const email = body.email === '' || body.email === null ? null : body.email;
      if (email !== null && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320))
        return res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'Email không hợp lệ.' } });
      add('email', email);
    }
    for (const [key, column, maxLength] of [['bio', 'bio', 1000]]) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
      const value = body[key] === null || body[key] === '' ? null : body[key];
      if (value !== null && (typeof value !== 'string' || value.length > maxLength))
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Thông tin hồ sơ không hợp lệ' } });
      add(column, value);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'gender')) {
      const value = body.gender === '' || body.gender === null ? null : body.gender;
      if (!['Nam', 'Nữ', null].includes(value))
        return res.status(400).json({ error: { code: 'INVALID_GENDER', message: 'Giới tính chỉ có thể là Nam, Nữ hoặc Chưa cập nhật.' } });
      add('gender', value);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'className') || Object.prototype.hasOwnProperty.call(body, 'specialization'))
      return res.status(403).json({ error: { code: 'MANAGED_FIELD', message: 'Lớp và tổ chuyên môn chỉ được quản lý bởi Admin.' } });
    if (Object.prototype.hasOwnProperty.call(body, 'avatarUrl'))
      return res.status(403).json({ error: { code: 'AVATAR_UPLOAD_REQUIRED', message: 'Ảnh đại diện chỉ được thay đổi bằng thao tác tải ảnh lên.' } });
    if (!updates.length)
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Chưa có thay đổi để lưu' } });

    const current = await getCurrentProfile(req.session.user.id);
    values.push(req.session.user.id);
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id=?`, values);
    const updated = await getCurrentProfile(req.session.user.id);
    if (current?.avatar_url !== updated?.avatar_url) await removeLocalAvatar(current?.avatar_url);
    req.session.user = publicProfile(updated);
    const activityClient = await pool.connect();
    try {
      await activityClient.query('BEGIN');
      await recordActivity(activityClient, { userId: req.session.user.id, type: 'PROFILE_UPDATED', metadata: { fields: updates.map((item) => item.split('=')[0]) } });
      await activityClient.query('COMMIT');
    } finally { activityClient.release(); }
    res.json({ data: { ...publicProfile(updated), activities: await listActivities(updated.id, 12), game_progress: await listGameProgress(updated.id) } });
  } catch (error) {
    if (error?.code === '23505') return res.status(409).json({ error: { code: 'DUPLICATE_EMAIL', message: 'Email đã được sử dụng.' } });
    next(error);
  }
});

router.post('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 200 || newPassword !== confirmPassword)
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Mật khẩu mới không hợp lệ hoặc không khớp.' } });
    const user = await get('SELECT password_hash FROM users WHERE id=?', [req.session.user.id]);
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash)))
      return res.status(400).json({ error: { code: 'CURRENT_PASSWORD_INVALID', message: 'Mật khẩu hiện tại không đúng.' } });
    if (await bcrypt.compare(newPassword, user.password_hash))
      return res.status(400).json({ error: { code: 'PASSWORD_UNCHANGED', message: 'Mật khẩu mới phải khác mật khẩu hiện tại.' } });
    await run('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(newPassword, 12), req.session.user.id]);
    const activityClient = await require('../database/db').pool.connect();
    try { await activityClient.query('BEGIN'); await recordActivity(activityClient, { userId: req.session.user.id, type: 'PASSWORD_CHANGED' }); await activityClient.query('COMMIT'); } finally { activityClient.release(); }
    res.json({ data: { ok: true } });
  } catch (error) { next(error); }
});

module.exports = router;
