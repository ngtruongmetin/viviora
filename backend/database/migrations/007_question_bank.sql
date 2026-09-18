CREATE TABLE IF NOT EXISTS question_banks (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL UNIQUE REFERENCES books(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  question_bank_id TEXT NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('MC', 'TF')),
  content TEXT NOT NULL,
  answer_explanation TEXT,
  correct_answer BOOLEAN,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((type = 'TF' AND correct_answer IS NOT NULL) OR (type = 'MC' AND correct_answer IS NULL))
);

CREATE TABLE IF NOT EXISTS question_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 3),
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (question_id, position)
);

CREATE INDEX IF NOT EXISTS idx_question_banks_book ON question_banks(book_id);
CREATE INDEX IF NOT EXISTS idx_questions_bank_type ON questions(question_bank_id, type, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_question_options_question ON question_options(question_id, position);
