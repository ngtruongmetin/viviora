const { all } = require('../database/db');

async function listLeaderboard(limit = 100, weekStart = null) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 100);
  const rows = await all(`
    WITH metrics AS (
      SELECT u.id, u.name, u.username, u.avatar_url,
        COALESCE((SELECT SUM(r.cup_count)::int FROM user_game_rewards r WHERE r.user_id=u.id AND r.week_start=COALESCE(?::date, ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - (EXTRACT(ISODOW FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::int - 1)))), 0)::int AS cups,
        u.exp,
        COALESCE((SELECT COUNT(*)::int FROM posts p WHERE p.author_id=u.id AND p.status='APPROVED' AND p.type='BOOK_REVIEW'), 0)::int AS book_reviews,
        COALESCE((SELECT COUNT(*)::int FROM posts p WHERE p.author_id=u.id AND p.status='APPROVED' AND p.type='TEXT'), 0)::int AS regular_posts
      FROM users u
      WHERE u.is_active=true
    ), ranked AS (
      SELECT metrics.*, COALESCE((SELECT MAX(l.level) FROM levels l WHERE l.required_exp <= metrics.exp), 1)::int AS level
      FROM metrics
      WHERE metrics.cups > 0 OR metrics.book_reviews > 0 OR metrics.regular_posts > 0
    )
    SELECT ranked.*, RANK() OVER (ORDER BY cups DESC, level DESC, book_reviews DESC, regular_posts DESC)::int AS rank
    FROM ranked
    ORDER BY cups DESC, level DESC, book_reviews DESC, regular_posts DESC, lower(name), id
    LIMIT ?`, [weekStart, safeLimit]);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    avatar_url: row.avatar_url,
    cups: Number(row.cups),
    exp: Number(row.exp),
    level: Number(row.level),
    book_reviews: Number(row.book_reviews),
    regular_posts: Number(row.regular_posts),
    rank: Number(row.rank),
  }));
}

async function listWeeks() {
  return all(`SELECT week_start, (week_start + 6) AS week_end FROM user_game_rewards GROUP BY week_start ORDER BY week_start DESC`);
}

module.exports = { listLeaderboard, listWeeks };
