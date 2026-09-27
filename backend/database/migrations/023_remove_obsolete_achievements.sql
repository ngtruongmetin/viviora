DELETE FROM user_achievements WHERE achievement_id IN (SELECT id FROM achievements WHERE code IN ('ACH_011','ACH_029','ACH_030','ACH_050','ACH_051','ACH_052','ACH_053','ACH_054'));
DELETE FROM achievements WHERE code IN ('ACH_011','ACH_029','ACH_030','ACH_050','ACH_051','ACH_052','ACH_053','ACH_054');
