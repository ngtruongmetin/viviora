import { Bell, CircleUserRound, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
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
  return (
    <header className="topbar">
      <Link to="/" className="wordmark">
        VIVIORA
      </Link>
      <div className="search">
        <Search size={18} />
        <input placeholder="Tìm kiếm sách, bài viết..." />
      </div>
      <nav className="topnav">
        {links.map(([to, label]) => (
          <Link className={location.pathname === to || (to === '/thu-vien' && location.pathname.startsWith('/thu-vien')) ? 'active' : ''} to={to} key={to}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="top-actions">
        <Link to="/thong-bao" aria-label="Thông báo">
          <Bell size={21} />
        </Link>
        <Link to={user ? `/nguoi-dung/${user.id}` : '/dang-nhap'} className="user-profile-link" title="Hồ sơ" aria-label="Hồ sơ">
          {user ? <UserAvatar name={user.name} avatarUrl={user.avatar_url} size="small" /> : <CircleUserRound size={21} />}
        </Link>
      </div>
    </header>
  );
}
