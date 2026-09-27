import { AlertTriangle } from 'lucide-react';
import { LibraryModal } from '../library/LibraryModal';
export function ConfirmQuestionDeleteModal({
  title,
  message,
  loading,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <LibraryModal title={title} onClose={onClose}>
      <div className="delete-modal-copy">
        <span>
          <AlertTriangle size={30} />
        </span>
        <p>{message}</p>
      </div>
      <div className="modal-actions">
        <button className="button secondary" type="button" onClick={onClose} disabled={loading}>
          GIỮ LẠI
        </button>
        <button className="button danger" type="button" onClick={onConfirm} disabled={loading}>
          {loading ? 'ĐANG XÓA...' : 'XÓA'}
        </button>
      </div>
    </LibraryModal>
  );
}
