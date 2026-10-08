ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS remaining_lives INTEGER NOT NULL DEFAULT 3
    CHECK (remaining_lives BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS outcome TEXT
    CHECK (outcome IN ('WON', 'LOST'));

UPDATE game_sessions
SET outcome = 'WON'
WHERE completed_at IS NOT NULL AND outcome IS NULL;
