ALTER TABLE user_game_rewards
  ADD COLUMN IF NOT EXISTS earned_on DATE;

UPDATE user_game_rewards
SET earned_on = (earned_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
WHERE earned_on IS NULL;

ALTER TABLE user_game_rewards
  ALTER COLUMN earned_on SET NOT NULL;

ALTER TABLE user_game_rewards
  DROP CONSTRAINT IF EXISTS user_game_rewards_user_id_game_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS user_game_rewards_user_game_day_key
  ON user_game_rewards(user_id, game_id, earned_on);

CREATE INDEX IF NOT EXISTS idx_user_game_rewards_user_day
  ON user_game_rewards(user_id, earned_on DESC);
