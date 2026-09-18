UPDATE game_sessions SET cup_earned = FALSE;

UPDATE game_sessions gs
SET cup_earned = TRUE
WHERE gs.completed_at IS NOT NULL
  AND EXISTS (SELECT 1 FROM user_game_rewards r WHERE r.user_id=gs.user_id AND r.game_id=gs.game_id)
  AND gs.id = (SELECT first_session.id FROM game_sessions first_session
    WHERE first_session.user_id=gs.user_id AND first_session.game_id=gs.game_id
      AND first_session.completed_at IS NOT NULL
    ORDER BY first_session.completed_at ASC, first_session.id ASC LIMIT 1);
