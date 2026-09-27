import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ArrowLeft, Bookmark, Heart, ListChecks, Play, Plus, Trophy } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../auth/AuthContext';
import { libraryApi } from '../../services/domain';
import { questionBanksApi } from '../../services/domain/questionBanks';
import { BookCover } from '../../components/library/BookCover';
import { formatBookPrice } from '../../utils/formatPrice';
import { gamesApi } from '../../services/domain/games';
import { announceAchievement } from '../../components/achievements/AchievementCelebrationProvider';

export function BookPage() {
  const { bookId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['library-book', bookId],
    queryFn: () => libraryApi.book(bookId).then((response) => response.data.book),
    enabled: Boolean(bookId),
  });
  useEffect(() => {
    if (!bookId || !query.data || !user) return;
    libraryApi
      .recordView(bookId)
      .then((response) => {
        if (response.data.data.achievementEvents)
          announceAchievement(response.data.data.achievementEvents);
      })
      .catch(() => undefined);
  }, [bookId, query.data, user?.id]);
  const bankQuery = useQuery({
    queryKey: ['question-bank-by-book', bookId],
    queryFn: () => questionBanksApi.byBook(bookId).then((response) => response.data.data),
    enabled: Boolean(bookId) && (user?.role === 'ADMIN' || user?.role === 'TEACHER'),
    retry: false,
  });
  const gamesQuery = useQuery({
    queryKey: ['games-for-book', bookId],
    queryFn: () =>
      gamesApi
        .list()
        .then((response) => response.data.items.filter((game) => game.book_id === bookId)),
    enabled: Boolean(bookId),
  });
  if (query.isPending) return <div className="state-card">Đang tải thông tin đầu sách...</div>;
  if (query.isError || !query.data)
    return <div className="state-card error">Không tìm thấy đầu sách này.</div>;
  const book = query.data;
  const update = async (action: Promise<{ data: { data: { achievementEvents?: unknown } } }>) => {
    try {
      const response = await action;
      if (response.data.data.achievementEvents)
        announceAchievement(
          response.data.data.achievementEvents as Parameters<typeof announceAchievement>[0],
        );
      await query.refetch();
    } catch {
      toast.error('Không thể cập nhật tủ sách.');
    }
  };
  return (
    <div className="book-page">
      <Link to={`/thu-vien/kho/${book.collection_id}`} className="back-link">
        <ArrowLeft size={17} /> QUAY LẠI KHO SÁCH
      </Link>
      <article className="book-detail-panel">
        <BookCover book={book} className="book-detail-cover" />
        <div className="book-detail-content">
          <span className="eyebrow">{book.collection_name || 'THƯ VIỆN VIVIORA'}</span>
          <h1>{book.title}</h1>
          <p className="book-detail-author">{book.author || 'Chưa rõ tác giả'}</p>
          {user && (
            <div className="book-personal-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => void update(libraryApi.favorite(book.id, !book.is_favorite))}
              >
                <Heart size={16} fill={book.is_favorite ? 'currentColor' : 'none'} />{' '}
                {book.is_favorite ? 'BỎ YÊU THÍCH' : 'YÊU THÍCH'}
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={() => void update(libraryApi.bookmark(book.id, !book.is_bookmarked))}
              >
                <Bookmark size={16} fill={book.is_bookmarked ? 'currentColor' : 'none'} />{' '}
                {book.is_bookmarked ? 'BỎ ĐÁNH DẤU' : 'ĐÁNH DẤU'}
              </button>
            </div>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && (
            <div className="book-question-action">
              {bankQuery.data ? (
                <Link className="button primary" to={`/kho-cau-hoi/${bankQuery.data.id}`}>
                  <ListChecks size={17} /> QUẢN LÝ CÂU HỎI
                </Link>
              ) : (
                <button
                  className="button primary"
                  type="button"
                  disabled={bankQuery.isPending}
                  onClick={async () => {
                    try {
                      const response = await questionBanksApi.createForBook(book.id);
                      navigate(`/kho-cau-hoi/${response.data.data.id}`);
                    } catch {
                      toast.error('Không thể tạo kho câu hỏi cho sách này.');
                    }
                  }}
                >
                  <Plus size={17} /> TẠO KHO CÂU HỎI
                </button>
              )}
            </div>
          )}
          <section className="book-games-section">
            <div className="book-games-heading">
              <span>
                <Trophy size={18} /> GAME CỦA SÁCH
              </span>
              {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && (
                <Link to="/quan-tri/tro-choi" className="button secondary">
                  <Plus size={15} /> TẠO GAME
                </Link>
              )}
            </div>
            {gamesQuery.isPending ? (
              <p>Đang tải game...</p>
            ) : gamesQuery.data?.length ? (
              <div className="book-games-list">
                {gamesQuery.data.map((game) => (
                  <div className="book-game-row" key={game.id}>
                    <div>
                      <strong>{game.title}</strong>
                      <span>
                        {game.question_type} · {game.question_count} câu · 🏆 {game.reward_cups} CÚP
                      </span>
                    </div>
                    {user?.role === 'STUDENT' &&
                      (game.is_available ? (
                        <Link className="button primary" to={`/tro-choi/${game.id}/choi`}>
                          <Play size={15} /> CHƠI
                        </Link>
                      ) : (
                        <span className="game-unavailable-label">CHƯA KHẢ DỤNG</span>
                      ))}
                  </div>
                ))}
              </div>
            ) : (
              <p>Chưa có game cho sách này.</p>
            )}
          </section>
          <dl className="book-detail-facts">
            <div>
              <dt>NHÀ XUẤT BẢN</dt>
              <dd>{book.publisher || 'Chưa cập nhật'}</dd>
            </div>
            <div>
              <dt>NĂM XUẤT BẢN</dt>
              <dd>{book.publication_year || 'Chưa cập nhật'}</dd>
            </div>
            <div>
              <dt>THỂ LOẠI</dt>
              <dd>{book.category || 'Chưa phân loại'}</dd>
            </div>
            <div>
              <dt>ĐƠN GIÁ THAM KHẢO</dt>
              <dd>{formatBookPrice(book.price) || 'Chưa cập nhật'}</dd>
            </div>
            <div>
              <dt>CUTTER</dt>
              <dd>{book.cutter || 'Chưa cập nhật'}</dd>
            </div>
          </dl>
        </div>
      </article>
    </div>
  );
}
