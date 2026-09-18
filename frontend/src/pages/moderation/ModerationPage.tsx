import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Filter } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { PostCard } from '../../components/community/PostCard';
import { LibraryModal } from '../../components/library/LibraryModal';
import { moderationApi, toFeedPost } from '../../services/domain';
import type { ModerationSubmission } from '../../services/domain/moderation';
import { formatDateTime } from '../../utils/dateTime';

export function ModerationPage() {
  const queryClient = useQueryClient();
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [rejectingPost, setRejectingPost] = useState<ModerationSubmission | null>(null);
  const query = useQuery({
    queryKey: ['moderation', statusFilter],
    queryFn: () => moderationApi.list(statusFilter).then((response) => response.data),
  });

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      moderationApi.decide(id, status),
    onError: () => {
      toast.error('Không thể cập nhật bài đăng.');
    },
    onSuccess: (_response, variables) => {
      setRejectingPost(null);
      if (variables.status === 'APPROVED') {
        void queryClient.invalidateQueries({ queryKey: ['feed'] });
      }
      void queryClient.invalidateQueries({ queryKey: ['moderation'] });
      toast.success(
        variables.status === 'APPROVED' ? 'Đã duyệt bài đăng.' : 'Đã từ chối bài đăng.',
      );
    },
  });

  const items = query.data?.items || [];
  const stats = query.data?.stats || { pending: 0, approved: 0, rejected: 0 };
  const filteredItems = classFilter
    ? items.filter((item) => item.class_name === classFilter)
    : items;
  const classes = Array.from(
    new Set(items.map((item) => item.class_name).filter(Boolean)),
  ) as string[];
  const submitDecision = (id: string, status: 'APPROVED' | 'REJECTED') =>
    decide.mutate({ id, status });

  return (
    <div className="moderation-page">
      <header className="moderation-heading">
        <div>
          <span className="eyebrow">QUẢN TRỊ / BÀI ĐĂNG</span>
          <h1>QUẢN LÝ BÀI ĐĂNG</h1>
          <p>Kiểm tra, duyệt và theo dõi bài đăng từ tất cả các lớp.</p>
        </div>
      </header>

      <section className="moderation-stats" aria-label="Thống kê duyệt bài">
        <div className="moderation-stat pending">
          <span>CHỜ DUYỆT</span>
          <strong>{stats.pending}</strong>
        </div>
        <div className="moderation-stat approved">
          <span>ĐÃ DUYỆT</span>
          <strong>{stats.approved}</strong>
        </div>
        <div className="moderation-stat rejected">
          <span>TỪ CHỐI</span>
          <strong>{stats.rejected}</strong>
        </div>
      </section>

      <div className="moderation-layout">
        <aside className="moderation-filters">
          <h2>BỘ LỌC</h2>
          <label>
            LỚP
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="">Tất cả các lớp</option>
              {classes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary" type="button" onClick={() => setClassFilter('')}>
            <Filter size={16} /> XÓA BỘ LỌC
          </button>
        </aside>

        <section className="moderation-queue">
          <div className="moderation-tabs" role="tablist" aria-label="Trạng thái bài đăng">
            {([['PENDING', 'CHỜ DUYỆT'], ['APPROVED', 'ĐÃ DUYỆT'], ['REJECTED', 'ĐÃ TỪ CHỐI'], ['ALL', 'TẤT CẢ']] as const).map(([value, label]) => <button type="button" key={value} className={statusFilter === value ? 'selected' : ''} onClick={() => setStatusFilter(value)}>{label}</button>)}
          </div>
          <h2>{statusFilter === 'PENDING' ? 'CẦN XỬ LÝ' : 'LỊCH SỬ BÀI ĐĂNG'}</h2>
          {query.isPending ? (
            <div className="state-card">Đang tải hàng đợi...</div>
          ) : query.isError ? (
            <div className="state-card error">Không thể tải hàng đợi duyệt bài.</div>
          ) : filteredItems.length === 0 ? (
            <div className="state-card empty-state moderation-empty">
              <span className="eyebrow">HÀNG ĐỢI ĐÃ TRỐNG</span>
              <h3>KHÔNG CÒN BÀI CẦN XỬ LÝ</h3>
              <p>Không còn bài đăng nào cần xử lý.</p>
            </div>
          ) : (
            <div className="feed-post-list moderation-post-list">
              {filteredItems.map((item) => (
                <div key={item.id} className="moderation-history-item">
                  {statusFilter !== 'PENDING' && <div className={`moderation-history-meta ${item.moderation_status?.toLowerCase() || item.status?.toLowerCase() || ''}`}><strong>{item.moderation_status === 'APPROVED' ? 'ĐÃ DUYỆT' : item.moderation_status === 'REJECTED' ? 'ĐÃ TỪ CHỐI' : 'TRẠNG THÁI BÀI ĐĂNG'}</strong>{item.reviewer_name && <span>Bởi {item.reviewer_name}</span>}{item.reviewed_at && <time dateTime={item.reviewed_at}>{formatDateTime(item.reviewed_at)}</time>}</div>}
                  <PostCard
                    post={toFeedPost(item)}
                    variant={statusFilter === 'PENDING' ? 'moderation' : 'feed'}
                    actionPending={decide.isPending && decide.variables?.id === item.id}
                    onApprove={() => submitDecision(item.id, 'APPROVED')}
                    onReject={() => setRejectingPost(item)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {rejectingPost && (
        <LibraryModal
          title="TỪ CHỐI BÀI ĐĂNG?"
          onClose={() => {
            if (!decide.isPending) setRejectingPost(null);
          }}
        >
          <div className="moderation-confirm-copy">
            <AlertTriangle size={30} />
            <p>
              Bài đăng của <strong>{rejectingPost.name}</strong> sẽ được chuyển sang trạng thái từ
              chối.
            </p>
          </div>
          <div className="modal-actions">
            <button
              className="button secondary"
              type="button"
              disabled={decide.isPending}
              onClick={() => setRejectingPost(null)}
            >
              HỦY
            </button>
            <button
              className="button danger"
              type="button"
              disabled={decide.isPending}
              onClick={() => submitDecision(rejectingPost.id, 'REJECTED')}
            >
              {decide.isPending ? 'ĐANG CẬP NHẬT...' : 'TỪ CHỐI BÀI'}
            </button>
          </div>
        </LibraryModal>
      )}
    </div>
  );
}
