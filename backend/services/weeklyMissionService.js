const crypto = require('node:crypto');
const { all, get, pool } = require('../database/db');
function weekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}
const targets = {
  1: 3,
  2: 3,
  3: 5,
  4: 3,
  5: 1,
  6: 1,
  7: 5,
  8: 5,
  9: 5,
  10: 3,
  11: 3,
  12: 50,
  13: 5,
};
async function ensureAssignments(userId, start = weekStart()) {
  const existing = await get(
    'SELECT id FROM weekly_mission_assignments WHERE user_id=? AND week_start=?',
    [userId, start],
  );
  if (existing) return;
  const missions = await all(
    'SELECT * FROM weekly_missions WHERE active=true AND mission_no BETWEEN 1 AND 12 ORDER BY mission_no',
  );
  const chosen = missions.sort(() => Math.random() - 0.5).slice(0, 5);
  const master = await get('SELECT * FROM weekly_missions WHERE mission_no=13');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO weekly_mission_assignments(id,user_id,week_start) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
      [crypto.randomUUID(), userId, start],
    );
    for (const m of [...chosen, master])
      await client.query(
        'INSERT INTO user_weekly_missions(id,user_id,week_start,mission_id,progress_target) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [crypto.randomUUID(), userId, start, m.id, targets[m.mission_no] || 1],
      );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
async function progressFor(userId, start, no) {
  if (no === 9) {
    const row = await get(
      `SELECT COALESCE(MAX(reaction_count), 0)::int AS progress
       FROM (
         SELECT p.id, COUNT(r.id)::int AS reaction_count
         FROM posts p LEFT JOIN reactions r ON r.post_id=p.id
         WHERE p.author_id=? AND p.status='APPROVED'
           AND p.created_at >= ?::date AND p.created_at < (?::date + INTERVAL '7 days')
         GROUP BY p.id
       ) post_reactions`,
      [userId, start, start],
    );
    return Number(row?.progress || 0);
  }
  if (no === 10) {
    const row = await get(
      `SELECT COALESCE(MAX(comment_count), 0)::int AS progress
       FROM (
         SELECT p.id, COUNT(c.id)::int AS comment_count
         FROM posts p LEFT JOIN comments c ON c.post_id=p.id
         WHERE p.author_id=? AND p.status='APPROVED'
           AND p.created_at >= ?::date AND p.created_at < (?::date + INTERVAL '7 days')
         GROUP BY p.id
       ) post_comments`,
      [userId, start, start],
    );
    return Number(row?.progress || 0);
  }
  const row = await get(
    `SELECT CASE WHEN ?=1 THEN (SELECT COUNT(DISTINCT book_id) FROM reading_progress WHERE user_id=? AND updated_at::date>=?::date)
    WHEN ?=2 THEN (SELECT COUNT(DISTINCT NULLIF(BTRIM(b.category),'')) FROM reading_progress rp JOIN books b ON b.id=rp.book_id WHERE rp.user_id=? AND rp.updated_at::date>=?::date)
    WHEN ?=3 THEN (SELECT COUNT(*) FROM user_book_searches WHERE user_id=? AND created_at::date>=?::date)
    WHEN ?=4 THEN (SELECT COUNT(*) FROM user_bookmarks WHERE user_id=? AND created_at::date>=?::date)
    WHEN ?=5 THEN (SELECT COUNT(*) FROM posts WHERE author_id=? AND status='APPROVED' AND created_at::date>=?::date)
    WHEN ?=6 THEN (SELECT COUNT(*) FROM posts WHERE author_id=? AND type='BOOK_REVIEW' AND status='APPROVED' AND created_at::date>=?::date)
    WHEN ?=7 THEN (SELECT COUNT(*) FROM comments WHERE author_id=? AND created_at::date>=?::date)
    WHEN ?=11 THEN (SELECT COUNT(*) FROM game_sessions WHERE user_id=? AND completed_at IS NOT NULL AND completed_at::date>=?::date)
    WHEN ?=12 THEN (SELECT COALESCE(SUM(cup_count),0) FROM user_game_rewards WHERE user_id=? AND week_start>=?::date)
    ELSE 0 END AS progress`,
    [
      no,
      userId,
      start,
      no,
      userId,
      start,
      no,
      userId,
      start,
      no,
      userId,
      start,
      no,
      userId,
      start,
      no,
      userId,
      start,
      no,
      userId,
      start,
      no,
      userId,
      start,
      no,
      userId,
      start,
    ],
  );
  return Number(row?.progress || 0);
}
async function list(userId, start = weekStart()) {
  await ensureAssignments(userId, start);
  const rows = await all(
    `SELECT uwm.*, wm.mission_no, wm.name, wm.requirement_text, wm.cup_reward, wm.is_master FROM user_weekly_missions uwm JOIN weekly_missions wm ON wm.id=uwm.mission_id WHERE uwm.user_id=? AND uwm.week_start=? ORDER BY wm.mission_no`,
    [userId, start],
  );
  const claimed = new Set(rows.filter((r) => r.status === 'CLAIMED').map((r) => r.mission_no));
  for (const r of rows) {
    const p = r.is_master ? claimed.size - 1 : await progressFor(userId, start, r.mission_no);
    r.progress_current = Math.max(0, p);
    if (r.status === 'ASSIGNED' && p >= r.progress_target) r.status = 'COMPLETED';
  }
  return { weekStart: start, missions: rows };
}
async function claim(userId, missionId, start = weekStart()) {
  if (start !== weekStart()) throw Object.assign(new Error('MISSION_EXPIRED'), { status: 400 });
  const data = await list(userId, start);
  const m = data.missions.find((x) => x.mission_id === missionId);
  if (!m) throw Object.assign(new Error('MISSION_NOT_FOUND'), { status: 404 });
  if (m.status !== 'COMPLETED')
    throw Object.assign(new Error('MISSION_NOT_COMPLETED'), { status: 400 });
  const client = await pool.connect();
  await client.query('BEGIN');
  try {
    await client.query(
      'INSERT INTO weekly_mission_rewards(id,user_id,mission_id,week_start,cup_count) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
      [crypto.randomUUID(), userId, missionId, start, m.cup_reward],
    );
    await client.query(
      "UPDATE user_weekly_missions SET status='CLAIMED', claimed_at=CURRENT_TIMESTAMP WHERE user_id=$1 AND week_start=$2 AND mission_id=$3",
      [userId, start, missionId],
    );
    await client.query('COMMIT');
    return { ...m, status: 'CLAIMED' };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
module.exports = { weekStart, ensureAssignments, list, claim };
