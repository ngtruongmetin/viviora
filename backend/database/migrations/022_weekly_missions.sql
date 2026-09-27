CREATE TABLE IF NOT EXISTS weekly_missions (
 id TEXT PRIMARY KEY, mission_no INTEGER UNIQUE NOT NULL, name TEXT NOT NULL, requirement_text TEXT NOT NULL,
 cup_reward INTEGER NOT NULL CHECK (cup_reward >= 0), is_master BOOLEAN NOT NULL DEFAULT FALSE, active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS weekly_mission_assignments (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, week_start DATE NOT NULL,
 assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, week_start)
);
CREATE TABLE IF NOT EXISTS user_weekly_missions (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, week_start DATE NOT NULL,
 mission_id TEXT NOT NULL REFERENCES weekly_missions(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK(status IN ('ASSIGNED','COMPLETED','CLAIMED','EXPIRED')),
 progress_current INTEGER NOT NULL DEFAULT 0 CHECK(progress_current >= 0), progress_target INTEGER NOT NULL DEFAULT 1 CHECK(progress_target > 0),
 completed_at TIMESTAMPTZ, claimed_at TIMESTAMPTZ, UNIQUE(user_id, week_start, mission_id)
);
CREATE TABLE IF NOT EXISTS weekly_mission_rewards (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, mission_id TEXT NOT NULL REFERENCES weekly_missions(id) ON DELETE CASCADE,
 week_start DATE NOT NULL, cup_count INTEGER NOT NULL CHECK(cup_count >= 0), claimed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id, mission_id, week_start)
);
CREATE INDEX IF NOT EXISTS idx_user_weekly_missions_user_week ON user_weekly_missions(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_user_weekly_missions_week_status ON user_weekly_missions(week_start, status);
CREATE INDEX IF NOT EXISTS idx_weekly_mission_rewards_week ON weekly_mission_rewards(week_start, user_id);
INSERT INTO weekly_missions(id,mission_no,name,requirement_text,cup_reward,is_master) VALUES
 ('WM_001',1,'Khám phá thư viện','Khám phá 3 đầu sách khác nhau trong tuần.',100,false),
 ('WM_002',2,'Mở rộng gu đọc','Khám phá sách thuộc 3 thể loại khác nhau.',100,false),
 ('WM_003',3,'Tìm kiếm thông minh','Sử dụng chức năng tìm kiếm để tìm thành công 5 đầu sách.',100,false),
 ('WM_004',4,'Cuốn sách muốn đọc','Đánh dấu 3 cuốn sách bạn muốn tìm/mượn tại thư viện.',100,false),
 ('WM_005',5,'Chia sẻ một cuốn sách','Đăng 1 bài viết chia sẻ về một cuốn sách.',100,false),
 ('WM_006',6,'Góc nhìn của bạn','Viết 1 đánh giá cho một cuốn sách.',100,false),
 ('WM_007',7,'Tham gia cuộc trò chuyện','Gửi 5 bình luận vào các bài viết.',100,false),
 ('WM_008',8,'Kết nối bạn đọc','Tương tác với bài viết/đánh giá của 5 bài đăng khác nhau.',100,false),
 ('WM_009',9,'Lan tỏa cảm hứng','Nhận được 5 lượt tương tác cho 1 bài viết của bản thân.',100,false),
 ('WM_010',10,'Lời khuyên hữu ích','Nhận được 3 bình luận cho 1 bài viết của bản thân.',100,false),
 ('WM_011',11,'Thử thách kiến thức','Hoàn thành 3 lượt chơi trong tuần.',100,false),
 ('WM_012',12,'Vua trò chơi','Kiếm được 50 cúp từ các trò chơi.',100,false),
 ('WM_013',13,'Chinh phục tuần','Hoàn thành toàn bộ nhiệm vụ được giao trong tuần.',300,true)
 ON CONFLICT(mission_no) DO UPDATE SET name=EXCLUDED.name, requirement_text=EXCLUDED.requirement_text, cup_reward=EXCLUDED.cup_reward, is_master=EXCLUDED.is_master;
