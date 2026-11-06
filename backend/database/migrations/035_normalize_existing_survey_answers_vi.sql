UPDATE survey_options o SET label=CASE q.code
WHEN 'Q3' THEN CASE o.position WHEN 0 THEN 'Có' WHEN 1 THEN 'Không' ELSE 'Không nhớ' END
WHEN 'Q4' THEN CASE o.position WHEN 0 THEN 'Không đọc' WHEN 1 THEN 'Dưới 1 giờ' WHEN 2 THEN 'Từ 1-3 giờ' WHEN 3 THEN 'Từ 3-5 giờ' ELSE 'Trên 5 giờ' END
WHEN 'Q5' THEN CASE o.position WHEN 0 THEN 'Giảm nhiều' WHEN 1 THEN 'Giảm một chút' WHEN 2 THEN 'Không thay đổi' WHEN 3 THEN 'Tăng một chút' ELSE 'Tăng nhiều' END
WHEN 'Q6' THEN CASE o.position WHEN 0 THEN 'Chưa từng mượn' WHEN 1 THEN '1 lần/tháng' WHEN 2 THEN '2-3 lần/tháng' WHEN 3 THEN '1 lần/tuần' ELSE 'Nhiều hơn 1 lần/tuần' END
WHEN 'Q7' THEN CASE o.position WHEN 0 THEN '0 cuốn' WHEN 1 THEN '1 cuốn' WHEN 2 THEN '2 cuốn' WHEN 3 THEN '3-4 cuốn' ELSE '5 cuốn trở lên' END
WHEN 'Q8' THEN CASE o.position WHEN 0 THEN 'Không tìm được sách hay, phù hợp' WHEN 1 THEN 'Không có thời gian' WHEN 2 THEN 'Không có thói quen đọc sách' WHEN 3 THEN 'Sách ở thư viện cũ, ít hấp dẫn' WHEN 4 THEN 'Thích chơi game/xem điện thoại hơn' WHEN 5 THEN 'Em không gặp trở ngại nào' ELSE 'Khác' END
WHEN 'Q9' THEN CASE o.position WHEN 0 THEN 'Không bao giờ' WHEN 1 THEN 'Thỉnh thoảng' WHEN 2 THEN 'Thường xuyên' ELSE 'Rất thường xuyên' END
WHEN 'Q13' THEN CASE o.position WHEN 0 THEN 'Mới vào xem 1-2 lần' WHEN 1 THEN 'Vài lần mỗi tháng' WHEN 2 THEN '1-2 lần mỗi tuần' WHEN 3 THEN '3-5 lần mỗi tuần' ELSE 'Gần như mỗi ngày' END
WHEN 'Q14' THEN CASE o.position WHEN 0 THEN 'Thư viện' WHEN 1 THEN 'Trò chơi' ELSE 'Bảng tin' END
WHEN 'Q15' THEN CASE o.position WHEN 0 THEN 'Thư viện' WHEN 1 THEN 'Trò chơi' WHEN 2 THEN 'Bảng tin' ELSE 'Em thích như nhau' END
WHEN 'Q16' THEN CASE o.position WHEN 0 THEN 'Đọc sách kỹ rồi mới trả lời' WHEN 1 THEN 'Đọc lướt hoặc đọc một phần rồi trả lời' WHEN 2 THEN 'Chủ yếu đoán hoặc tìm đáp án ở nơi khác' ELSE 'Em chưa làm thử thách nào' END
WHEN 'Q17' THEN CASE o.position WHEN 0 THEN 'Có' ELSE 'Không' END
WHEN 'Q19' THEN CASE o.position WHEN 0 THEN 'Đổi điểm lấy phần thưởng/quà' WHEN 1 THEN 'Tích điểm khi đọc/mượn sách' WHEN 2 THEN 'Nhận huy hiệu/thành tựu' WHEN 3 THEN 'Tạo nhân vật/hồ sơ độc giả riêng' WHEN 4 THEN 'Lên cấp độ độc giả' WHEN 5 THEN 'Bảng xếp hạng độc giả tích cực' WHEN 6 THEN 'Thử thách đọc sách theo tuần/tháng' WHEN 7 THEN 'Xem bài chia sẻ trên Bảng tin' WHEN 8 THEN 'Gợi ý sách ở phân hệ Thư viện' ELSE 'Khác' END
WHEN 'Q20' THEN CASE o.position WHEN 0 THEN 'Website chậm hoặc bị lỗi' WHEN 1 THEN 'Không có thiết bị/mạng thuận tiện' WHEN 2 THEN 'Câu hỏi, thử thách quá khó' WHEN 3 THEN 'Thiếu sách em thích' WHEN 4 THEN 'Không có thời gian' WHEN 5 THEN 'Em không gặp khó khăn nào' ELSE 'Khác' END
ELSE o.label END FROM survey_questions q WHERE o.question_id=q.id;
UPDATE survey_options SET value=label;
