ALTER TABLE reading_progress ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'READING';
ALTER TABLE reading_progress DROP CONSTRAINT IF EXISTS reading_progress_status_check;
ALTER TABLE reading_progress ADD CONSTRAINT reading_progress_status_check CHECK (status IN ('WANT_TO_READ','READING','COMPLETED'));
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, book_id)
);
CREATE TABLE IF NOT EXISTS user_favorite_books (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, book_id)
);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_created ON user_bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_created ON user_favorite_books(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_status ON reading_progress(user_id, status, updated_at DESC);
