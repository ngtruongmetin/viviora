import { useEffect, useState } from 'react';
import type { Book } from '../../types/models';

type CoverTone = 'literature' | 'science' | 'children' | 'history' | 'skills' | 'generic';

function coverTone(category?: string | null): CoverTone {
  const value = (category || '').toLocaleLowerCase('vi');
  if (/(văn học|truyện|tiểu thuyết|thơ)/.test(value)) return 'literature';
  if (/(khoa học|sinh học|vật lý|hóa học|toán)/.test(value)) return 'science';
  if (/(thiếu nhi|trẻ em|tuổi thơ)/.test(value)) return 'children';
  if (/(lịch sử|địa lý|văn hóa)/.test(value)) return 'history';
  if (/(kỹ năng|phát triển|giáo dục|học tập)/.test(value)) return 'skills';
  return 'generic';
}

export function BookCover({ book, className = '', compact = false }: { book: Pick<Book, 'title' | 'author' | 'category' | 'cover_url'> & { publisher?: string | null; price?: string | number | null }; className?: string; compact?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [book.cover_url]);
  if (book.cover_url && !imageFailed) return <img className={`book-cover-image ${className}`} src={book.cover_url} alt={`Bìa sách ${book.title}`} onError={() => setImageFailed(true)} />;
  const tone = coverTone(book.category);
  return (
    <div className={`book-cover-fallback book-cover-${tone} ${compact ? 'book-cover-compact' : ''} ${className}`} aria-label={`Bìa mặc định cho ${book.category || 'sách Viviora'}`} role="img">
      <div className="book-cover-geometry" aria-hidden="true" />
      <div className="book-cover-brand">VIVIORA</div>
      <div className="book-cover-title-panel">
        <strong>{book.title}</strong>
      </div>
      <div className="book-cover-author-panel">
        <span>TÁC GIẢ</span>
        <strong>{book.author || 'Chưa cập nhật'}</strong>
      </div>
    </div>
  );
}
