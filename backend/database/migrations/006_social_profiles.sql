DROP TABLE IF EXISTS shares;

CREATE TABLE IF NOT EXISTS user_activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('POST_CREATED', 'COMMENT_CREATED', 'PROFILE_UPDATED', 'PASSWORD_CHANGED', 'MODERATION_REVIEWED')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_created
  ON user_activities(user_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS post_library_books (
  post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
  book_title TEXT NOT NULL,
  book_author TEXT,
  book_cover_url TEXT,
  book_category TEXT
);

CREATE INDEX IF NOT EXISTS idx_post_library_books_book ON post_library_books(book_id);
