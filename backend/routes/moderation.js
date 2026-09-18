const express = require('express');
const crypto = require('node:crypto');
const { all, pool } = require('../database/db');
const { recordActivity } = require('../services/activityService');
const { requireRole } = require('../middlewares/auth');
const { evaluateUser } = require('../services/achievementService');
const router = express.Router();
router.use(requireRole('TEACHER', 'ADMIN'));
router.get('/', async (req, res, next) => {
  try {
    const requestedStatus = String(req.query.status || 'PENDING').toUpperCase();
    const status = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'].includes(requestedStatus) ? requestedStatus : 'PENDING';
    const statusWhere = status === 'ALL' ? '' : `WHERE p.status='${status}'`;
    const [items, stats] = await Promise.all([
      all(
        `SELECT p.*, m.status AS moderation_status, m.reviewed_at, reviewer.name AS reviewer_name,
                u.id AS author_id, u.name, u.role, u.class_name AS class_name,
                u.specialization, u.avatar_url,
                plb.book_id, plb.book_title AS book_title, plb.book_author AS book_author,
                plb.book_cover_url AS book_cover_url, plb.book_category AS book_category,
                COALESCE((SELECT json_agg(json_build_object('id', pm.id, 'url', pm.url, 'kind', pm.kind, 'alt', pm.alt) ORDER BY pm.id)
                          FROM post_media pm WHERE pm.post_id=p.id), '[]'::json) AS media
         FROM posts p JOIN users u ON u.id=p.author_id
         LEFT JOIN post_library_books plb ON plb.post_id=p.id
         LEFT JOIN moderation m ON m.post_id=p.id
         LEFT JOIN users reviewer ON reviewer.id=m.reviewer_id
         ${statusWhere} ORDER BY p.updated_at DESC, p.created_at DESC`,
      ),
      getModerationStats(),
    ]);
    res.json({ items, stats });
  } catch (e) {
    next(e);
  }
});

async function getModerationStats() {
  return (
    (await require('../database/db').get(`
    SELECT
      COUNT(*) FILTER (WHERE status='PENDING')::int AS pending,
      COUNT(*) FILTER (WHERE status='APPROVED')::int AS approved,
      COUNT(*) FILTER (WHERE status='REJECTED')::int AS rejected
    FROM posts`)) || { pending: 0, approved: 0, rejected: 0 }
  );
}
router.patch('/:postId', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const status = req.body.status;
    if (!['APPROVED', 'REJECTED'].includes(status))
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: 'Trạng thái không hợp lệ' } });
    await client.query('BEGIN');
    const updated = await client.query(
      "UPDATE posts SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND status='PENDING' RETURNING id, author_id",
      [status, req.params.postId],
    );
    if (!updated.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: { code: 'PENDING_POST_NOT_FOUND', message: 'Không tìm thấy bài đang chờ duyệt.' },
      });
    }
    await client.query('UPDATE moderation SET status=$1,reviewer_id=$2,reviewed_at=CURRENT_TIMESTAMP WHERE post_id=$3', [
      status,
      req.session.user.id,
      req.params.postId,
    ]);
    if (req.body.feedback)
      await client.query(
        'INSERT INTO moderation_feedback(id,moderation_id,author_id,content) SELECT $1,id,$2,$3 FROM moderation WHERE post_id=$4',
        [crypto.randomUUID(), req.session.user.id, req.body.feedback, req.params.postId],
      );
    await recordActivity(client, {
      userId: req.session.user.id,
      type: 'MODERATION_REVIEWED',
      metadata: { postId: req.params.postId, status },
    });
    await client.query('COMMIT');
    const achievementEvents = await evaluateUser(updated.rows[0].author_id);
    res.json({ ok: true, status, achievementEvents });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(e);
  } finally {
    client.release();
  }
});
module.exports = router;
