DELETE FROM user_achievements WHERE achievement_id IN (SELECT id FROM achievements WHERE code='ACH_056');
DELETE FROM achievements WHERE code='ACH_056';
