import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LibraryCollection } from '../../types/models';

export function LibraryCollectionCard({ collection, accent = 'blue' }: { collection: LibraryCollection; accent?: 'blue' | 'purple' | 'yellow' | 'red' }) {
  return (
    <article className={`library-collection-card accent-${accent}`}>
      <div>
        <span className="eyebrow">KHO SÁCH SỐ</span>
        <h2>{collection.name}</h2>
      </div>
      <p className="collection-description">{collection.description || 'Kho sách đang chờ được bổ sung mô tả.'}</p>
      <div className="collection-stats">
        <div><strong>{collection.total_books.toLocaleString('vi-VN')}</strong><span>ĐẦU SÁCH</span></div>
        <div><strong>{collection.author_count.toLocaleString('vi-VN')}</strong><span>TÁC GIẢ</span></div>
      </div>
      <Link className="button primary collection-explore" to={`/thu-vien/kho/${collection.id}`}>
        KHÁM PHÁ <ArrowRight size={18} />
      </Link>
    </article>
  );
}
