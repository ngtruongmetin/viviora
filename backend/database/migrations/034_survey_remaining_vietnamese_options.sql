UPDATE survey_options o SET label=CASE q.code
WHEN 'Q3' THEN CASE o.position WHEN 0 THEN 'Có' WHEN 1 THEN 'Không' ELSE 'Không nhớ' END
WHEN 'Q4' THEN CASE o.position WHEN 0 THEN 'Không đọc' WHEN 1 THEN 'Dưới 1 giờ' WHEN 2 THEN 'Từ 1-3 giờ' WHEN 3 THEN 'Từ 3-5 giờ' ELSE 'Trên 5 giờ' END
WHEN 'Q5' THEN CASE o.position WHEN 0 THEN 'Giảm nhiều' WHEN 1 THEN 'Giảm một chút' WHEN 2 THEN 'Không thay đổi' WHEN 3 THEN 'Tăng một chút' ELSE 'Tăng nhiều' END
WHEN 'Q6' THEN CASE o.position WHEN 0 THEN 'Chưa từng mượn' WHEN 1 THEN '1 lần/tháng' WHEN 2 THEN '2-3 lần/tháng' WHEN 3 THEN '1 lần/tuần' ELSE 'Nhiều hơn 1 lần/tuần' END
WHEN 'Q7' THEN CASE o.position WHEN 0 THEN '0 cuốn' WHEN 1 THEN '1 cuốn' WHEN 2 THEN '2 cuốn' WHEN 3 THEN '3-4 cuốn' ELSE '5 cuốn trở lên' END
WHEN 'Q9' THEN CASE o.position WHEN 0 THEN 'Không bao giờ' WHEN 1 THEN 'Thỉnh thoảng' WHEN 2 THEN 'Thường xuyên' ELSE 'Rất thường xuyên' END
WHEN 'Q13' THEN CASE o.position WHEN 0 THEN 'Mới vào xem 1-2 lần' WHEN 1 THEN 'Vài lần mỗi tháng' WHEN 2 THEN '1-2 lần mỗi tuần' WHEN 3 THEN '3-5 lần mỗi tuần' ELSE 'Gần như mỗi ngày' END
WHEN 'Q14' THEN CASE o.position WHEN 0 THEN 'Thư viện' WHEN 1 THEN 'Trò chơi' ELSE 'Bảng tin' END
WHEN 'Q15' THEN CASE o.position WHEN 0 THEN 'Thư viện' WHEN 1 THEN 'Trò chơi' WHEN 2 THEN 'Bảng tin' ELSE 'Em thích như nhau' END
WHEN 'Q17' THEN CASE o.position WHEN 0 THEN 'Có' ELSE 'Không' END
ELSE o.label END FROM survey_questions q WHERE o.question_id=q.id;
UPDATE survey_options SET value=label;
