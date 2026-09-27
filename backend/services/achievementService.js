const crypto = require('node:crypto');
const { all, get, pool } = require('../database/db');

// One aggregate context is shared by every evaluator. Definitions stay data-driven;
// unsupported achievements remain visible but do not claim progress from guessed data.
const achievementRegistry = {
  ACH_001: { target: 1, evaluate: () => 1 },
  ACH_002: { target: 10, evaluate: (c) => c.distinctBooks },
  ACH_003: { target: 10, evaluate: (c) => c.distinctCategories },
  ACH_004: { target: 5, evaluate: (c) => c.distinctCategories },
  ACH_005: { target: 10, evaluate: (c) => c.distinctCategories },
  ACH_006: { target: 20, evaluate: (c) => c.distinctAuthors },
  ACH_007: { target: 10, evaluate: (c) => c.searchedBooks },
  ACH_008: { target: 10, evaluate: (c) => c.favoriteBooks },
  ACH_009: { target: 20, evaluate: (c) => c.favoriteBooks },
  ACH_010: { target: 5, evaluate: (c) => c.favoriteCategories },
  ACH_012: { target: 10, evaluate: (c) => c.bookmarkedBooks },
  ACH_026: { target: 10, evaluate: (c) => c.claimedWeeklyMissions },
  ACH_027: { target: 20, evaluate: (c) => c.claimedWeeklyMissions },
  ACH_028: { target: 50, evaluate: (c) => c.claimedWeeklyMissions },
  ACH_013: { target: 1, evaluate: (c) => c.posts },
  ACH_014: { target: 5, evaluate: (c) => c.posts },
  ACH_015: { target: 10, evaluate: (c) => c.posts },
  ACH_016: { target: 5, evaluate: (c) => c.reviews },
  ACH_017: { target: 10, evaluate: (c) => c.reviews },
  ACH_018: { target: 10, evaluate: (c) => c.likedPosts },
  ACH_019: { target: 10, evaluate: (c) => c.likedPosts },
  ACH_021: { target: 10, evaluate: (c) => c.comments },
  ACH_032: { target: 1, evaluate: (c) => c.completedGames },
  ACH_033: { target: 1, evaluate: (c) => c.correctAnswers },
  ACH_034: { target: 10, evaluate: (c) => c.correctAnswers },
  ACH_035: { target: 100, evaluate: (c) => c.correctAnswers },
  ACH_036: { target: 500, evaluate: (c) => c.correctAnswers },
  ACH_040: { target: 1000, evaluate: (c) => c.exp },
  ACH_041: { target: 5000, evaluate: (c) => c.exp },
  ACH_042: { target: 10000, evaluate: (c) => c.exp },
  ACH_043: { target: 10, evaluate: (c) => c.completedGames },
  ACH_044: { target: 50, evaluate: (c) => c.completedGames },
  ACH_055: { target: 1, evaluate: (c) => (c.completedAllAchievements ? 1 : 0) },
};

async function buildEvaluationContext(userId, db = { get }) {
  const row = await db.get(
    `SELECT
    (SELECT exp FROM users WHERE id=$1)::int AS exp,
    (SELECT COUNT(DISTINCT rp.book_id) FROM reading_progress rp WHERE rp.user_id=$1)::int AS distinct_books,
    (SELECT COUNT(DISTINCT NULLIF(BTRIM(b.category), '')) FROM reading_progress rp JOIN books b ON b.id=rp.book_id WHERE rp.user_id=$1)::int AS distinct_categories,
    (SELECT COUNT(DISTINCT NULLIF(BTRIM(b.author), '')) FROM reading_progress rp JOIN books b ON b.id=rp.book_id WHERE rp.user_id=$1)::int AS distinct_authors,
    (SELECT COUNT(DISTINCT book_id) FROM user_favorite_books WHERE user_id=$1)::int AS favorite_books,
    (SELECT COUNT(DISTINCT ub.book_id) FROM user_bookmarks ub WHERE ub.user_id=$1)::int AS bookmarked_books,
    (SELECT COUNT(DISTINCT NULLIF(BTRIM(b.category), '')) FROM user_favorite_books uf JOIN books b ON b.id=uf.book_id WHERE uf.user_id=$1)::int AS favorite_categories,
    (SELECT COUNT(DISTINCT book_id) FROM user_book_searches WHERE user_id=$1)::int AS searched_books,
    (SELECT COUNT(*) FROM weekly_mission_rewards WHERE user_id=$1)::int AS claimed_weekly_missions,
    (SELECT COUNT(*) FROM achievements a WHERE a.is_supported=true AND a.code <> 'ACH_055' AND NOT EXISTS (SELECT 1 FROM user_achievements ua WHERE ua.user_id=$1 AND ua.achievement_id=a.id))::int AS remaining_achievements,
    (SELECT COUNT(*) FROM posts WHERE author_id=$1 AND status='APPROVED')::int AS posts,
    (SELECT COUNT(*) FROM posts WHERE author_id=$1 AND type='BOOK_REVIEW' AND status='APPROVED')::int AS reviews,
    (SELECT COUNT(*) FROM posts p JOIN reactions r ON r.post_id=p.id WHERE p.author_id=$1 AND p.status='APPROVED')::int AS liked_posts,
    (SELECT COUNT(*) FROM comments WHERE author_id=$1)::int AS comments,
    (SELECT COUNT(*) FROM game_sessions WHERE user_id=$1 AND completed_at IS NOT NULL)::int AS completed_games,
    (SELECT COUNT(*) FROM game_session_questions gsq JOIN game_sessions gs ON gs.id=gsq.session_id WHERE gs.user_id=$1 AND gsq.is_correct=true)::int AS correct_answers`,
    [userId],
  );
  return {
    exp: Number(row?.exp || 0),
    distinctBooks: Number(row?.distinct_books || 0),
    distinctCategories: Number(row?.distinct_categories || 0),
    distinctAuthors: Number(row?.distinct_authors || 0),
    favoriteBooks: Number(row?.favorite_books || 0),
    bookmarkedBooks: Number(row?.bookmarked_books || 0),
    favoriteCategories: Number(row?.favorite_categories || 0),
    searchedBooks: Number(row?.searched_books || 0),
    claimedWeeklyMissions: Number(row?.claimed_weekly_missions || 0),
    posts: Number(row?.posts || 0),
    reviews: Number(row?.reviews || 0),
    likedPosts: Number(row?.liked_posts || 0),
    comments: Number(row?.comments || 0),
    completedGames: Number(row?.completed_games || 0),
    correctAnswers: Number(row?.correct_answers || 0),
    completedAllAchievements: Number(row?.remaining_achievements || 0) === 0,
  };
}

async function auditAchievements() {
  const definitions = await all(
    'SELECT code, is_supported, condition_text FROM achievements ORDER BY sort_order, code',
  );
  const db = new Map(definitions.map((item) => [item.code, item]));
  const registryCodes = Object.keys(achievementRegistry);
  return {
    supported: definitions
      .filter((item) => item.is_supported && achievementRegistry[item.code])
      .map((item) => item.code),
    unsupported: definitions.filter((item) => !item.is_supported).map((item) => item.code),
    registryOnly: registryCodes.filter((code) => !db.has(code)),
    databaseOnly: definitions
      .filter((item) => !achievementRegistry[item.code])
      .map((item) => item.code),
    mismatched: definitions
      .filter((item) => item.is_supported !== Boolean(achievementRegistry[item.code]))
      .map((item) => item.code),
  };
}

function evaluateDefinition(definition, context) {
  const evaluator = achievementRegistry[definition.code];
  if (!evaluator) return { current: null, target: null, supported: false };
  const current = Math.max(0, Number(evaluator.evaluate(context) || 0));
  return { current, target: evaluator.target, supported: true };
}

async function getAchievementStates(userId, context = null) {
  const [definitions, stats] = await Promise.all([
    all('SELECT * FROM achievements ORDER BY sort_order, code'),
    context ? Promise.resolve(context) : buildEvaluationContext(userId),
  ]);
  const unlocked = await all(
    `SELECT achievement_id, unlocked_at, exp_awarded, progress FROM user_achievements WHERE user_id=?`,
    [userId],
  );
  const stateById = new Map(unlocked.map((item) => [item.achievement_id, item]));
  return definitions.map((definition) => {
    const result = evaluateDefinition(definition, stats);
    const state = stateById.get(definition.id);
    const current = result.current === null ? null : Math.min(result.current, result.target);
    return {
      ...definition,
      unlocked: Boolean(state),
      unlocked_at: state?.unlocked_at || null,
      progress_current: current,
      progress_target: result.target,
      progress_percent:
        current === null || !result.target
          ? null
          : Math.min(100, Math.round((current / result.target) * 100)),
      progress: state?.progress ?? current,
      exp_awwarded: Number(state?.exp_awarded || 0),
    };
  });
}

async function evaluateUser(userId) {
  const before = await get(
    `SELECT COALESCE((SELECT MAX(l.level) FROM levels l WHERE l.required_exp <= users.exp), 1)::int AS level FROM users WHERE users.id=?`,
    [userId],
  );
  const context = await buildEvaluationContext(userId);
  const definitions = await all(
    'SELECT * FROM achievements WHERE is_supported=true ORDER BY sort_order, code',
  );
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const unlocked = [];
    for (const definition of definitions) {
      const result = evaluateDefinition(definition, context);
      if (result.current === null) continue;
      if (result.current < result.target) continue;
      const inserted = await client.query(
        `INSERT INTO user_achievements(id,user_id,achievement_id,progress,exp_awarded)
        VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(user_id,achievement_id) DO UPDATE SET progress=EXCLUDED.progress, updated_at=CURRENT_TIMESTAMP
        RETURNING id, (xmax = 0) AS created`,
        [crypto.randomUUID(), userId, definition.id, result.current, definition.exp_reward],
      );
      const row = inserted.rows[0];
      if (row?.created && result.current >= result.target) {
        await client.query('UPDATE users SET exp=exp+$1 WHERE id=$2', [
          definition.exp_reward,
          userId,
        ]);
        context.exp += Number(definition.exp_reward || 0);
        unlocked.push({
          code: definition.code,
          name: definition.name,
          condition_text: definition.condition_text,
          exp_reward: Number(definition.exp_reward),
        });
      }
    }
    await client.query('COMMIT');
    const after = await get(
      `SELECT users.exp,
      COALESCE((SELECT MAX(l.level) FROM levels l WHERE l.required_exp <= users.exp), 1)::int AS level,
      COALESCE((SELECT MAX(l.required_exp) FROM levels l WHERE l.required_exp <= users.exp), 0)::int AS current_level_exp,
      (SELECT MIN(l.required_exp) FROM levels l WHERE l.required_exp > users.exp) AS next_level_exp
      FROM users WHERE users.id=?`,
      [userId],
    );
    return {
      unlocked,
      exp: Number(after?.exp || 0),
      currentLevelExp: Number(after?.current_level_exp || 0),
      nextLevelExp: after?.next_level_exp == null ? null : Number(after.next_level_exp),
      previousLevel: Number(before?.level || 1),
      currentLevel: Number(after?.level || 1),
      leveledUp: Number(after?.level || 1) > Number(before?.level || 1),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function recalculateUserAchievements(userId) {
  return evaluateUser(userId);
}

async function resetAllProgress() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_achievements');
    await client.query('UPDATE users SET exp=0');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getUserAchievements(userId) {
  return (await getAchievementStates(userId)).filter((item) => item.unlocked);
}
async function getUserAchievementProgress(userId) {
  return getAchievementStates(userId);
}

module.exports = {
  achievementRegistry,
  buildEvaluationContext,
  evaluateDefinition,
  evaluateUser,
  recalculateUserAchievements,
  getUserAchievements,
  getUserAchievementProgress,
  resetAllProgress,
  auditAchievements,
};
