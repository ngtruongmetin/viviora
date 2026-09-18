import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, FilePlus2, FileUp, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { CollectionFormModal } from '../../components/library/CollectionFormModal';
import { ConfirmLibraryDeleteModal } from '../../components/library/ConfirmLibraryDeleteModal';
import { LibraryEmptyState } from '../../components/library/LibraryEmptyState';
import { LibraryPagination } from '../../components/library/LibraryPagination';
import { libraryApi } from '../../services/domain';
import type { LibraryCollection } from '../../types/models';
import { formatDate } from '../../utils/dateTime';

function dateLabel(value?: string | null) {
  return value ? formatDate(value) : 'Chưa có dữ liệu';
}

export function AdminLibraryPage() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<LibraryCollection | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<LibraryCollection | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const query = useQuery({ queryKey: ['admin-library-collections', page], queryFn: () => libraryApi.adminCollections({ page, limit: 20 }).then((response) => response.data) });
  const refresh = async () => client.invalidateQueries({ queryKey: ['admin-library-collections'] });
  const saveCollection = async (data: { name: string; description: string }) => {
    if (editing) await libraryApi.updateCollection(editing.id, data);
    else await libraryApi.createCollection(data);
    toast.success(editing ? 'Đã cập nhật kho sách' : 'Đã tạo kho sách');
    setEditing(undefined);
    await refresh();
  };
  const deleteCollection = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try { await libraryApi.deleteCollection(deleting.id); toast.success('Đã xóa kho sách'); setDeleting(null); await refresh(); } catch { toast.error('Không thể xóa kho sách.'); } finally { setDeletingBusy(false); }
  };
  const items = query.data?.items || [];
  const stats = query.data?.statistics;
  return <div className="admin-library-page">
    <div className="page-heading admin-library-heading"><div><span className="eyebrow">QUẢN TRỊ / THƯ VIỆN</span><h1>QUẢN LÝ KHO SÁCH</h1><p>Tạo, cập nhật và quản lý dữ liệu sách của Viviora.</p></div><div className="admin-header-actions"><button className="button secondary" type="button" onClick={() => setEditing(null)}><FilePlus2 size={18} /> TẠO KHO</button><Link className="button primary" to="/quan-tri/thu-vien/nhap-kho"><FileUp size={18} /> NHẬP EXCEL</Link></div></div>
    {query.isPending ? <div className="state-card">Đang tải dữ liệu thư viện...</div> : query.isError ? <div className="state-card error">Không thể tải dữ liệu quản trị.</div> : items.length === 0 ? <LibraryEmptyState admin /> : <>
      <div className="library-admin-stats"><div className="admin-stat blue"><span>KHO SÁCH</span><strong>{stats?.collection_count || 0}</strong></div><div className="admin-stat"><span>ĐẦU SÁCH</span><strong>{(stats?.book_count || 0).toLocaleString('vi-VN')}</strong></div><div className="admin-stat red"><span>TÁC GIẢ</span><strong>{(stats?.author_count || 0).toLocaleString('vi-VN')}</strong></div><div className="admin-stat"><span>CẬP NHẬT GẦN NHẤT</span><strong>{dateLabel(stats?.last_updated_at)}</strong></div></div>
      <div className="admin-collection-table-wrap"><table className="admin-collection-table"><thead><tr><th>TÊN KHO SÁCH</th><th>SÁCH</th><th>NGÀY NHẬP</th><th>NGƯỜI NHẬP</th><th>THAO TÁC</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}</td><td>{item.total_books.toLocaleString('vi-VN')}</td><td>{dateLabel(item.created_at)}</td><td>{item.created_by_name || 'Tài khoản đã xóa'}</td><td><div className="admin-row-actions"><Link className="admin-action-link" to={`/thu-vien/kho/${item.id}`}><Eye size={16} /> XEM</Link><Link className="admin-action-link" to={`/quan-tri/thu-vien/kho/${item.id}`}><FilePlus2 size={16} /> SÁCH</Link><button className="admin-action-link" type="button" onClick={() => setEditing(item)}><Pencil size={16} /> SỬA</button><button className="admin-action-link destructive" type="button" onClick={() => setDeleting(item)}><Trash2 size={16} /> XÓA</button></div></td></tr>)}</tbody></table></div>
      <LibraryPagination {...query.data!.pagination} onPageChange={setPage} />
    </>}
    {editing !== undefined && <CollectionFormModal collection={editing || undefined} onClose={() => setEditing(undefined)} onSubmit={saveCollection} />}
    {deleting && <ConfirmLibraryDeleteModal title="XÓA KHO SÁCH?" message={`Xóa “${deleting.name}” sẽ xóa toàn bộ sách thuộc kho này. Hành động này không thể hoàn tác.`} loading={deletingBusy} onClose={() => setDeleting(null)} onConfirm={() => void deleteCollection()} />}
  </div>;
}
