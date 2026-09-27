import { AlertTriangle } from 'lucide-react';
import type { ManagedUser } from '../../types/models';
import { LibraryModal } from '../library/LibraryModal';

export function ConfirmMemberDeleteModal({
  user,
  loading,
  onClose,
  onConfirm,
}: {
  user: ManagedUser;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <LibraryModal title="XÓA THÀNH VIÊN?" onClose={onClose}>
      <div className="member-delete-warning">
        <AlertTriangle size={30} />
        <p>
          Bạn sắp xóa tài khoản <strong>{user.name}</strong>. Hành động này chỉ thực hiện được khi
          tài khoản chưa có dữ liệu liên quan và không phải ADMIN cuối cùng.
        </p>
      </div>
      <div className="modal-actions">
        <button className="button secondary" type="button" disabled={loading} onClick={onClose}>
          HỦY
        </button>
        <button className="button danger" type="button" disabled={loading} onClick={onConfirm}>
          {loading ? 'ĐANG XÓA...' : 'XÓA THÀNH VIÊN'}
        </button>
      </div>
    </LibraryModal>
  );
}
