import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Gamepad2, Play, Search, Trash2, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { BookCover } from '../../components/library/BookCover';
import { LibraryModal } from '../../components/library/LibraryModal';
import { gamesApi, type Game, type GameQuestionType } from '../../services/domain/games';

type BankBook = {
  id: string;
  title: string;
  author?: string | null;
  cover_url?: string | null;
  question_count: number;
  mc_count: number;
  tf_count: number;
};
type FormState = {
  bookId: string;
  questionType: GameQuestionType;
  title: string;
  description: string;
  questionCount: string;
  cupReward: string;
};
const emptyForm: FormState = {
  bookId: '',
  questionType: 'MC',
  title: '',
  description: '',
  questionCount: '1',
  cupReward: '1',
};
function apiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error)
    return (
      (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
        ?.message || fallback
    );
  return fallback;
}

export function GameManagementPage({ management = false }: { management?: boolean }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const staff = management && (user?.role === 'ADMIN' || user?.role === 'TEACHER');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Game | null>(null);
  const [deleting, setDeleting] = useState<Game | null>(null);
  const [bookSearch, setBookSearch] = useState('');
  const [bookSearchFocused, setBookSearchFocused] = useState(false);
  const games = useQuery({
    queryKey: ['games'],
    queryFn: () => gamesApi.list().then((response) => response.data.items),
  });
  const bankBooks = useQuery({
    queryKey: ['game-question-bank-books', bookSearch],
    queryFn: () => gamesApi.questionBankBooks(bookSearch).then((response) => response.data.items),
    enabled: Boolean(staff && bookSearchFocused),
  });
  const selectedBook = bankBooks.data?.find((book) => book.id === form.bookId);
  const maxQuestions = selectedBook?.[form.questionType === 'MC' ? 'mc_count' : 'tf_count'] || 0;
  const count = Number(form.questionCount);
  const cupReward = Number(form.cupReward);
  const create = useMutation({
    mutationFn: () =>
      gamesApi.create({
        bookId: form.bookId,
        questionType: form.questionType,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        questionCount: count,
        cupReward,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['games'] });
      setForm(emptyForm);
      setBookSearch('');
      toast.success('Đã tạo game');
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, 'Không thể tạo game.')),
  });
  const update = useMutation({
    mutationFn: () =>
      gamesApi.update(editing!.id, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        questionCount: count,
        cupReward,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['games'] });
      setEditing(null);
      toast.success('Đã cập nhật game');
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, 'Không thể cập nhật game.')),
  });
  const remove = useMutation({
    mutationFn: () => gamesApi.remove(deleting!.id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['games'] });
      setDeleting(null);
      toast.success('Đã xóa game');
    },
    onError: () => toast.error('Không thể xóa game.'),
  });
  const chooseBook = (book: BankBook) => {
    setForm((current) => ({ ...current, bookId: book.id, questionCount: '1' }));
    setBookSearch(book.title);
  };
  const openEdit = (game: Game) => {
    setEditing(game);
    setForm({
      bookId: game.book_id,
      questionType: game.question_type,
      title: game.title,
      description: game.description || '',
      questionCount: String(game.question_count),
      cupReward: String(game.reward_cups),
    });
  };
  if (games.isPending) return <div className="state-card">Đang tải danh sách game...</div>;
  if (games.isError) return <div className="state-card error">Không thể tải danh sách game.</div>;
  const canCreate = Boolean(
    selectedBook &&
    maxQuestions > 0 &&
    form.title.trim() &&
    count >= 1 &&
    count <= maxQuestions &&
    cupReward >= 1 &&
    Number.isInteger(cupReward) &&
    !create.isPending,
  );
  return (
    <div className="game-management-page">
      <div className="page-heading game-heading">
        <div>
          <span className="eyebrow">VIVIORA / GAME MANAGEMENT</span>
          <h1>TRÒ CHƠI</h1>
          <p>Biến những câu hỏi trong sách thành một lượt chơi có mục tiêu và phần thưởng.</p>
        </div>
        {staff && (
          <a className="button primary" href="#tao-game">
            <Gamepad2 size={17} /> TẠO GAME
          </a>
        )}
      </div>
      {staff && (
        <section className="game-create-panel game-create-flow" id="tao-game">
          <div className="panel-head yellow">
            <Gamepad2 size={18} /> TẠO GAME TỪ QUESTION BANK
          </div>
          <div className="game-create-intro">
            Chọn một bộ câu hỏi để biến thành trò chơi. Bạn có thể đặt phần thưởng riêng cho từng
            game.
          </div>
          <div className="game-form-grid">
            <div className="game-book-field">
              <span className="game-field-label">BOOK / QUESTION BANK</span>
              <div className={`game-book-selector ${selectedBook ? 'selected' : ''}`}>
                <Search size={18} aria-hidden="true" />
                <input
                  value={bookSearch}
                  placeholder="Tìm sách có câu hỏi..."
                  aria-label="Tìm sách có câu hỏi"
                  onFocus={() => setBookSearchFocused(true)}
                  onChange={(event) => {
                    setBookSearch(event.target.value);
                    setForm((current) => ({ ...current, bookId: '' }));
                  }}
                />
                {selectedBook && (
                  <button
                    type="button"
                    className="game-book-clear"
                    onClick={() => {
                      setBookSearch('');
                      setForm((current) => ({ ...current, bookId: '' }));
                    }}
                  >
                    ĐỔI SÁCH
                  </button>
                )}
              </div>
              {!selectedBook && bookSearchFocused && bankBooks.data?.length ? (
                <div className="game-book-results">
                  {bankBooks.data.map((book) => (
                    <button
                      type="button"
                      key={book.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        chooseBook(book);
                        setBookSearchFocused(false);
                      }}
                    >
                      <span>{book.title}</span>
                      <small>
                        {book.mc_count} MC · {book.tf_count} TF · {book.question_count} câu
                      </small>
                    </button>
                  ))}
                </div>
              ) : null}
              {!selectedBook &&
                !bankBooks.isPending &&
                !bankBooks.data?.length &&
                bookSearch.trim() && (
                  <p className="game-book-empty">Không tìm thấy sách có câu hỏi phù hợp.</p>
                )}
              {selectedBook && (
                <div className="game-bank-summary">
                  <BookCover book={{ ...selectedBook, category: null }} compact />
                  <div>
                    <span className="game-bank-kicker">ĐÃ CHỌN</span>
                    <strong>{selectedBook.title}</strong>
                    <span>
                      {form.questionType} ·{' '}
                      {form.questionType === 'MC' ? 'MINESWEEPER' : 'TREASURE HUNT'}
                    </span>
                    <b>{maxQuestions} câu hỏi phù hợp</b>
                  </div>
                </div>
              )}
            </div>
            <div className="game-info-fields">
              <label>
                LOẠI CÂU HỎI
                <select
                  value={form.questionType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      questionType: event.target.value as GameQuestionType,
                      questionCount: '1',
                    }))
                  }
                >
                  <option value="MC">MC · MINESWEEPER</option>
                  <option value="TF">TF · TREASURE HUNT</option>
                </select>
              </label>
              <label>
                TÊN GAME
                <input
                  value={form.title}
                  maxLength={180}
                  placeholder="Chiến dịch phá mìn"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>
              <label>
                SỐ CÂU HỎI
                <input
                  type="number"
                  min="1"
                  max={maxQuestions || undefined}
                  value={form.questionCount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, questionCount: event.target.value }))
                  }
                />
                {selectedBook && <small>Tối đa {maxQuestions} câu hỏi</small>}
              </label>
              <label>
                CÚP THƯỞNG
                <input
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  value={form.cupReward}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cupReward: event.target.value }))
                  }
                />
                <small>Số cúp nhận được khi hoàn thành toàn bộ game</small>
              </label>
            </div>
            <label className="game-form-wide">
              MÔ TẢ
              <textarea
                value={form.description}
                maxLength={2000}
                rows={3}
                placeholder="Một lời mời ngắn cho người chơi..."
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="game-form-note">
            {selectedBook ? (
              <>
                Game sẽ chọn ngẫu nhiên <strong>{count || 0}</strong> câu {form.questionType} từ
                Question Bank của sách này.
              </>
            ) : (
              'Chỉ những sách có câu hỏi thực tế mới xuất hiện trong danh sách.'
            )}
          </div>
          <div className="profile-form-actions">
            <button
              className="button primary"
              type="button"
              disabled={!canCreate}
              onClick={() => create.mutate()}
            >
              <Gamepad2 size={17} /> {create.isPending ? 'ĐANG TẠO...' : 'TẠO GAME'}
            </button>
          </div>
        </section>
      )}
      {!games.data.length ? (
        <div className="state-card empty-state">
          <Gamepad2 size={38} />
          <h2>CHƯA CÓ GAME</h2>
          <p>
            {staff
              ? 'Tạo game đầu tiên từ Question Bank của một đầu sách.'
              : 'Các game dành cho học sinh sẽ xuất hiện tại đây.'}
          </p>
        </div>
      ) : (
        <div className="game-grid">
          {games.data.map((game) => (
            <article
              className={`game-card ${game.is_available ? '' : 'unavailable'}`}
              key={game.id}
            >
              <div className={`game-card-strip ${game.question_type.toLowerCase()}`} />
              <header>
                <span className="game-theme">
                  {game.question_type === 'MC' ? 'MINESWEEPER' : 'TREASURE HUNT'}
                </span>
                <strong>{game.question_type}</strong>
              </header>
              <div className="game-card-body">
                <div className="game-card-book">
                  <BookCover book={{ ...game.book, category: null }} compact />
                  <div>
                    <h2>{game.title}</h2>
                    <p>{game.book.title}</p>
                  </div>
                </div>
                <div className={`game-reward ${game.cup_earned_today ? 'claimed' : ''}`}>
                  <Trophy size={19} />
                  <strong>{game.reward_cups} CUP</strong>
                  <span>{game.cup_earned_today ? 'Đã nhận hôm nay' : 'Hoàn thành toàn bộ game để nhận'}</span>
                </div>
                <div className="game-metrics">
                  <div>
                    <span>SỐ CÂU</span>
                    <strong>{game.question_count}</strong>
                  </div>
                  <div>
                    <span>TRẠNG THÁI</span>
                    <strong>{game.is_available ? 'SẴN SÀNG' : 'TẠM DỪNG'}</strong>
                  </div>
                </div>
              </div>
              <footer>
                {staff ? (
                  <>
                    <button
                      className="icon-button"
                      title="Chỉnh sửa game"
                      onClick={() => openEdit(game)}
                    >
                      <Edit3 size={17} />
                    </button>
                    <button
                      className="icon-button destructive"
                      title="Xóa game"
                      onClick={() => setDeleting(game)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </>
                ) : (
                  <Link className="button primary" to={`/tro-choi/${game.id}/choi`}>
                    <Play size={16} /> CHƠI GAME
                  </Link>
                )}
              </footer>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <LibraryModal title="CHỈNH SỬA TRÒ CHƠI" onClose={() => setEditing(null)}>
          <div className="game-modal-copy">
            <p>Sách và loại câu hỏi được khóa để bảo toàn logic của game.</p>
            <label>
              TÊN GAME
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            <label>
              SỐ CÂU HỎI
              <input
                type="number"
                min="1"
                value={form.questionCount}
                onChange={(event) => setForm({ ...form, questionCount: event.target.value })}
              />
            </label>
            <label>
              CÚP THƯỞNG
              <input
                type="number"
                min="1"
                value={form.cupReward}
                onChange={(event) => setForm({ ...form, cupReward: event.target.value })}
              />
            </label>
            <label>
              MÔ TẢ
              <textarea
                value={form.description}
                rows={3}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
          </div>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setEditing(null)}>
              HỦY
            </button>
            <button
              className="button primary"
              onClick={() => update.mutate()}
              disabled={update.isPending || cupReward < 1}
            >
              LƯU THAY ĐỔI
            </button>
          </div>
        </LibraryModal>
      )}
      {deleting && (
        <LibraryModal title="XÓA TRÒ CHƠI?" onClose={() => setDeleting(null)}>
          <div className="delete-modal-copy">
            <p>
              Bạn có chắc chắn muốn xóa <strong>{deleting.title}</strong>? Question Bank và câu hỏi
              gốc vẫn được bảo toàn.
            </p>
          </div>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setDeleting(null)}>
              GIỮ LẠI
            </button>
            <button
              className="button danger"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              <Trash2 size={16} /> XÁC NHẬN XÓA
            </button>
          </div>
        </LibraryModal>
      )}
    </div>
  );
}
