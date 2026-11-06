UPDATE survey_options o SET label = CASE q.code
WHEN 'Q8' THEN CASE o.position WHEN 0 THEN 'Không tìm được sách hay, phù hợp' WHEN 1 THEN 'Không có thời gian' WHEN 2 THEN 'Không có thói quen đọc sách' WHEN 3 THEN 'Sách ở thư viện cũ, ít hấp dẫn' WHEN 4 THEN 'Thích chơi game/xem điện thoại hơn' WHEN 5 THEN 'Em không gặp trở ngại nào' ELSE 'Khác' END
WHEN 'Q16' THEN CASE o.position WHEN 0 THEN 'Đọc sách kỹ rồi mới trả lời' WHEN 1 THEN 'Đọc lướt hoặc đọc một phần rồi trả lời' WHEN 2 THEN 'Chủ yếu đoán hoặc tìm đáp án ở nơi khác' ELSE 'Em chưa làm thử thách nào' END
WHEN 'Q19' THEN CASE o.position WHEN 0 THEN 'Đổi điểm lấy phần thưởng/quà' WHEN 1 THEN 'Tích điểm khi đọc/mượn sách' WHEN 2 THEN 'Nhận huy hiệu/thành tựu' WHEN 3 THEN 'Tạo nhân vật/hồ sơ độc giả riêng' WHEN 4 THEN 'Lên cấp độ độc giả' WHEN 5 THEN 'Bảng xếp hạng độc giả tích cực' WHEN 6 THEN 'Thử thách đọc sách theo tuần/tháng' WHEN 7 THEN 'Xem bài chia sẻ trên Bảng tin' WHEN 8 THEN 'Gợi ý sách ở phân hệ Thư viện' ELSE 'Khác' END
WHEN 'Q20' THEN CASE o.position WHEN 0 THEN 'Website chậm hoặc bị lỗi' WHEN 1 THEN 'Không có thiết bị/mạng thuận tiện' WHEN 2 THEN 'Câu hỏi, thử thách quá khó' WHEN 3 THEN 'Thiếu sách em thích' WHEN 4 THEN 'Không có thời gian' WHEN 5 THEN 'Em không gặp khó khăn nào' ELSE 'Khác' END
ELSE o.label END
FROM survey_questions q WHERE o.question_id=q.id;
UPDATE survey_options SET value=label;
UPDATE survey_questions SET rows=CASE code
WHEN 'Q18' THEN '["Làm thử thách và tích điểm giúp em cảm thấy mình tiến bộ trong việc đọc.","Các thử thách trong Trò chơi có độ khó vừa sức với em.","Em được tự chọn cuốn sách mình thích đọc.","Em đọc sách vì em muốn đọc, không chỉ vì bị yêu cầu.","Bảng tin giúp em biết thêm sách hay từ bạn bè và thầy cô.","Chia sẻ và trò chuyện về sách giúp em gần gũi hơn với bạn bè, thầy cô.","Phân hệ Thư viện giúp em dễ tìm được sách phù hợp hơn trước.","Bảng xếp hạng chỉ hiện biệt danh giúp em thi đua vui vẻ, không bị áp lực.","Nhờ Viviora, em đọc sách nhiều hơn trước.","Em vẫn muốn đọc sách kể cả khi không có điểm hay quà.","Em hiểu và nhớ nội dung sách tốt hơn khi làm thử thách.","Em sẽ giới thiệu Viviora cho bạn bè.","Viviora dễ sử dụng."]'::jsonb
ELSE rows END
WHERE code='Q18';
