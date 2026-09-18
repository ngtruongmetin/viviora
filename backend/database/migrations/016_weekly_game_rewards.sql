ALTER TABLE user_game_rewards ADD COLUMN IF NOT EXISTS week_start DATE;
UPDATE user_game_rewards
SET week_start = earned_on - (EXTRACT(ISODOW FROM earned_on)::int - 1)
WHERE week_start IS NULL;
ALTER TABLE user_game_rewards ALTER COLUMN week_start SET NOT NULL;
WITH grouped AS (
  SELECT user_id, game_id, week_start, SUM(cup_count)::int AS total_cups, MIN(id) AS keep_id
  FROM user_game_rewards
  GROUP BY user_id, game_id, week_start
  HAVING COUNT(*) > 1
), updated AS (
  UPDATE user_game_rewards r SET cup_count=g.total_cups
  FROM grouped g WHERE r.id=g.keep_id
  RETURNING r.id
)
DELETE FROM user_game_rewards r
USING grouped g
WHERE r.user_id=g.user_id AND r.game_id=g.game_id AND r.week_start=g.week_start AND r.id<>g.keep_id;
CREATE UNIQUE INDEX IF NOT EXISTS user_game_rewards_user_game_day_key ON user_game_rewards(user_id, game_id, earned_on);
DROP INDEX IF EXISTS user_game_rewards_user_game_week_key;
CREATE INDEX IF NOT EXISTS idx_user_game_rewards_week ON user_game_rewards(week_start DESC, user_id);
