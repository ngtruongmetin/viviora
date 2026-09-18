ALTER TABLE moderation
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

UPDATE moderation
SET reviewed_at = COALESCE(reviewed_at, created_at)
WHERE status IN ('APPROVED', 'REJECTED');
