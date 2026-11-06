UPDATE surveys
SET title = 'KHẢO SÁT HỌC SINH SAU KHI SỬ DỤNG VIVIORA',
    introduction = 'Việc tham gia hoàn toàn tự nguyện. Thông tin chỉ phục vụ nghiên cứu và không ảnh hưởng kết quả học tập.'
WHERE title = 'KHAO SAT HOC SINH SAU KHI SU DUNG VIVIORA';

UPDATE survey_sections SET title = 'PHẦN A. THÔNG TIN CHUNG' WHERE title = 'PHAN A. THONG TIN CHUNG';
UPDATE survey_sections SET title = 'PHẦN B. THÓI QUEN ĐỌC SÁCH VÀ MƯỢN SÁCH' WHERE title = 'PHAN B. THOI QUEN DOC SACH VA MUON SACH';
UPDATE survey_sections SET title = 'PHẦN C. MỨC ĐỘ HỨNG THÚ VÀ HÀI LÒNG' WHERE title = 'PHAN C. MUC DO HUNG THU VA HAI LONG';
UPDATE survey_sections SET title = 'PHẦN D. TRẢI NGHIỆM SỬ DỤNG VIVIORA' WHERE title = 'PHAN D. TRAI NGHIEM SU DUNG VIVIORA';
UPDATE survey_sections SET title = 'PHẦN E. ĐÁNH GIÁ VỀ VIVIORA' WHERE title = 'PHAN E. DANH GIA VE VIVIORA';
UPDATE survey_sections SET title = 'PHẦN F. Ý KIẾN CỦA EM' WHERE title = 'PHAN F. Y KIEN CUA EM';
