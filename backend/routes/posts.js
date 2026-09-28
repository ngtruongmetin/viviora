const express = require('express');
const crypto = require('node:crypto');
const { z } = require('zod');
const { all, get, pool } = require('../database/db');
const { requireLogin } = require('../middlewares/auth');
const { recordActivity } = require('../services/activityService');
const { listPosts } = require('../services/communityService');
const { evaluateUser } = require('../services/achievementService');

const router = express.Router();
const postTypes = ['TEXT', 'BOOK_REVIEW', 'GAME_REVIEW', 'VIDEO_REVIEW', 'POLL', 'ACHIEVEMENT'];
const createSchema = z.object({
  type: z.enum(postTypes).default('TEXT'),
  title: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.string().trim().max(300).nullable(),
  ),
  content: z
    .string()
    .trim()
    .min(1, 'Nội dung bài đăng không được để trống.')
    .max(5000, 'Nội dung bài đăng không hợp lệ.'),
  bookId: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.string().uuid('Sách được chọn không hợp lệ.').nullable(),
  ),
  gameId: z.preprocess((value) => (value === '' || value === undefined ? null : value), z.string().uuid('Game không hợp lệ.').nullable()),
  question: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.string().trim().max(500).nullable(),
  ),
  options: z.array(z.string().trim().min(1).max(200)).max(4).optional().default([]),
});
const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Bình luận không được để trống.')
    .max(2000, 'Bình luận quá dài.'),
  parentId: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.string().uuid().nullable(),
  ),
});

router.post('/', requireLogin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const parsed = createSchema.safeParse(req.body || {});
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
    const data = parsed.data;
    if (data.type === 'BOOK_REVIEW' && !data.bookId)
      return res.status(400).json({
        error: { code: 'BOOK_REQUIRED', message: 'Đánh giá sách phải gắn với một đầu sách.' },
      });
    if (data.type !== 'BOOK_REVIEW' && data.bookId)
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Chỉ bài đánh giá sách mới có thể gắn đầu sách.',
        },
      });
    if (data.type === 'GAME_REVIEW' && !data.gameId) return res.status(400).json({ error: { code: 'GAME_REQUIRED', message: 'Đánh giá game phải gắn với một game.' } });
    if (data.type !== 'GAME_REVIEW' && data.gameId) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Chỉ bài đánh giá game mới có thể gắn game.' } });
    if (data.type === 'POLL' && (!data.question || data.options.length < 2))
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bình chọn cần câu hỏi và ít nhất hai lựa chọn.',
        },
      });

    await client.query('BEGIN');
    let book = null;
    let game = null;
    if (data.type === 'BOOK_REVIEW') {
      const result = await client.query(
        'SELECT id, title, author, cover_url, category FROM books WHERE id=$1',
        [data.bookId],
      );
      book = result.rows[0] || null;
      if (!book) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: { code: 'BOOK_NOT_FOUND', message: 'Không tìm thấy đầu sách để đánh giá.' },
        });
      }
    }
    if (data.type === 'GAME_REVIEW') {
      const result = await client.query(`SELECT g.id, g.title, g.question_type, g.question_count, g.reward_cups, b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover_url FROM games g JOIN books b ON b.id=g.book_id WHERE g.id=$1`, [data.gameId]);
      game = result.rows[0] || null;
      if (!game) { await client.query('ROLLBACK'); return res.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: 'Không tìm thấy game để đánh giá.' } }); }
    }
    const id = crypto.randomUUID();
    const pending = req.session.user.role === 'STUDENT';
    await client.query(
      'INSERT INTO posts(id, author_id, type, status, title, content) VALUES($1,$2,$3,$4,$5,$6)',
      [
        id,
        req.session.user.id,
        data.type,
        pending ? 'PENDING' : 'APPROVED',
        data.title,
        data.content,
      ],
    );
    if (book)
      await client.query(
        'INSERT INTO post_library_books(post_id, book_id, book_title, book_author, book_cover_url, book_category) VALUES($1,$2,$3,$4,$5,$6)',
        [id, book.id, book.title, book.author, book.cover_url, book.category],
      );
    if (game) await client.query('INSERT INTO post_games(post_id, game_id, game_title, question_type, question_count, reward_cups, book_title, book_author, book_cover_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id, game.id, game.title, game.question_type, game.question_count, game.reward_cups, game.book_title, game.book_author, game.book_cover_url]);
    if (data.type === 'POLL') {
      const pollId = crypto.randomUUID();
      await client.query('INSERT INTO polls(id, post_id, question) VALUES($1,$2,$3)', [
        pollId,
        id,
        data.question,
      ]);
      for (const [position, label] of data.options.entries())
        await client.query(
          'INSERT INTO poll_options(id, poll_id, label, position) VALUES($1,$2,$3,$4)',
          [crypto.randomUUID(), pollId, label, position],
        );
    }
    if (pending)
      await client.query('INSERT INTO moderation(id, post_id, status) VALUES($1,$2,$3)', [
        crypto.randomUUID(),
        id,
        'PENDING',
      ]);
    await recordActivity(client, {
      userId: req.session.user.id,
      type: 'POST_CREATED',
      metadata: {
        postId: id,
        postType: data.type,
        status: pending ? 'PENDING' : 'APPROVED',
        bookId: book?.id || null,
      },
    });
    await client.query('COMMIT');
    const achievementEvents = await evaluateUser(req.session.user.id);
    const workflowStatus = pending ? 'PENDING' : 'PUBLISHED';
    const hydrated = pending
      ? null
      : (
          await listPosts({
            viewerId: req.session.user.id,
            authorId: req.session.user.id,
            limit: 20,
          })
        ).items.find((item) => item.id === id) || null;
    res.status(201).json({
      data: {
        id,
        status: pending ? 'PENDING' : 'APPROVED',
        workflowStatus,
        post: hydrated,
        achievementEvents,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(error);
  } finally {
    client.release();
  }
});

router.post('/:id/reactions', requireLogin, async (req, res, next) => {
  try {
    const result = await pool.query(
      `WITH inserted AS (
         INSERT INTO reactions(id, post_id, user_id) VALUES($1, $2, $3)
         ON CONFLICT(post_id, user_id) DO NOTHING RETURNING id
       ), removed AS (
         DELETE FROM reactions WHERE post_id=$2 AND user_id=$3 AND NOT EXISTS (SELECT 1 FROM inserted) RETURNING id
       )
       SELECT EXISTS(SELECT 1 FROM inserted) AS liked`,
      [crypto.randomUUID(), req.params.id, req.session.user.id],
    );
    const count = await get('SELECT COUNT(*)::int AS count FROM reactions WHERE post_id=?', [
      req.params.id,
    ]);
    const achievementEvents = await evaluateUser(req.session.user.id);
    res.json({
      liked: result.rows[0].liked,
      reactionCount: Number(count.count),
      achievementEvents,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/comments', requireLogin, async (req, res, next) => {
  try {
    const items = await all(
      `SELECT c.id, c.content, c.parent_id, c.created_at, u.id AS author_id, u.name, u.role, u.class_name, u.avatar_url
       FROM comments c JOIN users u ON u.id=c.author_id WHERE c.post_id=?
       ORDER BY c.created_at ASC, c.id ASC LIMIT 50`,
      [req.params.id],
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/comments', requireLogin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const parsed = commentSchema.safeParse(req.body || {});
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
    const post = await client.query('SELECT id FROM posts WHERE id=$1', [req.params.id]);
    if (!post.rowCount)
      return res
        .status(404)
        .json({ error: { code: 'POST_NOT_FOUND', message: 'Không tìm thấy bài đăng.' } });
    const id = crypto.randomUUID();
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO comments(id, post_id, author_id, parent_id, content) VALUES($1,$2,$3,$4,$5)',
      [id, req.params.id, req.session.user.id, parsed.data.parentId, parsed.data.content],
    );
    await recordActivity(client, {
      userId: req.session.user.id,
      type: 'COMMENT_CREATED',
      metadata: { postId: req.params.id, commentId: id },
    });
    await client.query('COMMIT');
    const achievementEvents = await evaluateUser(req.session.user.id);
    const comment = await get(
      `SELECT c.id, c.content, c.parent_id, c.created_at, u.id AS author_id, u.name, u.role, u.class_name, u.avatar_url FROM comments c JOIN users u ON u.id=c.author_id WHERE c.id=?`,
      [id],
    );
    res.status(201).json({ data: comment, achievementEvents });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(error);
  } finally {
    client.release();
  }
});

router.delete('/:id', requireLogin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const post = await client.query('SELECT author_id FROM posts WHERE id=$1 FOR UPDATE', [
      req.params.id,
    ]);
    if (!post.rowCount) {
      await client.query('ROLLBACK');
      return res
        .status(404)
        .json({ error: { code: 'POST_NOT_FOUND', message: 'Không tìm thấy bài đăng.' } });
    }
    if (post.rows[0].author_id !== req.session.user.id && req.session.user.role !== 'ADMIN') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Bạn chỉ có thể xóa bài đăng của chính mình.' },
      });
    }
    await client.query('DELETE FROM posts WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
