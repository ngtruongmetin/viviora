import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BookCard } from '../../components/library/BookCard';
import { libraryApi } from '../../services/domain';

export function MyLibraryPage() {
  const [filter, setFilter] = useState('');
  const query = useQuery({
    queryKey: ['my-library', filter],
    queryFn: () =>
      libraryApi
        .myLibrary(
          filter === 'favorite'
            ? { favorite: true }
            : filter === 'bookmarked'
              ? { bookmarked: true }
              : filter
                ? { status: filter }
                : {},
        )
        .then((response) => response.data),
  });
  const items = query.data?.items || [];
  return (
    <div className="library-page">
      <section className="library-hero">
        <span className="eyebrow">VIVIORA / LIBRARY</span>
        <h1>TỦ SÁCH CỦA TÔI</h1>
        <p>Quản lý sách yêu thích, muốn đọc và tiến độ đọc của bạn.</p>
      </section>
      <div className="library-catalogue-controls">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">TẤT CẢ</option>
          <option value="favorite">YÊU THÍCH</option>
          <option value="bookmarked">MUỐN ĐỌC</option>
          <option value="READING">ĐANG ĐỌC</option>
          <option value="COMPLETED">ĐÃ ĐỌC</option>
        </select>
      </div>
      {query.isPending ? (
        <div className="state-card">Đang tải tủ sách...</div>
      ) : items.length ? (
        <div className="book-grid">
          {items.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className="state-card empty-state">Chưa có sách trong tủ.</div>
      )}
    </div>
  );
}
