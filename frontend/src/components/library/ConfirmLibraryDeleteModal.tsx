import { AlertTriangle } from 'lucide-react';
import { LibraryModal } from './LibraryModal';

export function ConfirmLibraryDeleteModal({ title, message, onClose, onConfirm, loading }: { title: string; message: string; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  return <LibraryModal title={title} onClose={onClose}>
    <div className="delete-modal-copy"><span><AlertTriangle size={30} /></span><p>{message}</p></div>
    <div className="modal-actions"><button className="button secondary" type="button" disabled={loading} onClick={onClose}>GIỮ LẠI</button><button className="button danger" type="button" disabled={loading} onClick={onConfirm}>{loading ? 'ĐANG XÓA...' : 'XÓA'}</button></div>
  </LibraryModal>;
}
