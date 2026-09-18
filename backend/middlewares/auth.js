const { get } = require('../database/db');

async function currentActiveUser(req) {
  if (!req.session.user?.id) return null;
  return get('SELECT id, role, is_active FROM users WHERE id=?', [req.session.user.id]);
}

async function requireLogin(req, res, next) {
  if (!req.session.user)
    return res
      .status(401)
      .json({ error: { code: 'AUTH_REQUIRED', message: 'Vui lòng đăng nhập' } });
  try {
    const user = await currentActiveUser(req);
    if (!user || !user.is_active) {
      req.session.destroy(() => undefined);
      return res.status(401).json({ error: { code: 'ACCOUNT_INACTIVE', message: 'Tài khoản không còn hoạt động.' } });
    }
    next();
  } catch (error) {
    next(error);
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role))
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Bạn không có quyền thực hiện thao tác này' },
      });
    (async () => {
    try {
      const user = await currentActiveUser(req);
      if (!user || !user.is_active)
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Bạn không có quyền thực hiện thao tác này' },
        });
      next();
    } catch (error) {
      next(error);
    }
    })();
  };
}
module.exports = { requireLogin, requireRole };
