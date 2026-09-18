ALTER TABLE game_session_questions
  DROP CONSTRAINT IF EXISTS game_session_questions_question_id_fkey;
ALTER TABLE game_session_questions
  ALTER COLUMN question_id DROP NOT NULL;
ALTER TABLE game_session_questions
  ADD CONSTRAINT game_session_questions_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL;
