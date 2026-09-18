import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Eye, Pencil, Plus, Search, Trash2, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { MemberFormModal } from '../../components/members/MemberFormModal';
import { ConfirmMemberDeleteModal } from '../../components/members/ConfirmMemberDeleteModal';
import { UserAvatar } from '../../components/common/UserAvatar';
import { LibraryPagination } from '../../components/library/LibraryPagination';
import { adminUsersApi, type ManagedUserInput } from '../../services/domain/adminUsers';
import type { ManagedUser, Role } from '../../types/models';
import { formatDate } from '../../utils/dateTime';

function useDebouncedValue(value: string, delay = 320) { const [result, setResult] = useState(value); useEffect(() => { const timer = window.setTimeout(() => setResult(value), delay); return () => window.clearTimeout(timer); }, [value, delay]); return result; }
function roleLabel(role: Role) { return role === 'ADMIN' ? 'ADMIN' : role === 'TEACHER' ? 'GIÁO VIÊN' : 'HỌC SINH'; }
function dateLabel(value?: string) { return formatDate(value); }

export function AdminMembersPage() {
  const client = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formUser, setFormUser] = useState<ManagedUser | null | undefined>(undefined);
  const [deleteUser, setDeleteUser] = useState<ManagedUser | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const search = useDebouncedValue(searchInput);
  useEffect(() => setPage(1), [search, role, status]);
  const query = useQuery({ queryKey: ['admin-members', search, role, status, page], queryFn: () => adminUsersApi.list({ search, role, status, page, limit: 20 }).then((response) => response.data), placeholderData: keepPreviousData });
  const refresh = async () => client.invalidateQueries({ queryKey: ['admin-members'] });
  const save = async (data: ManagedUserInput) => { if (formUser) await adminUsersApi.update(formUser.id, data); else await adminUsersApi.create(data); toast.success(formUser ? 'Đã cập nhật thành viên' : 'Đã thêm thành viên'); setFormUser(undefined); await refresh(); };
  const remove = async () => { if (!deleteUser) return; setDeleteBusy(true); try { await adminUsersApi.remove(deleteUser.id); toast.success('Đã xóa thành viên'); setDeleteUser(null); await refresh(); } catch (error: unknown) { const message = axios.isAxiosError(error) ? error.response?.data?.error?.message : undefined; toast.error(message || 'Không thể xóa thành viên.'); } finally { setDeleteBusy(false); } };
  if (query.isPending && !query.data) return <div className="state-card">Đang tải danh sách thành viên...</div>;
  if (query.isError || !query.data) return <div className="state-card error">Không thể tải danh sách thành viên.</div>;
  const { items, pagination, statistics } = query.data;
  return <div className="members-page"><div className="page-heading members-heading"><div><span className="eyebrow">QUẢN TRỊ / THÀNH VIÊN</span><h1>QUẢN LÝ THÀNH VIÊN</h1><p>Quản lý tài khoản và thông tin của các thành viên trong Viviora.</p></div><button className="button primary" type="button" onClick={() => setFormUser(null)}><Plus size={18} /> THÊM THÀNH VIÊN</button></div><div className="member-stats"><div className="member-stat blue"><span>TỔNG THÀNH VIÊN</span><strong>{statistics.total}</strong></div><div className="member-stat"><span>ĐANG HOẠT ĐỘNG</span><strong>{statistics.active}</strong></div><div className="member-stat yellow"><span>HỌC SINH</span><strong>{statistics.students}</strong></div><div className="member-stat purple"><span>GIÁO VIÊN</span><strong>{statistics.teachers}</strong></div><div className="member-stat"><span>ADMIN</span><strong>{statistics.admins}</strong></div></div><section className="member-filter-panel"><label className="member-search"><span className="visually-hidden">Tìm thành viên</span><Search size={19} /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm tên, username hoặc email..." />{query.isFetching && <small>ĐANG TÌM</small>}</label><select aria-label="Lọc theo vai trò" value={role} onChange={(event) => setRole(event.target.value)}><option value="">Tất cả vai trò</option><option value="STUDENT">Học sinh</option><option value="TEACHER">Giáo viên</option><option value="ADMIN">Admin</option></select><select aria-label="Lọc theo trạng thái" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Đã vô hiệu hóa</option></select></section>{items.length === 0 ? <section className="state-card empty-state member-empty"><span className="empty-icon"><UsersRound size={32} /></span><h2>CHƯA CÓ THÀNH VIÊN</h2><p>Hệ thống chưa có thành viên phù hợp. Hãy thêm tài khoản đầu tiên.</p><button className="button primary" type="button" onClick={() => setFormUser(null)}><Plus size={18} /> THÊM THÀNH VIÊN</button></section> : <><div className="member-table-wrap"><table className="member-table"><thead><tr><th>AVATAR</th><th>HỌ VÀ TÊN</th><th>USERNAME</th><th>VAI TRÒ</th><th>THÔNG TIN</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><UserAvatar name={item.name} avatarUrl={item.avatar_url} size="small" /></td><td><strong>{item.name}</strong><small>{item.email || 'Chưa có email'}</small></td><td>{item.username}</td><td><span className={`member-role-badge member-role-${item.role.toLowerCase()}`}>{roleLabel(item.role)}</span></td><td>{item.role === 'STUDENT' ? item.class_name || 'Chưa có lớp' : item.role === 'TEACHER' ? item.specialization || 'Chưa có tổ' : dateLabel(item.created_at)}</td><td><span className={`member-status ${item.is_active ? 'active' : 'inactive'}`}>{item.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}</span></td><td><div className="admin-row-actions"><Link className="icon-button" title="Xem chi tiết" to={`/quan-tri/thanh-vien/${item.id}`}><Eye size={17} /></Link><button className="icon-button" type="button" title="Chỉnh sửa" onClick={() => setFormUser(item)}><Pencil size={17} /></button><button className="icon-button destructive" type="button" title="Xóa" onClick={() => setDeleteUser(item)}><Trash2 size={17} /></button></div></td></tr>)}</tbody></table></div><LibraryPagination {...pagination} onPageChange={setPage} /></>}{formUser !== undefined && <MemberFormModal user={formUser || undefined} onClose={() => setFormUser(undefined)} onSubmit={save} />}{deleteUser && <ConfirmMemberDeleteModal user={deleteUser} loading={deleteBusy} onClose={() => setDeleteUser(null)} onConfirm={() => void remove()} />}</div>;
}
