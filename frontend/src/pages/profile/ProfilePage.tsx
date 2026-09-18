import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import Cropper from 'react-easy-crop';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, LogOut, Pencil, Trash2, Trophy, Upload, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../auth/AuthContext';
import { profileApi } from '../../services/domain';
import { roleLabel } from '../../utils/roles';
import type { CurrentUser } from '../../types/models';
import { UserAvatar } from '../../components/common/UserAvatar';
import { formatDateTime } from '../../utils/dateTime';
import { usersApi } from '../../services/domain/users';
import { PostCard } from '../../components/community/PostCard';
import { LibraryModal } from '../../components/library/LibraryModal';

type FormState = {
  name: string;
  email: string;
  bio: string;
  gender: '' | 'Nam' | 'Nữ';
  avatarUrl: string;
};

type CropPoint = { x: number; y: number };
type CropArea = { x: number; y: number; width: number; height: number };

const maxAvatarSize = 5 * 1024 * 1024;
const acceptedAvatarTypes = ['image/jpeg', 'image/png', 'image/webp'];

async function createCroppedAvatar(imageSrc: string, area: CropArea) {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; });
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas không khả dụng.');
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, 1024, 1024);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('Không thể tạo ảnh đã crop.');
  return new File([blob], 'viviora-avatar.jpg', { type: 'image/jpeg' });
}

function toForm(user: CurrentUser): FormState {
  return {
    name: user.name,
    email: user.email || '',
    bio: user.bio || '',
    gender: user.gender === 'Nam' || user.gender === 'Nữ' ? user.gender : '',
    avatarUrl: user.avatar_url || '',
  };
}

function LogoutModal({ onCancel, onConfirm, loading, error }: { onCancel: () => void; onConfirm: () => void; loading: boolean; error: string }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="viviora-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title">
        <span className="eyebrow">KẾT THÚC PHIÊN</span>
        <h2 id="logout-title">ĐĂNG XUẤT KHỎI VIVIORA?</h2>
        <p>Phiên đăng nhập hiện tại sẽ được kết thúc trên thiết bị này.</p>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onCancel} disabled={loading}>HỦY</button>
          <button type="button" className="button danger" onClick={onConfirm} disabled={loading}>
            <LogOut size={17} /> {loading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG XUẤT'}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const postsQuery = useQuery({
    queryKey: ['profile-posts', user?.id],
    queryFn: () => usersApi.get(user!.id).then((response) => response.data.data.posts),
    enabled: Boolean(user?.id),
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => (user ? toForm(user) : { name: '', email: '', bio: '', gender: '', avatarUrl: '' }));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropPoint>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [cropping, setCropping] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    if (user && !editing) setForm(toForm(user));
  }, [user, editing]);

  useEffect(() => {
    profileApi.get().then((response) => updateUser(response.data.data)).catch(() => undefined);
  }, [updateUser]);

  useEffect(() => () => { if (cropSource) URL.revokeObjectURL(cropSource); }, [cropSource]);

  if (!user) return <div className="state-card">Đang tải hồ sơ...</div>;
  const currentExp = user.exp ?? 0;
  const currentLevelExp = user.current_level_exp ?? 0;
  const nextLevelExp = user.next_level_exp ?? null;
  const expSpan = nextLevelExp === null ? 1 : Math.max(1, nextLevelExp - currentLevelExp);
  const expProgress = nextLevelExp === null ? 100 : Math.min(100, Math.max(0, ((currentExp - currentLevelExp) / expSpan) * 100));
  const allAchievements = user.achievements || [];
  const unlockedAchievements = allAchievements.filter((item) => item.unlocked);
  const visibleAchievements = achievementFilter === 'all' ? allAchievements : allAchievements.filter((item) => achievementFilter === 'unlocked' ? item.unlocked : !item.unlocked);

  const startEditing = () => {
    setForm(toForm(user));
    setFormError('');
    setEditing(true);
  };
  const cancelEditing = () => {
    setForm(toForm(user));
    setFormError('');
    setEditing(false);
  };
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!acceptedAvatarTypes.includes(file.type)) {
      setFormError('Định dạng ảnh không được hỗ trợ. Hãy dùng JPG, PNG hoặc WEBP.');
      return;
    }
    if (file.size > maxAvatarSize) {
      setFormError('Ảnh đại diện không được vượt quá 5 MB.');
      return;
    }
    const source = URL.createObjectURL(file);
    setCropSource(source); setCrop({ x: 0, y: 0 }); setZoom(1); setCropArea(null);
    return;
  };
  const confirmCrop = async () => {
    if (!cropSource || !cropArea) return;
    setCropping(true); setFormError('');
    try {
      const croppedFile = await createCroppedAvatar(cropSource, cropArea);
      setCropSource(null);
      URL.revokeObjectURL(cropSource);
      setUploadingAvatar(true);
      const response = await profileApi.uploadAvatar(croppedFile);
      updateUser(response.data.data);
      setForm((current) => ({ ...current, avatarUrl: response.data.data.avatar_url || '' }));
      toast.success('Ảnh đại diện đã được cập nhật');
    } catch { setFormError('Không thể crop hoặc tải ảnh lên. Vui lòng thử lại.'); } finally { setCropping(false); setUploadingAvatar(false); }
  };
  const cancelCrop = () => { if (cropSource) URL.revokeObjectURL(cropSource); setCropSource(null); setCropArea(null); };
  const removeAvatar = async () => {
    setUploadingAvatar(true);
    setFormError('');
    try {
      const response = await profileApi.removeAvatar();
      updateUser(response.data.data);
      setForm((current) => ({ ...current, avatarUrl: '' }));
      toast.success('Đã gỡ ảnh đại diện');
    } catch {
      setFormError('Không thể gỡ ảnh đại diện. Vui lòng thử lại.');
    } finally {
      setUploadingAvatar(false);
    }
  };
  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError('Họ và tên không được để trống.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const response = await profileApi.update({
        name: form.name.trim(),
        email: form.email.trim() || null,
        bio: form.bio.trim() || null,
        gender: form.gender || null,
      });
      updateUser(response.data.data);
      setEditing(false);
      toast.success('Hồ sơ đã được cập nhật');
    } catch {
      setFormError('Không thể lưu hồ sơ. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };
  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(''); setPasswordMessage('');
    if (passwordForm.newPassword.length < 8 || passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự và khớp xác nhận.'); return; }
    setChangingPassword(true);
    try { await profileApi.changePassword(passwordForm); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPasswordMessage('Đã đổi mật khẩu thành công.'); } catch { setPasswordError('Không thể đổi mật khẩu. Kiểm tra mật khẩu hiện tại.'); } finally { setChangingPassword(false); }
  };
  const confirmLogout = async () => {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
      queryClient.clear();
      window.location.assign('/dang-nhap');
    } catch {
      setLogoutError('Không thể kết thúc phiên. Vui lòng thử lại.');
      setLoggingOut(false);
    }
  };

  const previewAvatar = form.avatarUrl || null;
  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-identity">
          <UserAvatar name={user.name} avatarUrl={user.avatar_url} size="large" />
          <div>
            <span className="eyebrow">HỒ SƠ ĐỌC SÁCH</span>
            <h1>{user.name}</h1>
            <div className="profile-tags"><span>{roleLabel(user.role)}</span></div>
            <p>{user.bio || 'Chưa có mô tả hồ sơ.'}</p>
          </div>
        </div>
        <button type="button" className="button secondary" onClick={startEditing}>
          <Pencil size={17} /> CHỈNH SỬA HỒ SƠ
        </button>
      </section>

      {editing && (
        <form className="profile-panel profile-edit" onSubmit={saveProfile}>
          <div className="panel-head yellow">CHỈNH SỬA THÔNG TIN CÔNG KHAI</div>
          <div className="profile-form-grid">
            <div className="avatar-editor">
              <UserAvatar name={user.name} avatarUrl={previewAvatar} size="large" />
              <div className="avatar-editor-copy">
                <strong>ẢNH ĐẠI DIỆN</strong>
                <span>JPG, PNG hoặc WEBP · tối đa 5 MB</span>
                <div className="avatar-editor-actions">
                  <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleFileChange(event)} />
                  <button type="button" className="button primary" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar || saving}>
                    <Upload size={16} /> {uploadingAvatar ? 'ĐANG XỬ LÝ...' : 'TẢI ẢNH LÊN'}
                  </button>
                  <button type="button" className="button secondary" onClick={() => void removeAvatar()} disabled={uploadingAvatar || saving || !form.avatarUrl}>
                    <Trash2 size={16} /> GỠ ẢNH
                  </button>
                </div>
              </div>
            </div>
            <label>HỌ VÀ TÊN<input value={form.name} maxLength={120} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>EMAIL<input type="email" value={form.email} maxLength={320} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>GIỚI TÍNH
              <select className="profile-select" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as FormState['gender'] })}>
                <option value="">Chưa cập nhật</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </label>
            <label className="profile-form-wide">MÔ TẢ<input value={form.bio} maxLength={1000} placeholder="Viết vài dòng về bạn" onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label>
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <div className="profile-form-actions">
            <button type="button" className="button secondary" onClick={cancelEditing} disabled={saving || uploadingAvatar}>HỦY</button>
            <button type="submit" className="button primary" disabled={saving || uploadingAvatar}>{saving ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}</button>
          </div>
        </form>
      )}

      <section className="profile-panel profile-trophy-panel">
        <div className="panel-head yellow">THÀNH TỰU / CÚP</div>
        <div className="profile-achievement-hero"><div className="profile-trophy-value"><Trophy size={30} /><strong>{user.trophy_count ?? 0}</strong><div><span>CÚP ĐÃ NHẬN</span><small>Tổng số cúp từ các game đã hoàn thành</small></div></div><div className="profile-level-badge"><span>LEVEL</span><strong>{user.level ?? 1}</strong></div></div>
        <div className="profile-exp-line"><strong>{currentExp} EXP</strong><span>{nextLevelExp === null ? 'MAX LEVEL' : `${nextLevelExp - currentExp} EXP ĐỂ LÊN LEVEL TIẾP`}</span></div>
        <div className="profile-exp-progress" aria-label={`Tiến trình EXP ${Math.round(expProgress)}%`}><span style={{ width: `${expProgress}%` }} /></div>
        <div className="profile-achievements-earned"><div className="profile-achievements-heading"><h2>HỆ THỐNG THÀNH TỰU</h2><span>{unlockedAchievements.length} / {allAchievements.length} ĐÃ ĐẠT</span></div>{unlockedAchievements.length ? <div className="achievement-earned-grid">{unlockedAchievements.map((achievement) => <article className="achievement-earned-card is-unlocked" key={achievement.code}><strong>{achievement.name}</strong><p>{achievement.condition_text}</p><span>+{achievement.exp_reward} EXP</span><small>ĐÃ ĐẠT · {formatDateTime(achievement.unlocked_at)}</small></article>)}<button type="button" className="achievement-more-card" onClick={() => setAchievementsOpen(true)}><strong>XEM THÊM</strong><span>{allAchievements.length} THÀNH TỰU</span><small>Xem toàn bộ thành tựu</small></button></div> : <button type="button" className="achievement-more-card" onClick={() => setAchievementsOpen(true)}><strong>XEM THÊM</strong><span>{allAchievements.length} THÀNH TỰU</span><small>Xem toàn bộ thành tựu</small></button>}</div>
      </section>
      {achievementsOpen && <LibraryModal title="TOÀN BỘ THÀNH TỰU" onClose={() => setAchievementsOpen(false)} wide><div className="achievement-modal-filters"><button type="button" className={achievementFilter === 'all' ? 'selected' : ''} onClick={() => setAchievementFilter('all')}>TẤT CẢ</button><button type="button" className={achievementFilter === 'unlocked' ? 'selected' : ''} onClick={() => setAchievementFilter('unlocked')}>ĐÃ ĐẠT</button><button type="button" className={achievementFilter === 'locked' ? 'selected' : ''} onClick={() => setAchievementFilter('locked')}>CHƯA ĐẠT</button></div><div className="achievement-modal-list">{visibleAchievements.map((achievement) => <article className={`achievement-earned-card ${achievement.unlocked ? 'is-unlocked' : 'is-locked'}`} key={achievement.code}><strong>{achievement.name}</strong><p>{achievement.condition_text}</p>{achievement.progress_target !== null && achievement.progress_target !== undefined && <div className="achievement-mini-progress"><span style={{ width: `${achievement.progress_percent || 0}%` }} /></div>}<span>{achievement.progress_target !== null && achievement.progress_target !== undefined ? `${Math.min(achievement.progress_current || 0, achievement.progress_target)} / ${achievement.progress_target}` : `+${achievement.exp_reward} EXP`}</span><small>{achievement.unlocked ? `ĐÃ ĐẠT · ${formatDateTime(achievement.unlocked_at)}` : 'CHƯA ĐẠT'}</small></article>)}</div></LibraryModal>}
      <div className="profile-columns">
        <section className="profile-panel">
          <div className="panel-head">THÔNG TIN CÔNG KHAI</div>
          <dl>
            <div><dt>ẢNH ĐẠI DIỆN</dt><dd>{user.avatar_url ? 'Đã cập nhật' : 'Chưa cập nhật'}</dd></div>
            <div><dt>HỌ VÀ TÊN</dt><dd>{user.name}</dd></div>
            <div><dt>MÔ TẢ</dt><dd>{user.bio || 'Chưa cập nhật'}</dd></div>
            <div><dt>GIỚI TÍNH</dt><dd>{user.gender || 'Chưa cập nhật'}</dd></div>
          </dl>
        </section>
        <section className="profile-panel">
          <div className="panel-head purple">THÔNG TIN TÀI KHOẢN</div>
          <dl>
            <div><dt>TÊN ĐĂNG NHẬP</dt><dd>{user.username}</dd></div>
            <div><dt>EMAIL</dt><dd>{user.email || 'Chưa cập nhật'}</dd></div>
            <div><dt>VAI TRÒ</dt><dd>{roleLabel(user.role)}</dd></div>
            {user.role === 'STUDENT' && <div><dt>LỚP</dt><dd>{user.class_name || 'Chưa cập nhật'}</dd></div>}
            {user.role === 'TEACHER' && <div><dt>TỔ CHUYÊN MÔN</dt><dd>{user.specialization || 'Chưa cập nhật'}</dd></div>}
          </dl>
        </section>
      </div>

      <section className="profile-panel public-profile-posts">
        <div className="panel-head"><FileText size={18} /> BÀI ĐĂNG CỦA BẠN</div>
        {postsQuery.isPending ? <div className="empty-inline">Đang tải bài đăng...</div> : postsQuery.data?.length ? postsQuery.data.map((post) => <PostCard key={post.id} post={post} />) : <div className="empty-inline">Bạn chưa có bài đăng công khai.</div>}
      </section>

      <section className="profile-panel profile-empty-activity">
        <div className="panel-head">HOẠT ĐỘNG GẦN ĐÂY</div>
        {user.activities?.length ? <div className="activity-list">{user.activities.slice(0, 5).map((activity) => <div className="activity-row" key={activity.id}><UserRound size={24} /><div><strong>{activity.type === 'POST_CREATED' ? 'Đã đăng bài' : activity.type === 'COMMENT_CREATED' ? 'Đã bình luận' : activity.type === 'PASSWORD_CHANGED' ? 'Đã đổi mật khẩu' : 'Đã cập nhật hồ sơ'}</strong><span>{formatDateTime(activity.created_at)}</span></div></div>)}</div> : <div className="empty-inline"><UserRound size={26} /><div><strong>CHƯA CÓ HOẠT ĐỘNG</strong><span>Hoạt động thực tế của bạn sẽ xuất hiện tại đây.</span></div></div>}
      </section>

      <section className="profile-panel profile-password"><div className="panel-head purple">ĐỔI MẬT KHẨU</div><form className="profile-password-form" onSubmit={(event) => void changePassword(event)}><label>MẬT KHẨU HIỆN TẠI<input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /></label><label>MẬT KHẨU MỚI<input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></label><label>XÁC NHẬN MẬT KHẨU MỚI<input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} /></label>{passwordError && <p className="form-error">{passwordError}</p>}{passwordMessage && <p className="password-success">{passwordMessage}</p>}<div className="profile-form-actions"><button className="button primary" disabled={changingPassword}>{changingPassword ? 'ĐANG LƯU...' : 'ĐỔI MẬT KHẨU'}</button></div></form></section>

      <section className="profile-panel profile-logout">
        <div className="panel-head">PHIÊN ĐĂNG NHẬP</div>
        <div className="profile-security-body">
          <div><strong>ĐĂNG XUẤT KHỎI TÀI KHOẢN VIVIORA</strong><p>Phiên đăng nhập hiện tại sẽ được kết thúc trên thiết bị này.</p></div>
          <button type="button" className="button danger" onClick={() => setLogoutOpen(true)}><LogOut size={17} /> ĐĂNG XUẤT</button>
        </div>
      </section>

      {logoutOpen && <LogoutModal onCancel={() => setLogoutOpen(false)} onConfirm={() => void confirmLogout()} loading={loggingOut} error={logoutError} />}
      {cropSource && <div className="modal-backdrop"><section className="viviora-modal avatar-crop-modal" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title"><div className="avatar-crop-heading"><h2 id="avatar-crop-title">CHỈNH ẢNH ĐẠI DIỆN</h2><button className="icon-button" type="button" onClick={cancelCrop} aria-label="Đóng">×</button></div><div className="avatar-crop-stage"><Cropper image={cropSource} crop={crop} zoom={zoom} aspect={1} cropShape="rect" showGrid={true} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_area, pixels) => setCropArea(pixels)} /></div><label className="avatar-crop-zoom">THU PHÓNG<input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={cancelCrop} disabled={cropping}>HỦY</button><button className="button primary" type="button" onClick={() => void confirmCrop()} disabled={cropping || !cropArea}>{cropping ? 'ĐANG LƯU...' : 'LƯU ẢNH'}</button></div></section></div>}
    </div>
  );
}
