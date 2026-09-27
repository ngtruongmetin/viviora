import { CircleUserRound, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { UserAvatar } from '../common/UserAvatar';

const links = [
  ['/bang-tin', 'Bảng tin'],
  ['/tro-choi', 'Trò chơi'],
  ['/thu-vien', 'Thư viện'],
];

export function Header() {
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get('q')?.toString().trim();
    if (query) navigate(`/tim-kiem?q=${encodeURIComponent(query)}`);
  };
  return (
    <header className="topbar">
      <Link to="/" className="wordmark">
        VIVIORA
      </Link>
      <form className="search" onSubmit={submitSearch}>
        <Search size={18} />
        <input name="q" placeholder="Tìm kiếm sách, bài viết..." />
      </form>
      <nav className="topnav">
        {links.map(([to, label]) => (
          <Link
            className={
              location.pathname === to ||
              (to === '/thu-vien' && location.pathname.startsWith('/thu-vien'))
                ? 'active'
                : ''
            }
            to={to}
            key={to}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="top-actions">
        <Link
          to={user ? `/nguoi-dung/${user.id}` : '/dang-nhap'}
          className="user-profile-link"
          title="Hồ sơ"
          aria-label="Hồ sơ"
        >
          {user ? (
            <UserAvatar name={user.name} avatarUrl={user.avatar_url} size="small" />
          ) : (
            <CircleUserRound size={21} />
          )}
        </Link>
      </div>
    </header>
  );
}
