ALTER TABLE questions ADD COLUMN IF NOT EXISTS point INTEGER;

UPDATE questions SET point = 10 WHERE point IS NULL;

ALTER TABLE questions ALTER COLUMN point SET DEFAULT 10;
ALTER TABLE questions ALTER COLUMN point SET NOT NULL;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_point_positive;
ALTER TABLE questions ADD CONSTRAINT questions_point_positive CHECK (point > 0);
