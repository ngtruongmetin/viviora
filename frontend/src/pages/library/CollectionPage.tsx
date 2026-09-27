import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookCard } from '../../components/library/BookCard';
import { LibraryPagination } from '../../components/library/LibraryPagination';
import { libraryApi } from '../../services/domain';

function useDebouncedValue(value: string, delay = 320) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function CollectionPage() {
  const { collectionId = '' } = useParams();
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(searchInput);
  useEffect(() => setPage(1), [search, category]);
  const query = useQuery({
    queryKey: ['library-collection', collectionId, search, category, page],
    queryFn: () =>
      libraryApi
        .collection(collectionId, { page, limit: 24, search, category })
        .then((response) => response.data),
    enabled: Boolean(collectionId),
    placeholderData: keepPreviousData,
  });
  if (query.isPending && !query.data) return <div className="state-card">Đang tải kho sách...</div>;
  if (query.isError || !query.data)
    return (
      <div className="state-card error">
        Không tìm thấy kho sách hoặc không thể kết nối dữ liệu.
      </div>
    );
  const { collection, books, categories, pagination } = query.data;
  const hasFilters = Boolean(searchInput || category);
  return (
    <div className="collection-page">
      <Link to="/thu-vien" className="back-link">
        <ArrowLeft size={17} /> QUAY LẠI THƯ VIỆN
      </Link>
      <section className="collection-hero">
        <div>
          <span className="eyebrow">KHO SÁCH SỐ</span>
          <h1>{collection.name}</h1>
          <p>
            {collection.description ||
              'Thông tin sách trong kho được tổng hợp từ dữ liệu do thủ thư nhập.'}
          </p>
        </div>
        <div className="collection-hero-stats">
          <div>
            <strong>{collection.total_books}</strong>
            <span>ĐẦU SÁCH</span>
          </div>
          <div>
            <strong>{collection.author_count}</strong>
            <span>TÁC GIẢ</span>
          </div>
        </div>
      </section>
      <section className="library-catalogue-controls" aria-label="Tìm kiếm và lọc sách">
        <label className="collection-search">
          <span className="visually-hidden">Tìm kiếm sách</span>
          <Search size={19} />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm sách, tác giả hoặc nhà xuất bản..."
          />
          {query.isFetching && <span className="catalogue-loading">ĐANG TÌM</span>}
        </label>
        <label className="catalogue-category">
          <span>THỂ LOẠI</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Tất cả thể loại</option>
            {categories.map((item) => (
              <option value={item.category} key={item.category}>
                {item.category} ({item.total})
              </option>
            ))}
          </select>
        </label>
        {hasFilters && (
          <button
            className="catalogue-reset"
            type="button"
            onClick={() => {
              setSearchInput('');
              setCategory('');
            }}
          >
            <X size={16} /> XÓA LỌC
          </button>
        )}
      </section>
      <div className="library-section-title">
        <span />
        <h2>{pagination.total.toLocaleString('vi-VN')} ĐẦU SÁCH</h2>
        <span />
      </div>
      {books.length === 0 ? (
        <section className="state-card empty-state">
          <h2>KHÔNG CÓ KẾT QUẢ</h2>
          <p>Thử điều chỉnh từ khóa tìm kiếm hoặc thể loại để xem các đầu sách khác.</p>
        </section>
      ) : (
        <div className={`book-grid ${query.isFetching ? 'book-grid-fetching' : ''}`}>
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
      <LibraryPagination {...pagination} onPageChange={setPage} />
    </div>
  );
}
