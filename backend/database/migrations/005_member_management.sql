ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_class_name_format;
ALTER TABLE users ADD CONSTRAINT users_class_name_format
  CHECK (class_name IS NULL OR class_name ~ '^[6-9]A[0-9]+$');

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_specialization_allowlist;
ALTER TABLE users ADD CONSTRAINT users_specialization_allowlist
  CHECK (
    specialization IS NULL OR specialization IN (
      'Toán',
      'Ngữ Văn',
      'Tiếng Anh',
      'Khoa học tự nhiên - Công nghệ',
      'Lịch sử - Địa lí',
      'Giáo dục công dân',
      'Nghệ thuật - Giáo dục thể chất',
      'Văn phòng'
    )
  );

CREATE INDEX IF NOT EXISTS idx_users_admin_list
  ON users(role, is_active, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_users_name_search
  ON users USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_username_search
  ON users USING GIN (username gin_trgm_ops);
