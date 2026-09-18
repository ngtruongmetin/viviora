ALTER TABLE games
  ADD COLUMN IF NOT EXISTS reward_cups INTEGER NOT NULL DEFAULT 1 CHECK (reward_cups >= 0);

ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS cup_earned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS user_game_rewards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  cup_count INTEGER NOT NULL DEFAULT 1 CHECK (cup_count >= 0),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_game_rewards_user ON user_game_rewards(user_id, earned_at DESC);

INSERT INTO user_game_rewards(id, user_id, game_id, cup_count, earned_at)
SELECT md5(gs.user_id || ':' || gs.game_id), gs.user_id, gs.game_id, 1, MIN(gs.completed_at)
FROM game_sessions gs
WHERE gs.completed_at IS NOT NULL
GROUP BY gs.user_id, gs.game_id
ON CONFLICT (user_id, game_id) DO NOTHING;

UPDATE game_sessions gs
SET cup_earned = TRUE
WHERE gs.completed_at IS NOT NULL
  AND gs.id = (SELECT first_session.id FROM game_sessions first_session
    WHERE first_session.user_id=gs.user_id AND first_session.game_id=gs.game_id
      AND first_session.completed_at IS NOT NULL
    ORDER BY first_session.completed_at ASC, first_session.id ASC LIMIT 1);
