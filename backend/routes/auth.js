const express = require('express');
const bcrypt = require('bcrypt');
const { z } = require('zod');
const { get } = require('../database/db');
const { evaluateUser } = require('../services/achievementService');
const userService = require('../services/adminUserService');
const router = express.Router();
const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  email: user.email,
  role: user.role,
  class_name: user.class_name,
  gender: user.gender,
  specialization: user.specialization,
  avatar_url: user.avatar_url,
  bio: user.bio,
  exp: user.exp || 0,
  is_active: user.is_active,
  created_at: user.created_at,
});
const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Họ và tên là bắt buộc.').max(120),
    username: z
      .string()
      .trim()
      .min(3, 'Username phải có ít nhất 3 ký tự.')
      .max(80)
      .regex(
        /^[A-Za-z0-9._-]+$/,
        'Username chỉ được chứa chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.',
      ),
    email: z.preprocess(
      (value) => (value === '' || value === null || value === undefined ? null : value),
      z.string().trim().email('Email không hợp lệ.').max(320).nullable(),
    ),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.').max(200),
    confirmPassword: z.string(),
    role: z.enum(['STUDENT', 'TEACHER']),
    className: z.preprocess(
      (value) => (value === '' || value === null || value === undefined ? null : value),
      z
        .string()
        .regex(/^[6-9]A[0-9]+$/, 'Lớp phải theo định dạng 6A1 đến 9A...')
        .nullable(),
    ),
    specialization: z.preprocess(
      (value) => (value === '' || value === null || value === undefined ? null : value),
      z.enum(userService.specializations).nullable(),
    ),
    gender: z.preprocess(
      (value) => (value === '' || value === null || value === undefined ? null : value),
      z.enum(['Nam', 'Nữ']).nullable(),
    ),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Mật khẩu xác nhận không khớp.',
      });
    if (value.role === 'STUDENT' && !value.className)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['className'],
        message: 'Học sinh phải có lớp.',
      });
    if (value.role === 'STUDENT' && value.specialization)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['specialization'],
        message: 'Chỉ giáo viên mới có tổ chuyên môn.',
      });
    if (value.role === 'TEACHER' && !value.specialization)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['specialization'],
        message: 'Giáo viên phải có tổ chuyên môn.',
      });
    if (value.role === 'TEACHER' && value.className)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['className'],
        message: 'Chỉ học sinh mới có lớp.',
      });
  });

function registrationError(res, error) {
  if (error?.code === 'DUPLICATE_USER' || error?.code === '23505')
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_USER',
        message:
          error.code === 'DUPLICATE_USER' ? error.message : 'Username hoặc email đã được sử dụng.',
      },
    });
  throw error;
}

router.post('/register', async (req, res, next) => {
  try {
    const result = registerSchema.safeParse(req.body || {});
    if (!result.success)
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: result.error.issues[0].message,
          field: result.error.issues[0].path[0],
        },
      });
    const user = await userService.createUser({
      ...result.data,
      className: result.data.role === 'STUDENT' ? result.data.className : null,
      specialization: result.data.role === 'TEACHER' ? result.data.specialization : null,
      avatarUrl: null,
      bio: null,
      isActive: true,
    });
    const achievementEvents = await evaluateUser(user.id);
    const refreshedUser = await get('SELECT * FROM users WHERE id=?', [user.id]);
    req.session.user = publicUser(refreshedUser);
    return res.status(201).json({ data: { ...req.session.user, achievementEvents } });
  } catch (error) {
    try {
      return registrationError(res, error);
    } catch (unhandled) {
      next(unhandled);
    }
  }
});
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user || !user.is_active || !(await bcrypt.compare(password || '', user.password_hash)))
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu không đúng' },
      });
    const achievementEvents = await evaluateUser(user.id);
    const refreshedUser = await get('SELECT * FROM users WHERE id=?', [user.id]);
    req.session.user = publicUser(refreshedUser);
    res.json({ data: { ...req.session.user, achievementEvents } });
  } catch (e) {
    next(e);
  }
});
router.get('/me', (req, res) => res.json({ data: req.session.user || null }));
router.post('/logout', (req, res, next) =>
  req.session.destroy((error) =>
    error ? next(error) : res.clearCookie('connect.sid').json({ data: null }),
  ),
);
module.exports = router;
module.exports.registerSchema = registerSchema;
