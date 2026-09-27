import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { leaderboardApi, type LeaderboardEntry } from '../../services/domain/leaderboard';
import { UserAvatar } from '../../components/common/UserAvatar';

function Podium({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  return (
    <Link className={`leaderboard-podium-card place-${place}`} to={`/nguoi-dung/${entry.id}`}>
      <span className="leaderboard-podium-place">{place}</span>
      <UserAvatar name={entry.name} avatarUrl={entry.avatar_url} size="large" />
      <strong>@{entry.username}</strong>
      <span>
        LV {entry.level} · {entry.cups} CÚP
      </span>
    </Link>
  );
}

export function LeaderboardPage() {
  const [week, setWeek] = useState<'current' | string>('current');
  const query = useQuery({
    queryKey: ['leaderboard', 'all', week],
    queryFn: () => leaderboardApi.list(100, week).then((response) => response.data.items),
  });
  const weeks = useQuery({
    queryKey: ['leaderboard-weeks'],
    queryFn: () => leaderboardApi.weeks().then((response) => response.data.items),
  });
  const entries = query.data || [];
  return (
    <div className="leaderboard-page">
      <Link className="back-link" to="/bang-tin">
        <ArrowLeft size={17} /> QUAY LẠI BẢNG TIN
      </Link>
      <header className="page-heading leaderboard-heading">
        <div>
          <span className="eyebrow">CỘNG ĐỒNG / CÚP</span>
          <h1>BẢNG XẾP HẠNG</h1>
          <p>Thứ hạng tính theo cúp tuần, level, đánh giá sách đã duyệt và bài đăng thường.</p>
        </div>
        <Trophy size={46} />
      </header>
      <div className="leaderboard-week-tabs">
        <button className={week === 'current' ? 'selected' : ''} onClick={() => setWeek('current')}>
          TUẦN HIỆN TẠI
        </button>
        {weeks.data?.map((item) => (
          <button
            key={item.week_start}
            className={week === item.week_start ? 'selected' : ''}
            onClick={() => setWeek(item.week_start)}
          >
            {item.week_start} → {item.week_end}
          </button>
        ))}
      </div>
      {query.isPending ? (
        <div className="state-card">Đang tải bảng xếp hạng...</div>
      ) : query.isError ? (
        <div className="state-card error">Không thể tải bảng xếp hạng.</div>
      ) : entries.length === 0 ? (
        <div className="state-card empty-state">Chưa có người chơi đủ điều kiện.</div>
      ) : (
        <>
          <section className="leaderboard-podium">
            {entries.slice(0, 3).map((entry, index) => (
              <Podium key={entry.id} entry={entry} place={(index + 1) as 1 | 2 | 3} />
            ))}
          </section>
          <section className="leaderboard-list">
            {entries.slice(3).map((entry) => (
              <Link className="leaderboard-list-row" to={`/nguoi-dung/${entry.id}`} key={entry.id}>
                <strong>{String(entry.rank).padStart(2, '0')}</strong>
                <UserAvatar name={entry.name} avatarUrl={entry.avatar_url} size="small" />
                <span>
                  <b>@{entry.username}</b>
                  <small>
                    LV {entry.level} · {entry.book_reviews} đánh giá · {entry.regular_posts} bài
                    đăng
                  </small>
                </span>
                <em>{entry.cups} CÚP</em>
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
