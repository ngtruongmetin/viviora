import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Trophy } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { achievementsApi } from '../../services/domain/achievements';
import { LibraryModal } from '../../components/library/LibraryModal';

export function AdminAchievementsPage() {
  const client = useQueryClient();
  const [resetOpen, setResetOpen] = useState(false);
  const list = useQuery({
    queryKey: ['admin-achievements'],
    queryFn: () => achievementsApi.list().then((response) => response.data.items),
  });
  const progress = useQuery({
    queryKey: ['admin-achievement-progress'],
    queryFn: () => achievementsApi.progress().then((response) => response.data.data),
  });
  const reset = useMutation({
    mutationFn: () => achievementsApi.reset(),
    onSuccess: async () => {
      setResetOpen(false);
      toast.success('Đã reset EXP và tiến trình thành tựu.');
      await client.invalidateQueries({ queryKey: ['admin-achievements'] });
      await client.invalidateQueries({ queryKey: ['admin-achievement-progress'] });
    },
    onError: () => toast.error('Không thể reset tiến trình.'),
  });
  if (list.isPending || progress.isPending)
    return <div className="state-card">Đang tải thành tựu...</div>;
  if (list.isError || progress.isError)
    return <div className="state-card error">Không thể tải dữ liệu thành tựu.</div>;
  const stats = progress.data?.stats;
  return (
    <div className="achievements-admin-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">QUẢN TRỊ / TIẾN TRÌNH</span>
          <h1>QUẢN LÝ THÀNH TỰU</h1>
          <p>Danh sách cố định từ file cấu hình. Không thể thêm, sửa hoặc xóa thành tựu.</p>
        </div>
        <button className="button danger" type="button" onClick={() => setResetOpen(true)}>
          <RotateCcw size={17} /> RESET TẤT CẢ
        </button>
      </header>
      <section className="achievement-stat-grid">
        <div>
          <strong>{stats?.total || 0}</strong>
          <span>TỔNG THÀNH TỰU</span>
        </div>
        <div>
          <strong>{stats?.supported || 0}</strong>
          <span>ĐÃ HỖ TRỢ</span>
        </div>
        <div>
          <strong>{stats?.unsupported || 0}</strong>
          <span>CHƯA HỖ TRỢ</span>
        </div>
        <div>
          <strong>{stats?.unlocks || 0}</strong>
          <span>LƯỢT MỞ KHÓA</span>
        </div>
      </section>
      <section className="achievement-list">
        <div className="panel-head yellow">
          <Trophy size={18} /> DANH SÁCH THÀNH TỰU
        </div>
        {list.data?.map((item) => (
          <article className="achievement-row" key={item.code}>
            <div>
              <h2>{item.name}</h2>
              <p>{item.condition_text}</p>
              {!item.is_supported && <small>CHƯA HỖ TRỢ: {item.support_note}</small>}
            </div>
            <strong>+{item.exp_reward} EXP</strong>
            <span
              className={item.is_supported ? 'achievement-supported' : 'achievement-unsupported'}
            >
              {item.is_supported ? `${item.unlocked_count} ĐÃ ĐẠT` : 'CHƯA HỖ TRỢ'}
            </span>
          </article>
        ))}
      </section>
      {resetOpen && (
        <LibraryModal title="RESET TIẾN TRÌNH?" onClose={() => setResetOpen(false)}>
          <p>
            Thao tác này sẽ xóa toàn bộ thành tựu đã mở khóa và đưa EXP của tất cả user về 0. Định
            nghĩa thành tựu, cúp, game và bài đăng không bị xóa.
          </p>
          <div className="modal-actions">
            <button className="button secondary" type="button" onClick={() => setResetOpen(false)}>
              HỦY
            </button>
            <button
              className="button danger"
              type="button"
              disabled={reset.isPending}
              onClick={() => reset.mutate()}
            >
              <RotateCcw size={16} /> XÁC NHẬN RESET
            </button>
          </div>
        </LibraryModal>
      )}
    </div>
  );
}
