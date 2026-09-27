import {
  CircleUserRound,
  FolderCog,
  Home,
  ShieldCheck,
  Trophy,
  Gamepad2,
  Award,
  Users,
  ListChecks,
  ClipboardCheck,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { roleLabel } from '../../utils/roles';
import { UserAvatar } from '../common/UserAvatar';

const navigation = [
  ['/bang-tin', 'Bảng tin', Home],
  ['/tro-choi', 'Trò chơi', Trophy],
  ['/thu-vien', 'Thư viện', Users],
  ['/nhiem-vu-tuan', 'Nhiệm vụ tuần', ClipboardCheck],
  ['/ho-so', 'Hồ sơ', CircleUserRound],
] as const;

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  return (
    <aside className="rail">
      <div className="profile-mini">
        {user && <UserAvatar name={user.name} avatarUrl={user.avatar_url} />}
        <div>
          <strong>{user?.name}</strong>
          <span>{user ? roleLabel(user.role) : 'Đang tải'}</span>
        </div>
      </div>
      <nav className="rail-nav">
        {navigation.map(([to, label, Icon]) => (
          <Link
            className={
              location.pathname === to ||
              (to === '/thu-vien' && location.pathname.startsWith('/thu-vien')) ||
              (to === '/ho-so' && location.pathname.startsWith('/nguoi-dung/'))
                ? 'selected'
                : ''
            }
            to={to === '/ho-so' && user ? `/nguoi-dung/${user.id}` : to}
            key={to}
          >
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
        {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
          <Link className={location.pathname === '/duyet-bai' ? 'selected' : ''} to="/duyet-bai">
            <Users size={21} />
            <span>Quản lý bài đăng</span>
          </Link>
        )}
        {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
          <Link
            className={location.pathname.startsWith('/kho-cau-hoi') ? 'selected' : ''}
            to="/kho-cau-hoi"
          >
            <ListChecks size={21} />
            <span>Quản lý câu hỏi</span>
          </Link>
        )}
        {user?.role === 'ADMIN' && (
          <Link
            className={location.pathname.startsWith('/quan-tri/thanh-tuu') ? 'selected' : ''}
            to="/quan-tri/thanh-tuu"
          >
            <Award size={21} />
            <span>Quản lý thành tựu</span>
          </Link>
        )}
        {user?.role === 'ADMIN' && (
          <Link
            className={location.pathname.startsWith('/quan-tri/tro-choi') ? 'selected' : ''}
            to="/quan-tri/tro-choi"
          >
            <Gamepad2 size={21} />
            <span>Quản lý trò chơi</span>
          </Link>
        )}
        {user?.role === 'ADMIN' && (
          <Link
            className={location.pathname.startsWith('/quan-tri/thu-vien') ? 'selected' : ''}
            to="/quan-tri/thu-vien"
          >
            <FolderCog size={21} />
            <span>Quản lý thư viện</span>
          </Link>
        )}
        {user?.role === 'ADMIN' && (
          <Link
            className={location.pathname.startsWith('/quan-tri/thanh-vien') ? 'selected' : ''}
            to="/quan-tri/thanh-vien"
          >
            <ShieldCheck size={21} />
            <span>Quản lý thành viên</span>
          </Link>
        )}
      </nav>
    </aside>
  );
}
