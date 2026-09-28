import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { announceAchievement } from '../components/achievements/AchievementCelebrationProvider';
import { BookCard } from '../components/library/BookCard';
import { libraryApi } from '../services/domain';
import { Link } from 'react-router-dom';

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
      ) : result.data?.items?.length || result.data?.games?.length ? (
        <>
          {result.data.items.length > 0 && <><h2 className="search-section-title">SÁCH</h2><div className="book-grid">{result.data.items.map((book) => <BookCard key={book.id} book={book} />)}</div></>}
          {result.data.games.length > 0 && <><h2 className="search-section-title">TRÒ CHƠI</h2><div className="game-grid search-game-grid">{result.data.games.map((game) => <Link className="game-card search-game-card" key={game.id} to={`/tro-choi/${game.id}/choi`}><div className={`game-card-strip ${game.question_type.toLowerCase()}`} /><div className="search-game-content"><div className="search-game-kicker">{game.question_type === 'MC' ? 'MINESWEEPER' : 'TREASURE HUNT'}</div><h2>{game.title}</h2><p className="search-game-book">{game.book_title}</p><div className={`search-game-meta ${game.cup_earned_today ? 'claimed' : ''}`}><strong>{game.reward_cups} CUP</strong><span>{game.cup_earned_today ? 'ĐÃ NHẬN HÔM NAY' : `${game.question_type} · ${game.question_count} câu`}</span></div></div></Link>)}</div></>}
        </>
      ) : (
        <div className="state-card empty-state">Không tìm thấy sách phù hợp.</div>
      )}
    </div>
  );
}
