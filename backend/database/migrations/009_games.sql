CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('MC', 'TF')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
  description TEXT,
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS game_session_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position >= 0),
  selected_answer TEXT,
  is_correct BOOLEAN,
  points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
  answered_at TIMESTAMPTZ,
  UNIQUE (session_id, question_id),
  UNIQUE (session_id, position)
);

CREATE INDEX IF NOT EXISTS idx_games_book ON games(book_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_session_questions_session ON game_session_questions(session_id, position);

DROP TRIGGER IF EXISTS games_set_updated_at ON games;
CREATE TRIGGER games_set_updated_at BEFORE UPDATE ON games
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
