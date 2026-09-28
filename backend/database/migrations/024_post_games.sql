CREATE TABLE IF NOT EXISTS post_games (
  post_id text PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  game_id text REFERENCES games(id) ON DELETE SET NULL,
  game_title text NOT NULL,
  question_type text NOT NULL,
  question_count integer NOT NULL,
  reward_cups integer NOT NULL,
  book_title text,
  book_author text,
  book_cover_url text
);
