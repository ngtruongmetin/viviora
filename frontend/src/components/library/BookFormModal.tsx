import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Trash2, Upload } from 'lucide-react';
import type { Book } from '../../types/models';
import type { BookInput } from '../../services/domain/library';
import { BookCover } from './BookCover';
import { LibraryModal } from './LibraryModal';

type FormValues = { title: string; author: string; publisher: string; publicationYear: string; price: string; category: string; cutter: string; coverUrl: string };
const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

function initialValues(book?: Book): FormValues {
  return {
    title: book?.title || '', author: book?.author || '', publisher: book?.publisher || '', publicationYear: book?.publication_year ? String(book.publication_year) : '', price: book?.price ? String(book.price) : '', category: book?.category || '', cutter: book?.cutter || '', coverUrl: book?.cover_url?.startsWith('http') ? book.cover_url : '',
  };
}

export function BookFormModal({ book, onClose, onSubmit, onRemoveCover }: { book?: Book; onClose: () => void; onSubmit: (data: BookInput, cover?: File) => Promise<void>; onRemoveCover?: () => Promise<void> }) {
  const [values, setValues] = useState(() => initialValues(book));
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingCover, setRemovingCover] = useState(false);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!cover) { setCoverPreviewUrl(null); return; }
    const url = URL.createObjectURL(cover);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);
  const previewBook: Book = { ...(book || { id: '', collection_id: '', created_at: '', updated_at: '' }), title: values.title || 'ĐẦU SÁCH MỚI', author: values.author || null, category: values.category || null, cover_url: coverPreviewUrl || values.coverUrl || (coverRemoved ? null : book?.cover_url) || null };
  const set = (key: keyof FormValues, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const chooseCover = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    event.target.value = '';
    if (!next) return;
    if (!acceptedTypes.includes(next.type)) return setError('Ảnh bìa phải là JPG, PNG hoặc WEBP.');
    if (next.size > 5 * 1024 * 1024) return setError('Ảnh bìa không được vượt quá 5 MB.');
    setCover(next); setCoverRemoved(false); setError('');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!values.title.trim()) return setError('Tên sách là bắt buộc.');
    const year = values.publicationYear ? Number(values.publicationYear) : null;
    const price = values.price ? Number(values.price.replace(/[,.](?=\d{3}\b)/g, '').replace(',', '.')) : null;
    if (year !== null && (!Number.isInteger(year) || year < 1000 || year > new Date().getFullYear() + 1)) return setError('Năm xuất bản không hợp lệ.');
    if (price !== null && (!Number.isFinite(price) || price < 0)) return setError('Đơn giá không hợp lệ.');
    setSaving(true); setError('');
    try {
      const data: BookInput = { title: values.title.trim(), author: values.author.trim() || null, publisher: values.publisher.trim() || null, publicationYear: year, price, category: values.category.trim() || null, cutter: values.cutter.trim() || null };
      if (values.coverUrl.trim()) data.coverUrl = values.coverUrl.trim();
      await onSubmit(data, cover || undefined);
    } catch { setError('Không thể lưu đầu sách. Vui lòng thử lại.'); setSaving(false); }
  };
  const removeCover = async () => {
    if (!onRemoveCover) return;
    setRemovingCover(true); setError('');
    try { await onRemoveCover(); setValues((current) => ({ ...current, coverUrl: '' })); setCover(null); setCoverRemoved(true); } catch { setError('Không thể gỡ ảnh bìa.'); } finally { setRemovingCover(false); }
  };
  return <LibraryModal title={book ? 'CHỈNH SỬA ĐẦU SÁCH' : 'THÊM ĐẦU SÁCH'} onClose={onClose} wide>
    <form className="library-form book-form" onSubmit={(event) => void submit(event)}>
      <div className="book-form-cover"><BookCover book={previewBook} /><div><strong>ẢNH BÌA</strong><span>Tùy chọn. JPG, PNG hoặc WEBP, tối đa 5 MB.</span><div className="book-cover-actions"><input ref={fileRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseCover} /><button type="button" className="button secondary" onClick={() => fileRef.current?.click()}><Upload size={16} /> TẢI ẢNH</button>{book?.cover_url && <button type="button" className="button secondary" disabled={removingCover} onClick={() => void removeCover()}><Trash2 size={16} /> GỠ ẢNH</button>}</div></div></div>
      <div className="library-form-grid"><label className="form-span-2">TÊN SÁCH<input autoFocus value={values.title} maxLength={500} onChange={(event) => set('title', event.target.value)} /></label><label>TÁC GIẢ<input value={values.author} maxLength={300} onChange={(event) => set('author', event.target.value)} /></label><label>NHÀ XUẤT BẢN<input value={values.publisher} maxLength={300} onChange={(event) => set('publisher', event.target.value)} /></label><label>NĂM XUẤT BẢN<input inputMode="numeric" value={values.publicationYear} onChange={(event) => set('publicationYear', event.target.value)} /></label><label>ĐƠN GIÁ<input inputMode="decimal" value={values.price} onChange={(event) => set('price', event.target.value)} /></label><label>THỂ LOẠI<input value={values.category} maxLength={160} onChange={(event) => set('category', event.target.value)} /></label><label>CUTTER<input value={values.cutter} maxLength={160} onChange={(event) => set('cutter', event.target.value)} /></label><label className="form-span-2">LIÊN KẾT ẢNH BÌA BÊN NGOÀI<input type="url" value={values.coverUrl} maxLength={500} placeholder="https://..." onChange={(event) => set('coverUrl', event.target.value)} /></label></div>
      {error && <p className="form-error library-form-error">{error}</p>}
      <div className="modal-actions"><button type="button" className="button secondary" disabled={saving} onClick={onClose}>HỦY</button><button className="button primary" disabled={saving}>{saving ? 'ĐANG LƯU...' : 'LƯU ĐẦU SÁCH'}</button></div>
    </form>
  </LibraryModal>;
}
