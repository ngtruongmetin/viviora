import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { BookCover } from '../../components/library/BookCover';
import { BookFormModal } from '../../components/library/BookFormModal';
import { ConfirmLibraryDeleteModal } from '../../components/library/ConfirmLibraryDeleteModal';
import { LibraryPagination } from '../../components/library/LibraryPagination';
import { libraryApi, type BookInput } from '../../services/domain/library';
import type { Book } from '../../types/models';
import { formatBookPrice } from '../../utils/formatPrice';

function useDebouncedValue(value: string, delay = 320) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function AdminCollectionPage() {
  const { collectionId = '' } = useParams();
  const client = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Book | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Book | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const search = useDebouncedValue(searchInput);
  useEffect(() => setPage(1), [search, category]);
  const query = useQuery({
    queryKey: ['admin-library-collection', collectionId, search, category, page],
    queryFn: () =>
      libraryApi
        .collection(collectionId, { page, limit: 20, search, category })
        .then((response) => response.data),
    enabled: Boolean(collectionId),
    placeholderData: keepPreviousData,
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['admin-library-collection', collectionId] });
    await client.invalidateQueries({ queryKey: ['admin-library-collections'] });
  };
  if (query.isPending && !query.data) return <div className="state-card">Đang tải kho sách...</div>;
  if (query.isError || !query.data)
    return <div className="state-card error">Không tìm thấy kho sách này.</div>;
  const { collection, books, categories, pagination } = query.data;
  const saveBook = async (data: BookInput, cover?: File) => {
    const response = editing
      ? await libraryApi.updateBook(editing.id, data)
      : await libraryApi.createBook(collection.id, data);
    if (cover) await libraryApi.uploadBookCover(response.data.data.book.id, cover);
    toast.success(editing ? 'Đã cập nhật đầu sách' : 'Đã thêm đầu sách');
    setEditing(undefined);
    await refresh();
  };
  const removeCover = async () => {
    if (!editing) return;
    await libraryApi.removeBookCover(editing.id);
    await refresh();
  };
  const deleteBook = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await libraryApi.deleteBook(deleting.id);
      toast.success('Đã xóa đầu sách');
      setDeleting(null);
      await refresh();
    } catch {
      toast.error('Không thể xóa đầu sách.');
    } finally {
      setDeletingBusy(false);
    }
  };
  return (
    <div className="admin-collection-page">
      <Link className="back-link" to="/quan-tri/thu-vien">
        <ArrowLeft size={17} /> QUAY LẠI QUẢN LÝ KHO
      </Link>
      <section className="admin-collection-hero">
        <div>
          <span className="eyebrow">QUẢN LÝ SÁCH</span>
          <h1>{collection.name}</h1>
          <p>{collection.description || 'Chưa có mô tả cho kho sách này.'}</p>
        </div>
        <div>
          <strong>{collection.total_books}</strong>
          <span>ĐẦU SÁCH</span>
        </div>
      </section>
      <section className="admin-book-toolbar">
        <label className="collection-search">
          <span className="visually-hidden">Tìm sách trong kho</span>
          <Search size={19} />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm sách, tác giả hoặc nhà xuất bản..."
          />
          {query.isFetching && <span className="catalogue-loading">ĐANG TÌM</span>}
        </label>
        <select
          aria-label="Lọc theo thể loại"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">Tất cả thể loại</option>
          {categories.map((item) => (
            <option key={item.category} value={item.category}>
              {item.category} ({item.total})
            </option>
          ))}
        </select>
        <button className="button primary" type="button" onClick={() => setEditing(null)}>
          <Plus size={18} /> THÊM SÁCH
        </button>
      </section>
      {books.length === 0 ? (
        <div className="state-card empty-state">
          <h2>CHƯA CÓ ĐẦU SÁCH</h2>
          <p>Thêm thủ công hoặc sử dụng import Excel để bổ sung dữ liệu cho kho này.</p>
        </div>
      ) : (
        <div className={`admin-book-list ${query.isFetching ? 'book-grid-fetching' : ''}`}>
          {books.map((book) => (
            <article className="admin-book-row" key={book.id}>
              <BookCover book={book} compact />
              <div className="admin-book-copy">
                <span>{book.category || 'CHƯA PHÂN LOẠI'}</span>
                <h2>{book.title}</h2>
                <p>
                  {book.author || 'Chưa rõ tác giả'} {book.publisher && `· ${book.publisher}`}
                </p>
                <small>
                  {book.publication_year || 'Chưa có năm XB'}{' '}
                  {book.cutter && `· Cutter ${book.cutter}`} ·{' '}
                  {formatBookPrice(book.price) || 'Chưa cập nhật'}
                </small>
              </div>
              <div className="admin-row-actions">
                <button
                  className="icon-button"
                  type="button"
                  title="Chỉnh sửa sách"
                  onClick={() => setEditing(book)}
                >
                  <Pencil size={17} />
                </button>
                <button
                  className="icon-button destructive"
                  type="button"
                  title="Xóa sách"
                  onClick={() => setDeleting(book)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <LibraryPagination {...pagination} onPageChange={setPage} />
      {editing !== undefined && (
        <BookFormModal
          book={editing || undefined}
          onClose={() => setEditing(undefined)}
          onSubmit={saveBook}
          onRemoveCover={editing ? removeCover : undefined}
        />
      )}
      {deleting && (
        <ConfirmLibraryDeleteModal
          title="XÓA ĐẦU SÁCH?"
          message={`Xóa “${deleting.title}” khỏi kho sách. Hành động này không thể hoàn tác.`}
          loading={deletingBusy}
          onClose={() => setDeleting(null)}
          onConfirm={() => void deleteBook()}
        />
      )}
    </div>
  );
}
