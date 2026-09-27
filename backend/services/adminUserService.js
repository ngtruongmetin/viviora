const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { all, get, pool } = require('../database/db');

const roles = ['ADMIN', 'STUDENT', 'TEACHER'];
const specializations = [
  'Toán',
  'Ngữ Văn',
  'Tiếng Anh',
  'Khoa học tự nhiên - Công nghệ',
  'Lịch sử - Địa lí',
  'Giáo dục công dân',
  'Nghệ thuật - Giáo dục thể chất',
  'Văn phòng',
];

function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function publicUser(user) {
  if (!user) return null;
  return {
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
    is_active: user.is_active,
    created_at: user.created_at,
  };
}

async function listUsers({ page = 1, limit = 20, search = '', role = '', status = '' } = {}) {
  const safePage = positiveInteger(page, 1, 1000000);
  const safeLimit = positiveInteger(limit, 20, 50);
  const offset = (safePage - 1) * safeLimit;
  const cleanSearch = typeof search === 'string' ? search.trim().slice(0, 120) : '';
  const cleanRole = roles.includes(role) ? role : '';
  const activeStatus = status === 'active' ? true : status === 'inactive' ? false : null;
  const clauses = [];
  const params = [];
  if (cleanSearch) {
    clauses.push("(u.name ILIKE ? OR u.username ILIKE ? OR coalesce(u.email, '') ILIKE ?)");
    params.push(`%${cleanSearch}%`, `%${cleanSearch}%`, `%${cleanSearch}%`);
  }
  if (cleanRole) {
    clauses.push('u.role=?');
    params.push(cleanRole);
  }
  if (activeStatus !== null) {
    clauses.push('u.is_active=?');
    params.push(activeStatus);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const count = await get(`SELECT COUNT(*)::int AS count FROM users u ${where}`, params);
  const statistics = await get(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE is_active)::int AS active,
      COUNT(*) FILTER (WHERE role='STUDENT')::int AS students,
      COUNT(*) FILTER (WHERE role='TEACHER')::int AS teachers,
      COUNT(*) FILTER (WHERE role='ADMIN')::int AS admins
    FROM users`);
  const items = await all(
    `SELECT id, username, name, email, role, class_name, gender, specialization,
            avatar_url, bio, is_active, created_at
     FROM users u ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset],
  );
  return {
    items: items.map(publicUser),
    pagination: { page: safePage, limit: safeLimit, total: Number(count.count) },
    statistics: {
      total: Number(statistics.total || 0),
      active: Number(statistics.active || 0),
      students: Number(statistics.students || 0),
      teachers: Number(statistics.teachers || 0),
      admins: Number(statistics.admins || 0),
    },
  };
}

async function getUser(userId) {
  return publicUser(
    await get(
      `SELECT id, username, name, email, role, class_name, gender, specialization,
            avatar_url, bio, is_active, created_at
     FROM users WHERE id=?`,
      [userId],
    ),
  );
}

async function createUser(fields) {
  const duplicate = await findDuplicateIdentity({ username: fields.username, email: fields.email });
  if (duplicate) {
    const error = new Error(
      duplicate === 'username' ? 'Username đã được sử dụng.' : 'Email đã được sử dụng.',
    );
    error.code = 'DUPLICATE_USER';
    throw error;
  }
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(fields.password, 12);
  await pool.query(
    `INSERT INTO users(
      id, username, name, email, password_hash, role, class_name, gender,
      specialization, avatar_url, bio, is_active
    ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      id,
      fields.username,
      fields.name,
      fields.email,
      passwordHash,
      fields.role,
      fields.className,
      fields.gender,
      fields.specialization,
      fields.avatarUrl,
      fields.bio,
      fields.isActive,
    ],
  );
  return getUser(id);
}

async function updateUser(userId, fields) {
  const duplicate = await findDuplicateIdentity({ email: fields.email, excludeUserId: userId });
  if (duplicate) {
    const error = new Error('Email đã được sử dụng.');
    error.code = 'DUPLICATE_USER';
    throw error;
  }
  const updates = [
    'name=$1',
    'email=$2',
    'role=$3',
    'class_name=$4',
    'gender=$5',
    'specialization=$6',
    'avatar_url=$7',
    'bio=$8',
    'is_active=$9',
  ];
  const params = [
    fields.name,
    fields.email,
    fields.role,
    fields.className,
    fields.gender,
    fields.specialization,
    fields.avatarUrl,
    fields.bio,
    fields.isActive,
  ];
  if (fields.password) {
    updates.push('password_hash=$10');
    params.push(await bcrypt.hash(fields.password, 12));
  }
  params.push(userId);
  const result = await pool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id=$${params.length} RETURNING id`,
    params,
  );
  return result.rowCount ? getUser(userId) : null;
}

async function findDuplicateIdentity({ username, email, excludeUserId = null }) {
  const clauses = [];
  const params = [];
  if (username) {
    clauses.push('username=?');
    params.push(username);
  }
  if (email) {
    clauses.push('email=?');
    params.push(email);
  }
  if (!clauses.length) return null;
  const user = await get(
    `SELECT id, username, email FROM users WHERE (${clauses.join(' OR ')})${excludeUserId ? ' AND id<>?' : ''} LIMIT 1`,
    excludeUserId ? [...params, excludeUserId] : params,
  );
  if (!user) return null;
  return username && user.username === username ? 'username' : 'email';
}

async function deleteUser(userId, requesterId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (userId === requesterId) {
      await client.query('ROLLBACK');
      return { error: 'SELF_DELETE' };
    }
    const userResult = await client.query('SELECT id, role FROM users WHERE id=$1 FOR UPDATE', [
      userId,
    ]);
    if (!userResult.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }
    if (userResult.rows[0].role === 'ADMIN') {
      const adminCount = await client.query(
        "SELECT COUNT(*)::int AS count FROM users WHERE role='ADMIN' AND is_active=true",
      );
      if (Number(adminCount.rows[0].count) <= 1) {
        await client.query('ROLLBACK');
        return { error: 'LAST_ADMIN' };
      }
    }
    const references = await client.query(
      `SELECT
        (SELECT COUNT(*) FROM posts WHERE author_id=$1) AS posts,
        (SELECT COUNT(*) FROM comments WHERE author_id=$1) AS comments,
        (SELECT COUNT(*) FROM reactions WHERE user_id=$1) AS reactions,
        (SELECT COUNT(*) FROM poll_votes WHERE user_id=$1) AS poll_votes,
        (SELECT COUNT(*) FROM notifications WHERE user_id=$1) AS notifications,
        (SELECT COUNT(*) FROM reading_progress WHERE user_id=$1) AS reading_progress,
        (SELECT COUNT(*) FROM user_achievements WHERE user_id=$1) AS achievements`,
      [userId],
    );
    const hasReferences = Object.values(references.rows[0]).some((value) => Number(value) > 0);
    if (hasReferences) {
      await client.query('ROLLBACK');
      return { error: 'HAS_REFERENCES' };
    }
    await client.query('DELETE FROM users WHERE id=$1', [userId]);
    await client.query('COMMIT');
    return { deleted: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  publicUser,
  roles,
  specializations,
  updateUser,
};
