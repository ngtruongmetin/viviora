import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Gamepad2, Plus, Send } from 'lucide-react';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { PostCard } from '../../components/community/PostCard';
import { feedApi, gamesApi, libraryApi } from '../../services/domain';
import type { Game } from '../../services/domain/games';
import { useIntersectionSentinel } from '../../hooks/useIntersectionSentinel';
import type { Book, FeedPost } from '../../types/models';
import { useAuth } from '../../auth/AuthContext';
import { UserAvatar } from '../../components/common/UserAvatar';
import { BookCover } from '../../components/library/BookCover';
import { announceAchievement } from '../../components/achievements/AchievementCelebrationProvider';

function Composer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [type, setType] = useState<'TEXT' | 'BOOK_REVIEW' | 'GAME_REVIEW'>('TEXT');
  const [bookSearch, setBookSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [gameSearch, setGameSearch] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const booksQuery = useQuery({
    queryKey: ['composer-books', bookSearch],
    queryFn: () => libraryApi.searchBooks(bookSearch).then((response) => response.data.items),
    enabled: type === 'BOOK_REVIEW' && bookSearch.trim().length >= 2,
  });
  const gamesQuery = useQuery({ queryKey: ['composer-games', gameSearch], queryFn: () => gamesApi.list().then((response) => response.data.items.filter((game) => game.title.toLowerCase().includes(gameSearch.toLowerCase())).slice(0, 8)), enabled: type === 'GAME_REVIEW' && gameSearch.trim().length >= 2 });
  const publish = async () => {
    if (!content.trim() || (type === 'BOOK_REVIEW' && !selectedBook) || (type === 'GAME_REVIEW' && !selectedGame)) return;
    const response = await feedApi.createPost({
      type,
      content: content.trim(),
      bookId: selectedBook?.id || null, gameId: selectedGame?.id || null,
    });
    if (response.data.data.achievementEvents)
      announceAchievement(response.data.data.achievementEvents);
    if (response.data.data.workflowStatus === 'PUBLISHED' && response.data.data.post) {
      queryClient.setQueryData<{
        pages: Array<{ items: FeedPost[]; nextCursor: string | null }>;
        pageParams: unknown[];
      }>(['feed'], (current) => {
        if (!current) return current;
        const existing = current.pages.some((page) =>
          page.items.some((item) => item.id === response.data.data.post?.id),
        );
        if (existing) return current;
        return {
          ...current,
          pages: current.pages.map((page, index) =>
            index === 0 ? { ...page, items: [response.data.data.post!, ...page.items] } : page,
          ),
        };
      });
      toast.success('Đã đăng bài thành công.');
    } else {
      toast.success('Bài đăng đã được gửi để kiểm duyệt.');
    }
    setOpen(false);
    setContent('');
    setSelectedBook(null);
    setSelectedGame(null); setGameSearch('');
    setBookSearch('');
    setType('TEXT');
  };
  return (
    <section className="feed-composer">
      {user && <UserAvatar name={user.name} avatarUrl={user.avatar_url} />}
      {open ? (
        <div className="feed-composer-form">
          <div className="feed-composer-mode">
            <button
              type="button"
              className={type === 'TEXT' ? 'selected' : ''}
              onClick={() => {
                setType('TEXT');
                setSelectedBook(null);
              }}
            >
              BÀI VIẾT
            </button>
            <button type="button" className={type === 'GAME_REVIEW' ? 'selected' : ''} onClick={() => { setType('GAME_REVIEW'); setSelectedBook(null); }}><Gamepad2 size={16} /> ĐÁNH GIÁ GAME</button>
            <button
              type="button"
              className={type === 'BOOK_REVIEW' ? 'selected' : ''}
              onClick={() => setType('BOOK_REVIEW')}
            >
              <BookOpen size={16} /> ĐÁNH GIÁ SÁCH
            </button>
          </div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Viết điều bạn muốn chia sẻ..."
          />
          {type === 'BOOK_REVIEW' && (
            <div className="feed-composer-book-picker">
              <input
                value={bookSearch}
                onChange={(event) => setBookSearch(event.target.value)}
                placeholder="Tìm sách để đánh giá..."
              />
              {booksQuery.data?.map((book) => (
                <button
                  type="button"
                  key={book.id}
                  onClick={() => {
                    setSelectedBook(book);
                    setBookSearch('');
                  }}
                >
                  <BookCover book={book} compact />
                  <span>
                    {book.title}
                    <small>{book.author}</small>
                  </span>
                </button>
              ))}
              {selectedBook && (
                <div className="feed-composer-selected-book">
                  <BookCover book={selectedBook} compact />
                  <span>
                    {selectedBook.title}
                    <small>{selectedBook.author}</small>
                  </span>
                </div>
              )}
            </div>
          )}
          {type === 'GAME_REVIEW' && <div className="feed-composer-book-picker"><input value={gameSearch} onChange={(event) => setGameSearch(event.target.value)} placeholder="Tìm game để đánh giá..." />{gamesQuery.data?.map((game) => <button type="button" key={game.id} onClick={() => { setSelectedGame(game); setGameSearch(''); }}><span>{game.title}<small>{game.book.title}</small></span></button>)}{selectedGame && <div className="feed-composer-selected-book"><span>{selectedGame.title}<small>{selectedGame.book.title}</small></span></div>}</div>}
          <div className="feed-composer-actions">
            <button className="button secondary" onClick={() => setOpen(false)}>
              HỦY
            </button>
            <button className="button primary" onClick={() => void publish()}>
              <Send size={17} /> ĐĂNG BÀI
            </button>
          </div>
        </div>
      ) : (
        <>
          <button className="feed-composer-trigger" onClick={() => setOpen(true)}>
            Chia sẻ hành trình đọc sách của bạn...
          </button>
          <button className="button primary" onClick={() => setOpen(true)}>
            <Plus size={18} /> ĐĂNG
          </button>
        </>
      )}
    </section>
  );
}

export function FeedPage() {
  const query = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => feedApi.list(pageParam).then((response) => response.data),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor || undefined,
  });
  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);
  const sentinel = useIntersectionSentinel(loadMore, Boolean(query.hasNextPage));
  return (
    <div className="feed-page">
      <div className="feed-heading page-heading">
        <div>
          <span className="eyebrow">BẢNG TIN CỘNG ĐỒNG</span>
          <h1>ĐỌC. CHIA SẺ. KẾT NỐI.</h1>
          <p>Những câu chuyện đọc sách thật từ học sinh, giáo viên và Thủ thư Viviora.</p>
        </div>
      </div>
      <Composer />
      {query.isPending ? (
        <div className="state-card">Đang tải những bài viết mới...</div>
      ) : query.isError ? (
        <div className="state-card error">Không thể kết nối bảng tin.</div>
      ) : query.data?.pages.flatMap((page) => page.items).length === 0 ? (
        <div className="state-card empty-state">
          <span className="eyebrow">BẢNG TIN ĐANG TRỐNG</span>
          <h2>CHƯA CÓ BÀI ĐĂNG</h2>
          <p>Chưa có câu chuyện đọc sách nào được chia sẻ.</p>
        </div>
      ) : (
        <div className="feed-post-list">
          {query.data?.pages
            .flatMap((page) => page.items)
            .map((post: FeedPost) => (
              <PostCard key={post.id} post={post} />
            ))}
        </div>
      )}
      <div ref={sentinel} className="feed-sentinel">
        {query.isFetchingNextPage
          ? 'Đang tải thêm...'
          : query.hasNextPage
            ? ''
            : 'Bạn đã xem hết bảng tin'}
      </div>
    </div>
  );
}
