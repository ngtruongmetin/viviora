import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { announceAchievement } from '../components/achievements/AchievementCelebrationProvider';
import { BookCard } from '../components/library/BookCard';
import { libraryApi } from '../services/domain';

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q')?.trim() || '';
  const result = useQuery({
    queryKey: ['global-search', query],
    queryFn: async () => {
      const response = await libraryApi.searchBooks(query);
      if (response.data.achievementEvents) announceAchievement(response.data.achievementEvents);
      return response.data;
    },
    enabled: query.length > 0,
  });
  return (
    <div className="search-results-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">TÌM KIẾM</span>
          <h1>KẾT QUẢ CHO “{query}”</h1>
          <p>Tìm thấy sách theo tên, tác giả hoặc nhà xuất bản.</p>
        </div>
        <Search size={42} />
      </header>
      {result.isPending ? (
        <div className="state-card">Đang tìm kiếm...</div>
      ) : result.data?.items?.length ? (
        <div className="book-grid">
          {result.data.items.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className="state-card empty-state">Không tìm thấy sách phù hợp.</div>
      )}
    </div>
  );
}
