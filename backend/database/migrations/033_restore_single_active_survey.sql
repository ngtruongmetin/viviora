WITH latest AS (
  SELECT id FROM surveys ORDER BY created_at DESC LIMIT 1
)
UPDATE surveys
SET status=CASE WHEN id=(SELECT id FROM latest) THEN 'PUBLISHED' ELSE 'UNPUBLISHED' END,
    is_active=(id=(SELECT id FROM latest));
