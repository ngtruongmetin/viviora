CREATE TABLE IF NOT EXISTS ai_settings (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'groq',
  base_url TEXT NOT NULL DEFAULT 'https://api.groq.com/openai/v1',
  model TEXT NOT NULL DEFAULT 'openai/gpt-oss-20b',
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.40 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER NOT NULL DEFAULT 900 CHECK (max_tokens BETWEEN 128 AND 4096),
  system_prompt TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  credential_ciphertext TEXT,
  credential_iv TEXT,
  credential_tag TEXT,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ai_settings(id, system_prompt)
VALUES ('default', 'Ban la Tro ly tu van sach Viviora. Chi gioi thieu sach co trong du lieu catalog duoc cung cap. Khong tu tao tua sach, tac gia, noi dung, so trang hay thong tin khong co trong du lieu. Neu khong co ket qua phu hop, hay noi ro thu vien chua co du lieu phu hop va goi y tu khoa tim kiem khac. Tra loi ngan gon, than thien bang tieng Viet.')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated ON ai_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  recommended_book_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created ON ai_messages(conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS ai_request_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  provider TEXT,
  model TEXT,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS','ERROR','BLOCKED')),
  duration_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_request_logs_created ON ai_request_logs(created_at DESC);
