import { ArrowRight, BookOpen, Gamepad2, Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const shelves = [
  { title: 'ĐỌC', caption: 'Mỗi trang mở một hướng đi.', color: 'blue' },
  { title: 'CHIA SẺ', caption: 'Một góc nhìn có thể chạm tới cộng đồng.', color: 'yellow' },
  { title: 'CHINH PHỤC', caption: 'Tích EXP, lên level, mở thành tựu.', color: 'red' },
];

export function LandingPage() {
  const { user } = useAuth();
  const startHref = user ? '/bang-tin' : '/dang-ky';
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link to="/" className="wordmark">
          VIVIORA
        </Link>
        <nav>
          <a href="#kham-pha">KHÁM PHÁ</a>
          <a href="#cong-dong">CỘNG ĐỒNG</a>
          <a href="#thanh-tuu">THÀNH TỰU</a>
        </nav>
        <div className="landing-header-actions">
          <Link to={user ? '/bang-tin' : '/dang-nhap'} className="landing-login">
            ĐĂNG NHẬP
          </Link>
          <Link to={user ? '/bang-tin' : '/dang-ky'} className="button primary">
            {user ? 'VÀO BẢNG TIN' : 'ĐĂNG KÝ'} <ArrowRight size={17} />
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="eyebrow">NỀN TẢNG ĐỌC SÁCH XÃ HỘI</span>
          <h1>
            <span>ĐỌC.</span>
            <span>
              <em>KHÁM PHÁ.</em>
            </span>
            <span>KẾT NỐI.</span>
          </h1>
          <p>
            Viviora biến hành trình đọc thành một không gian để bạn tìm sách, nói điều mình nghĩ và
            cùng cộng đồng tiến về phía trước.
          </p>
          <div className="landing-hero-actions">
            <Link className="button primary" to={startHref}>
              BẮT ĐẦU ĐỌC <ArrowRight size={18} />
            </Link>
            <Link className="button secondary" to="/thu-vien">
              XEM THƯ VIỆN <BookOpen size={18} />
            </Link>
          </div>
          <div className="landing-proof">
            <span>
              <strong>15.2K+</strong> ĐẦU SÁCH
            </span>
            <span>
              <strong>47</strong> THÀNH TỰU
            </span>
            <span>
              <strong>24/7</strong> KHÁM PHÁ
            </span>
          </div>
        </div>
        <div className="landing-hero-art" aria-label="Minh họa các đầu sách và hành trình đọc">
          <div className="landing-art-grid" />
          <div className="landing-book landing-book-a">
            <small>01</small>
            <strong>
              ĐỌC
              <br />
              ĐỂ
              <br />
              LỚN
            </strong>
            <span>VIVIORA LIBRARY</span>
          </div>
          <div className="landing-book landing-book-b">
            <small>02</small>
            <strong>
              Ý<br />
              TƯỞNG
              <br />
              MỚI
            </strong>
            <span>COLLECTION / 2026</span>
          </div>
          <div className="landing-book landing-book-c">
            <small>03</small>
            <strong>
              GÓC
              <br />
              NHÌN
              <br />
              RIÊNG
            </strong>
            <span>READ · SHARE · GROW</span>
          </div>
          <div className="landing-art-sticker">
            READ
            <br />
            MORE
            <br />
            <b>→</b>
          </div>
          <div className="landing-art-label">
            01 / 03
            <br />
            <span>
              YOUR NEXT
              <br />
              CHAPTER
            </span>
          </div>
        </div>
      </section>

      <section id="kham-pha" className="landing-section landing-discover">
        <div className="landing-section-heading">
          <span className="eyebrow">MỘT THƯ VIỆN LUÔN MỞ</span>
          <h2>
            KHÔNG CHỈ
            <br />
            <span>LÀ MỘT KHO SÁCH.</span>
          </h2>
        </div>
        <div className="landing-shelf-grid">
          {shelves.map((item, index) => (
            <article className={`landing-shelf landing-shelf-${item.color}`} key={item.title}>
              <span className="landing-shelf-index">0{index + 1}</span>
              <BookOpen size={26} />
              <h3>{item.title}</h3>
              <p>{item.caption}</p>
              <Link to={index === 0 ? '/thu-vien' : startHref}>
                KHÁM PHÁ <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="cong-dong" className="landing-section landing-community">
        <div className="landing-community-note">
          <span className="eyebrow">BẢNG TIN CỘNG ĐỒNG</span>
          <h2>
            ĐỌC MỘT MÌNH.
            <br />
            <span>KHÔNG CÔ ĐƠN.</span>
          </h2>
          <p>
            Viết review, kể lại một đoạn sách khiến bạn dừng lại, hoặc tìm người đang đọc cùng câu
            chuyện.
          </p>
          <Link className="button secondary" to={startHref}>
            VÀO CỘNG ĐỒNG <ArrowRight size={17} />
          </Link>
        </div>
        <div className="landing-post-preview">
          <div className="landing-post-band">
            BOOK REVIEW <span>JUST NOW</span>
          </div>
          <div className="landing-post-body">
            <span className="landing-avatar">N</span>
            <div>
              <strong>NGƯỜI ĐỌC ẨN DANH</strong>
              <small>HỌC SINH · LỚP 8A1</small>
            </div>
            <p>
              “Có những cuốn sách không đưa cho bạn câu trả lời. Chúng chỉ khiến bạn đặt câu hỏi hay
              hơn.”
            </p>
            <div className="landing-post-tags">
              <span>#ĐỌC_SÁCH</span>
              <span>#GÓC_NHÌN</span>
              <span>♡ 24</span>
            </div>
          </div>
        </div>
      </section>

      <section id="thanh-tuu" className="landing-section landing-achievements">
        <div>
          <span className="eyebrow">MỖI BƯỚC ĐỀU ĐƯỢC GHI NHẬN</span>
          <h2>
            ĐỌC THÊM.
            <br />
            <span>NHẬN NHIỀU HƠN.</span>
          </h2>
        </div>
        <div className="landing-achievement-points">
          <div>
            <Trophy size={24} />
            <strong>LEVEL UP</strong>
            <span>EXP từ những hoạt động thật.</span>
          </div>
          <div>
            <Gamepad2 size={24} />
            <strong>CHƠI &amp; HỌC</strong>
            <span>Game gắn với sách bạn yêu.</span>
          </div>
          <div>
            <Sparkles size={24} />
            <strong>THÀNH TỰU</strong>
            <span>47 cột mốc để theo đuổi.</span>
          </div>
        </div>
      </section>

      <section className="landing-final">
        <span className="eyebrow">CHƯƠNG ĐẦU TIÊN ĐANG CHỜ</span>
        <h2>
          SẴN SÀNG MỞ
          <br />
          <span>TRANG TIẾP THEO?</span>
        </h2>
        <Link className="button primary" to={startHref}>
          {user ? 'VÀO BẢNG TIN' : 'TẠO TÀI KHOẢN MIỄN PHÍ'} <ArrowRight size={18} />
        </Link>
      </section>
      <footer className="landing-footer">
        <span className="wordmark">VIVIORA</span>
        <span>ĐỌC · CHIA SẺ · KẾT NỐI</span>
        <span>© 2026 VIVIORA</span>
      </footer>
    </main>
  );
}
