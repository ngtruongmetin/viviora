const express = require('express');
const { z } = require('zod');
const { requireRole } = require('../middlewares/auth');
const userService = require('../services/adminUserService');

const router = express.Router();
router.use(requireRole('ADMIN'));

const roleSchema = z.enum(['ADMIN', 'STUDENT', 'TEACHER']);
const genderSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? null : value),
  z.enum(['Nam', 'Nữ']).nullable(),
);
const classSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? null : value),
  z
    .string()
    .regex(/^[6-9]A[0-9]+$/, 'Lớp phải theo định dạng 6A1 đến 9A...')
    .nullable(),
);
const specializationSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? null : value),
  z.enum(userService.specializations).nullable(),
);
const commonSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Họ và tên là bắt buộc.')
    .max(120, 'Họ và tên không được quá 120 ký tự.'),
  username: z
    .string()
    .trim()
    .min(3, 'Username phải có ít nhất 3 ký tự.')
    .max(80, 'Username không được quá 80 ký tự.')
    .regex(
      /^[A-Za-z0-9._-]+$/,
      'Username chỉ được chứa chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.',
    ),
  email: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : value),
    z.string().trim().email('Email không hợp lệ.').max(320).nullable(),
  ),
  role: roleSchema,
  gender: genderSchema,
  className: classSchema,
  specialization: specializationSchema,
  avatarUrl: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : value),
    z.string().trim().url('Avatar URL không hợp lệ.').max(500).nullable(),
  ),
  bio: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : value),
    z.string().trim().max(1000).nullable(),
  ),
  isActive: z.boolean().default(true),
});
const createSchema = commonSchema.extend({
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.').max(200, 'Mật khẩu quá dài.'),
});
const updateSchema = commonSchema.omit({ username: true }).extend({
  password: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : value),
    z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.').max(200).nullable(),
  ),
});

function validateRoleSpecific(data) {
  if (data.role === 'STUDENT' && !data.className) return 'Học sinh phải có lớp.';
  if (data.role !== 'STUDENT' && data.className) return 'Chỉ học sinh mới có lớp.';
  if (data.role === 'TEACHER' && !data.specialization) return 'Giáo viên phải có tổ chuyên môn.';
  if (data.role !== 'TEACHER' && data.specialization) return 'Chỉ giáo viên mới có tổ chuyên môn.';
  return null;
}

function parseError(res, result) {
  return res
    .status(400)
    .json({ error: { code: 'VALIDATION_ERROR', message: result.error.issues[0].message } });
}

function handleDatabaseError(res, error) {
  if (error?.code === 'DUPLICATE_USER')
    return res.status(409).json({ error: { code: error.code, message: error.message } });
  if (error?.code === '23505')
    return res
      .status(409)
      .json({ error: { code: 'DUPLICATE_USER', message: 'Username hoặc email đã được sử dụng.' } });
  throw error;
}

router.get('/', async (req, res, next) => {
  try {
    res.json(await userService.listUsers(req.query));
  } catch (error) {
    next(error);
  }
});

router.get('/:userId', async (req, res, next) => {
  try {
    const user = await userService.getUser(req.params.userId);
    if (!user)
      return res
        .status(404)
        .json({ error: { code: 'USER_NOT_FOUND', message: 'Không tìm thấy thành viên.' } });
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = createSchema.safeParse(req.body || {});
    if (!result.success) return parseError(res, result);
    const roleError = validateRoleSpecific(result.data);
    if (roleError)
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: roleError } });
    const user = await userService.createUser({
      ...result.data,
      className: result.data.role === 'STUDENT' ? result.data.className : null,
      specialization: result.data.role === 'TEACHER' ? result.data.specialization : null,
    });
    return res.status(201).json({ data: user });
  } catch (error) {
    try {
      return handleDatabaseError(res, error);
    } catch (unhandled) {
      next(unhandled);
    }
  }
});

router.patch('/:userId', async (req, res, next) => {
  try {
    const result = updateSchema.safeParse(req.body || {});
    if (!result.success) return parseError(res, result);
    const roleError = validateRoleSpecific(result.data);
    if (roleError)
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: roleError } });
    if (
      req.params.userId === req.session.user.id &&
      (result.data.role !== 'ADMIN' || !result.data.isActive)
    )
      return res.status(400).json({
        error: {
          code: 'SELF_LOCKOUT',
          message: 'Không thể hạ quyền hoặc vô hiệu hóa tài khoản đang đăng nhập.',
        },
      });
    const current = await userService.getUser(req.params.userId);
    if (!current)
      return res
        .status(404)
        .json({ error: { code: 'USER_NOT_FOUND', message: 'Không tìm thấy thành viên.' } });
    const user = await userService.updateUser(req.params.userId, {
      ...result.data,
      className: result.data.role === 'STUDENT' ? result.data.className : null,
      specialization: result.data.role === 'TEACHER' ? result.data.specialization : null,
    });
    if (!user)
      return res
        .status(404)
        .json({ error: { code: 'USER_NOT_FOUND', message: 'Không tìm thấy thành viên.' } });
    res.json({ data: user });
  } catch (error) {
    try {
      return handleDatabaseError(res, error);
    } catch (unhandled) {
      next(unhandled);
    }
  }
});

router.delete('/:userId', async (req, res, next) => {
  try {
    const result = await userService.deleteUser(req.params.userId, req.session.user.id);
    if (!result)
      return res
        .status(404)
        .json({ error: { code: 'USER_NOT_FOUND', message: 'Không tìm thấy thành viên.' } });
    if (result.error === 'SELF_DELETE')
      return res.status(400).json({
        error: { code: result.error, message: 'Không thể tự xóa tài khoản đang đăng nhập.' },
      });
    if (result.error === 'LAST_ADMIN')
      return res.status(400).json({
        error: { code: result.error, message: 'Không thể xóa ADMIN cuối cùng của hệ thống.' },
      });
    if (result.error === 'HAS_REFERENCES')
      return res.status(409).json({
        error: {
          code: result.error,
          message: 'Thành viên đã có dữ liệu liên quan. Hãy vô hiệu hóa tài khoản thay vì xóa.',
        },
      });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
