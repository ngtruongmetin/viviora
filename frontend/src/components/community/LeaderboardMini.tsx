import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { leaderboardApi, type LeaderboardEntry } from '../../services/domain/leaderboard';
import { UserAvatar } from '../common/UserAvatar';

function MiniRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <Link className="leaderboard-mini-row" to={`/nguoi-dung/${entry.id}`}>
      <strong>{String(entry.rank).padStart(2, '0')}</strong>
      <UserAvatar name={entry.name} avatarUrl={entry.avatar_url} size="small" />
      <span>
        <b>@{entry.username}</b>
        <small>
          LV {entry.level} · {entry.cups} CÚP
        </small>
      </span>
    </Link>
  );
}

export function LeaderboardMini() {
  const query = useQuery({
    queryKey: ['leaderboard', 3],
    queryFn: () => leaderboardApi.list(3).then((response) => response.data.items),
  });
  return (
    <aside className="leaderboard-mini">
      <div className="panel-head yellow">BẢNG XẾP HẠNG</div>
      {query.isPending ? (
        <div className="trend-empty">
          <span>Đang tải...</span>
        </div>
      ) : query.isError ? (
        <div className="trend-empty">
          <span>Không thể tải bảng xếp hạng.</span>
        </div>
      ) : query.data?.length ? (
        <>
          {query.data.map((entry) => (
            <MiniRow entry={entry} key={entry.id} />
          ))}
          <Link className="trend-more leaderboard-more" to="/bang-xep-hang">
            XEM THÊM
          </Link>
        </>
      ) : (
        <div className="trend-empty">
          <span>Chưa có người chơi.</span>
        </div>
      )}
    </aside>
  );
}
