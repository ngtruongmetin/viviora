ALTER TABLE reading_progress
  DROP CONSTRAINT IF EXISTS reading_progress_book_id_fkey;

ALTER TABLE reading_progress
  ADD CONSTRAINT reading_progress_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reading_progress_user_book
  ON reading_progress(user_id, book_id);
