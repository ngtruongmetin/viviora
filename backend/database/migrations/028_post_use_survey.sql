CREATE TABLE surveys (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, introduction TEXT, is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE survey_sections (
  id TEXT PRIMARY KEY, survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  title TEXT NOT NULL, position INTEGER NOT NULL
);
CREATE TABLE survey_questions (
  id TEXT PRIMARY KEY, section_id TEXT NOT NULL REFERENCES survey_sections(id) ON DELETE CASCADE,
  code TEXT NOT NULL, content TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('SINGLE','MULTIPLE','LIKERT','MATRIX','TEXT','SYSTEM')),
  required BOOLEAN NOT NULL DEFAULT true, max_choices INTEGER, scale_min INTEGER, scale_max INTEGER,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb, position INTEGER NOT NULL
);
CREATE TABLE survey_options (
  id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL, value TEXT NOT NULL, position INTEGER NOT NULL
);
CREATE TABLE survey_responses (
  id TEXT PRIMARY KEY, survey_id TEXT NOT NULL REFERENCES surveys(id), user_id TEXT NOT NULL REFERENCES users(id),
  class_name_snapshot TEXT, grade_snapshot TEXT, gender_snapshot TEXT, submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(survey_id, user_id)
);
CREATE TABLE survey_answers (
  id TEXT PRIMARY KEY, response_id TEXT NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL, answer JSONB NOT NULL, question_snapshot JSONB NOT NULL
);
CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id, submitted_at);
CREATE INDEX idx_survey_answers_response ON survey_answers(response_id);
