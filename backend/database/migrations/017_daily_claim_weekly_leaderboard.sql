DROP INDEX IF EXISTS user_game_rewards_user_game_week_key;
CREATE UNIQUE INDEX IF NOT EXISTS user_game_rewards_user_game_day_key ON user_game_rewards(user_id, game_id, earned_on);
