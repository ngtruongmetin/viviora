import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Book } from '../../types/models';
import { BookCover } from './BookCover';
import { formatBookPrice } from '../../utils/formatPrice';

export function BookCard({ book }: { book: Book }) {
  return (
    <article className="book-card">
      <BookCover book={book} className="book-card-cover" compact />
      <div className="book-card-body">
        <dl>
          <div><dt>NXB</dt><dd>{book.publisher || 'Chưa cập nhật'}</dd></div>
          <div><dt>NĂM</dt><dd>{book.publication_year || '---'}</dd></div>
          <div><dt>GIÁ</dt><dd>{formatBookPrice(book.price) || 'Chưa cập nhật'}</dd></div>
        </dl>
        <Link className="book-detail-link" to={`/thu-vien/sach/${book.id}`} aria-label={`Xem chi tiết ${book.title}`}>
          XEM CHI TIẾT <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}
