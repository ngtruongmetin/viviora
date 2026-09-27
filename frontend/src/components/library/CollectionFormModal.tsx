import { useState, type FormEvent } from 'react';
import type { LibraryCollection } from '../../types/models';
import { LibraryModal } from './LibraryModal';

export function CollectionFormModal({
  collection,
  onClose,
  onSubmit,
}: {
  collection?: LibraryCollection;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => Promise<void>;
}) {
  const [name, setName] = useState(collection?.name || '');
  const [description, setDescription] = useState(collection?.description || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError('Tên kho sách là bắt buộc.');
    setSaving(true);
    setError('');
    try {
      await onSubmit({ name: name.trim(), description: description.trim() });
    } catch {
      setError('Không thể lưu kho sách. Vui lòng thử lại.');
      setSaving(false);
    }
  };
  return (
    <LibraryModal title={collection ? 'CHỈNH SỬA KHO SÁCH' : 'TẠO KHO SÁCH'} onClose={onClose}>
      <form className="library-form" onSubmit={(event) => void submit(event)}>
        <label>
          TÊN KHO SÁCH
          <input
            autoFocus
            value={name}
            maxLength={160}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          MÔ TẢ
          <textarea
            value={description}
            maxLength={1000}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        {error && <p className="form-error library-form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="button secondary" disabled={saving} onClick={onClose}>
            HỦY
          </button>
          <button className="button primary" disabled={saving}>
            {saving ? 'ĐANG LƯU...' : 'LƯU KHO SÁCH'}
          </button>
        </div>
      </form>
    </LibraryModal>
  );
}
