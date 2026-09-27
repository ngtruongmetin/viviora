import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import type { ManagedUser, Role, Specialization } from '../../types/models';
import type { ManagedUserInput } from '../../services/domain/adminUsers';
import { LibraryModal } from '../library/LibraryModal';

const specializations: Specialization[] = [
  'Toán',
  'Ngữ Văn',
  'Tiếng Anh',
  'Khoa học tự nhiên - Công nghệ',
  'Lịch sử - Địa lí',
  'Giáo dục công dân',
  'Nghệ thuật - Giáo dục thể chất',
  'Văn phòng',
];
type FormState = ManagedUserInput;

function initialState(user?: ManagedUser): FormState {
  return {
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'STUDENT',
    gender: user?.gender === 'Nam' || user?.gender === 'Nữ' ? user.gender : null,
    className: user?.class_name || '',
    specialization: (user?.specialization as Specialization) || null,
    avatarUrl: user?.avatar_url || '',
    bio: user?.bio || '',
    isActive: user?.is_active ?? true,
  };
}

export function MemberFormModal({
  user,
  onClose,
  onSubmit,
}: {
  user?: ManagedUser;
  onClose: () => void;
  onSubmit: (data: ManagedUserInput) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(user));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const editing = Boolean(user);
  useEffect(() => setForm(initialState(user)), [user]);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.username.trim())
      return setError('Họ và tên và username là bắt buộc.');
    if (!editing && !form.password) return setError('Mật khẩu là bắt buộc khi tạo thành viên.');
    if (form.password && form.password.length < 8)
      return setError('Mật khẩu phải có ít nhất 8 ký tự.');
    if (
      form.role === 'STUDENT' &&
      !/^[6-9]A[0-9]+$/.test(String(form.className || '').toUpperCase())
    )
      return setError('Lớp phải theo định dạng 6A1 đến 9A...');
    if (form.role === 'TEACHER' && !form.specialization)
      return setError('Giáo viên phải có tổ chuyên môn.');
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email?.trim() || null,
        password: form.password || null,
        className:
          form.role === 'STUDENT'
            ? String(form.className || '')
                .trim()
                .toUpperCase()
            : null,
        specialization: form.role === 'TEACHER' ? form.specialization : null,
        avatarUrl: form.avatarUrl?.trim() || null,
        bio: form.bio?.trim() || null,
      });
    } catch (requestError: unknown) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.error?.message
        : undefined;
      setError(message || 'Không thể lưu thành viên. Vui lòng thử lại.');
      setSaving(false);
    }
  };
  return (
    <LibraryModal
      title={editing ? 'CHỈNH SỬA THÀNH VIÊN' : 'THÊM THÀNH VIÊN MỚI'}
      onClose={onClose}
      wide
    >
      <form className="member-form library-form" onSubmit={(event) => void submit(event)}>
        <div className="library-form-grid">
          <label>
            HỌ VÀ TÊN
            <input
              autoFocus
              value={form.name}
              maxLength={120}
              onChange={(event) => set('name', event.target.value)}
            />
          </label>

          <label>
            USERNAME
            <input
              value={form.username}
              maxLength={80}
              disabled={editing}
              onChange={(event) => set('username', event.target.value)}
            />
          </label>

          <label className="form-span-2">
            EMAIL
            <input
              type="email"
              value={form.email || ''}
              maxLength={320}
              onChange={(event) => set('email', event.target.value)}
            />
          </label>

          <label>
            MẬT KHẨU
            <input
              type="password"
              value={form.password || ''}
              placeholder={editing ? 'Để trống nếu không đổi' : 'Tối thiểu 8 ký tự'}
              onChange={(event) => set('password', event.target.value)}
            />
          </label>

          <label>
            GIỚI TÍNH
            <select
              value={form.gender || ''}
              onChange={(event) =>
                set('gender', (event.target.value || null) as FormState['gender'])
              }
            >
              <option value="">Chưa cập nhật</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </label>
        </div>

        <div className="member-role-panel">
          <label>
            VAI TRÒ
            <select value={form.role} onChange={(event) => set('role', event.target.value as Role)}>
              <option value="STUDENT">Học sinh</option>
              <option value="TEACHER">Giáo viên</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>

          {form.role === 'STUDENT' && (
            <label>
              LỚP
              <input
                value={String(form.className || '').toUpperCase()}
                placeholder="Ví dụ: 7A1"
                onChange={(event) => set('className', event.target.value.toUpperCase())}
              />
            </label>
          )}

          {form.role === 'TEACHER' && (
            <label>
              TỔ CHUYÊN MÔN
              <select
                value={form.specialization || ''}
                onChange={(event) =>
                  set('specialization', (event.target.value || null) as Specialization | null)
                }
              >
                <option value="">Chọn tổ chuyên môn</option>

                {specializations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="member-status-field">
            TRẠNG THÁI
            <select
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(event) => set('isActive', event.target.value === 'active')}
            >
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Đã vô hiệu hóa</option>
            </select>
          </label>
        </div>

        {error && <p className="form-error library-form-error">{error}</p>}

        <div className="modal-actions">
          <button className="button secondary" type="button" disabled={saving} onClick={onClose}>
            HỦY
          </button>

          <button className="button primary" disabled={saving}>
            {saving ? 'ĐANG LƯU...' : 'LƯU THÀNH VIÊN'}
          </button>
        </div>
      </form>
    </LibraryModal>
  );
}
