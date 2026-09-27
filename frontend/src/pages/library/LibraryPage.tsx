import { useQuery } from '@tanstack/react-query';
import { FileUp, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { LibraryCollectionCard } from '../../components/library/LibraryCollectionCard';
import { LibraryEmptyState } from '../../components/library/LibraryEmptyState';
import { LibraryPagination } from '../../components/library/LibraryPagination';
import { libraryApi } from '../../services/domain';

const accents = ['blue', 'purple', 'yellow', 'red'] as const;

export function LibraryPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const collections = useQuery({
    queryKey: ['library-collections', search, page],
    queryFn: () =>
      libraryApi
        .collections({ page, limit: 24, search: search.trim() || undefined })
        .then((response) => response.data),
  });
  const isAdmin = user?.role === 'ADMIN';
  return (
    <div className="library-page">
      <section className="library-hero">
        <div>
          <span className="eyebrow">VIVIORA DIGITAL LIBRARY</span>
          <h1>KHÁM PHÁ THƯ VIỆN</h1>
          <p>Khám phá các kho sách được tổ chức cho hành trình đọc, học và tìm hiểu của bạn.</p>
        </div>
        {isAdmin && (
          <Link className="button secondary library-admin-link" to="/quan-tri/thu-vien">
            <FileUp size={17} /> QUẢN LÝ KHO SÁCH
          </Link>
        )}
        <label className="library-search">
          <Search size={21} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm kho sách theo tên hoặc mô tả..."
          />
        </label>
      </section>
      <div className="library-section-title">
        <span />
        <h2>KHO SÁCH</h2>
        <span />
      </div>
      {collections.isPending ? (
        <div className="state-card">Đang tải các kho sách...</div>
      ) : collections.isError ? (
        <div className="state-card error">Không thể tải thư viện lúc này.</div>
      ) : collections.data?.items.length === 0 ? (
        <LibraryEmptyState />
      ) : (
        <div className="library-collection-grid">
          {collections.data?.items.map((collection, index) => (
            <LibraryCollectionCard
              key={collection.id}
              collection={collection}
              accent={accents[index % accents.length]}
            />
          ))}
        </div>
      )}
      {collections.data && (
        <LibraryPagination {...collections.data.pagination} onPageChange={setPage} />
      )}
    </div>
  );
}
