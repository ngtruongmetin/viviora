import { BookOpen, FileUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LibraryEmptyState({ admin = false }: { admin?: boolean }) {
  return (
    <section className="state-card empty-state library-empty">
      <span className="empty-icon" aria-hidden="true">
        {admin ? <FileUp size={34} /> : <BookOpen size={34} />}
      </span>
      <span className="eyebrow">THƯ VIỆN SỐ</span>
      <h2>{admin ? 'CHƯA CÓ KHO SÁCH NÀO' : 'THƯ VIỆN ĐANG CHỜ NHỮNG CUỐN SÁCH ĐẦU TIÊN'}</h2>
      <p>
        {admin
          ? 'Nhập file Excel đầu tiên để tạo một kho sách cho cộng đồng Viviora.'
          : 'Những kho sách được nhập bởi thủ thư sẽ xuất hiện tại đây.'}
      </p>
      {admin && (
        <Link className="button primary" to="/quan-tri/thu-vien/nhap-kho">
          <FileUp size={18} /> NHẬP KHO SÁCH ĐẦU TIÊN
        </Link>
      )}
    </section>
  );
}
