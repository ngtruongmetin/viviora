import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ProfilePage } from './ProfilePage';
import { usersApi } from '../../services/domain/users';
import { UserAvatar } from '../../components/common/UserAvatar';
import { PostCard } from '../../components/community/PostCard';

export function PublicProfilePage() {
  const { userId = '' } = useParams();
  const { user: currentUser } = useAuth();
  const query = useQuery({ queryKey: ['public-user', userId], queryFn: () => usersApi.get(userId).then((response) => response.data.data), enabled: Boolean(userId) && currentUser?.id !== userId });
  if (currentUser?.id === userId) return <ProfilePage />;
  if (query.isPending) return <div className="state-card">Đang tải hồ sơ...</div>;
  if (query.isError || !query.data) return <div className="state-card error">Không tìm thấy hồ sơ người dùng.</div>;
  const user = query.data;
  return <div className="profile-page public-profile-page"><Link className="back-link" to="/"><ArrowLeft size={17} /> QUAY LẠI BẢNG TIN</Link><section className="profile-hero public-profile-hero"><div className="profile-identity"><UserAvatar name={user.name} avatarUrl={user.avatar_url} size="large" /><div><span className="eyebrow">HỒ SƠ CỘNG ĐỒNG</span><h1>{user.name}</h1><div className="profile-tags"><span>{user.roleLabel}</span></div><p>{user.bio || 'Chưa có mô tả hồ sơ.'}</p>{user.role === 'STUDENT' && user.class_name && <span className="profile-public-tag">LỚP {user.class_name}</span>}{user.role === 'TEACHER' && user.specialization && <span className="profile-public-tag">{user.specialization}</span>}</div></div></section><section className="profile-panel profile-trophy-panel"><div className="panel-head yellow">THÀNH TỰU / CÚP</div><div className="profile-achievement-hero"><div className="profile-trophy-value"><strong>{user.trophy_count ?? 0}</strong><div><span>CÚP ĐÃ NHẬN</span><small>Tổng số cúp từ các game đã hoàn thành</small></div></div><div className="profile-level-badge"><span>LEVEL</span><strong>{user.level ?? 1}</strong></div></div><div className="profile-exp-line"><strong>{user.exp ?? 0} EXP</strong><span>TIẾN TRÌNH LEVEL</span></div><div className="profile-achievements-earned"><h2>THÀNH TỰU ĐÃ ĐẠT</h2>{user.achievements?.length ? <div className="achievement-earned-grid">{user.achievements.map((achievement) => <article className="achievement-earned-card" key={achievement.code}><strong>{achievement.name}</strong><span>+{achievement.exp_reward} EXP</span></article>)}</div> : <div className="empty-inline">Chưa có thành tựu nào được mở khóa.</div>}</div></section><section className="profile-panel"><div className="panel-head">THÔNG TIN CÔNG KHAI</div><dl><div><dt>HỌ VÀ TÊN</dt><dd>{user.name}</dd></div><div><dt>USERNAME</dt><dd>{user.username}</dd></div><div><dt>VAI TRÒ</dt><dd>{user.roleLabel}</dd></div><div><dt>MÔ TẢ</dt><dd>{user.bio || 'Chưa cập nhật'}</dd></div>{user.role === 'STUDENT' && <div><dt>LỚP</dt><dd>{user.class_name || 'Chưa cập nhật'}</dd></div>}{user.role === 'TEACHER' && <div><dt>TỔ CHUYÊN MÔN</dt><dd>{user.specialization || 'Chưa cập nhật'}</dd></div>}</dl></section><section className="public-profile-posts"><div className="panel-head"><FileText size={18} /> BÀI ĐĂNG CỦA {user.name.toUpperCase()}</div>{user.posts.length ? user.posts.map((post) => <PostCard key={post.id} post={post} />) : <div className="empty-inline">Chưa có bài đăng được công khai.</div>}</section></div>;
}
