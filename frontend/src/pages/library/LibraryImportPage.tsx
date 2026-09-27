import {
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { libraryApi } from '../../services/domain';
import type { LibraryImportPreview } from '../../types/models';
import { formatBookPrice } from '../../utils/formatPrice';

type WizardState = 'FORM' | 'ANALYZING' | 'PREVIEW' | 'CONFIRMING';

function yearRange(preview: LibraryImportPreview) {
  return preview.summary.yearRange
    ? `${preview.summary.yearRange.min} - ${preview.summary.yearRange.max}`
    : 'Chưa có dữ liệu';
}

export function LibraryImportPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<WizardState>('FORM');
  const [preview, setPreview] = useState<LibraryImportPreview | null>(null);
  const [error, setError] = useState('');

  const analyze = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError('Hãy nhập tên kho sách.');
    if (!file) return setError('Hãy chọn file Excel .xlsx.');
    if (!file.name.toLowerCase().endsWith('.xlsx')) return setError('Chỉ nhận file Excel .xlsx.');
    setState('ANALYZING');
    setError('');
    try {
      const response = await libraryApi.previewImport(name.trim(), description.trim(), file);
      setPreview(response.data.data);
      setState('PREVIEW');
    } catch (requestError: unknown) {
      const message =
        typeof requestError === 'object' && requestError && 'response' in requestError
          ? (requestError as { response?: { data?: { error?: { message?: string } } } }).response
              ?.data?.error?.message
          : undefined;
      setError(message || 'Không thể phân tích file. Vui lòng thử lại.');
      setState('FORM');
    }
  };

  const cancelPreview = async () => {
    if (preview) await libraryApi.cancelImport(preview.temporaryImportId).catch(() => undefined);
    navigate('/quan-tri/thu-vien');
  };

  const confirm = async () => {
    if (!preview) return;
    setState('CONFIRMING');
    setError('');
    try {
      const response = await libraryApi.confirmImport(preview.temporaryImportId);
      toast.success(`Đã nhập kho ${response.data.data.collection.name}`);
      navigate('/quan-tri/thu-vien');
    } catch (requestError: unknown) {
      const message =
        typeof requestError === 'object' && requestError && 'response' in requestError
          ? (requestError as { response?: { data?: { error?: { message?: string } } } }).response
              ?.data?.error?.message
          : undefined;
      setError(message || 'Không thể xác nhận nhập kho. Vui lòng thử lại.');
      setState('PREVIEW');
    }
  };

  const steps = ['THÔNG TIN KHO', 'TẢI FILE', 'KIỂM TRA', 'XÁC NHẬN'];
  const activeStep = state === 'FORM' ? 0 : state === 'ANALYZING' ? 1 : state === 'PREVIEW' ? 2 : 3;
  return (
    <div className="library-import-page">
      <div className="import-steps" aria-label="Tiến trình nhập kho">
        {steps.map((step, index) => (
          <div className={index <= activeStep ? 'active' : ''} key={step}>
            <span>{index + 1}</span>
            {step}
          </div>
        ))}
      </div>
      <div className="page-heading import-heading">
        <div>
          <span className="eyebrow">QUẢN TRỊ / THƯ VIỆN</span>
          <h1>
            {state === 'PREVIEW' || state === 'CONFIRMING' ? 'BÁO CÁO NHẬP KHO' : 'NHẬP KHO SÁCH'}
          </h1>
          <p>
            {state === 'PREVIEW' || state === 'CONFIRMING'
              ? 'Kiểm tra dữ liệu trước khi ghi chính thức vào thư viện.'
              : 'Mỗi file Excel tạo thành một kho sách số độc lập.'}
          </p>
        </div>
      </div>
      {(state === 'FORM' || state === 'ANALYZING') && (
        <form className="import-form" onSubmit={(event) => void analyze(event)}>
          <div className="panel-head">THÔNG TIN KHO SÁCH</div>
          <div className="import-form-fields">
            <label>
              TÊN KHO SÁCH
              <input
                value={name}
                maxLength={160}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ví dụ: Kho sách Khoa học"
                disabled={state === 'ANALYZING'}
              />
            </label>
            <label>
              MÔ TẢ NGẮN
              <textarea
                value={description}
                maxLength={1000}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Nội dung nổi bật của kho sách này..."
                disabled={state === 'ANALYZING'}
              />
            </label>
            <div className="import-file-field">
              <span>FILE EXCEL (.XLSX)</span>
              <input
                ref={fileRef}
                className="visually-hidden"
                type="file"
                accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                disabled={state === 'ANALYZING'}
              />
              <button
                type="button"
                className="file-select"
                onClick={() => fileRef.current?.click()}
                disabled={state === 'ANALYZING'}
              >
                <FileSpreadsheet size={26} />
                <strong>{file ? file.name : 'CHỌN FILE EXCEL'}</strong>
                <small>
                  {file
                    ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                    : 'Dữ liệu sách bắt đầu từ hàng 5'}
                </small>
              </button>
            </div>
            {error && <p className="form-error import-error">{error}</p>}
          </div>
          <div className="import-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => navigate('/quan-tri/thu-vien')}
              disabled={state === 'ANALYZING'}
            >
              HỦY
            </button>
            <button className="button primary" type="submit" disabled={state === 'ANALYZING'}>
              {state === 'ANALYZING' ? (
                <>
                  <LoaderCircle className="spin" size={18} /> ĐANG PHÂN TÍCH...
                </>
              ) : (
                <>
                  <Upload size={18} /> PHÂN TÍCH FILE
                </>
              )}
            </button>
          </div>
        </form>
      )}
      {preview && (state === 'PREVIEW' || state === 'CONFIRMING') && (
        <div className="import-preview">
          <section className="import-file-summary">
            <div className="import-file-icon">
              <FileSpreadsheet size={29} />
            </div>
            <div>
              <span className="eyebrow">TẬP TIN ĐÃ PHÂN TÍCH</span>
              <strong>{file?.name || 'library-import.xlsx'}</strong>
              <span>{preview.collection.name}</span>
            </div>
          </section>
          <section className="import-summary-grid">
            <div>
              <span>TỔNG SỐ DÒNG</span>
              <strong>{preview.summary.totalRows}</strong>
            </div>
            <div className="valid">
              <span>HỢP LỆ</span>
              <strong>{preview.summary.validBooks}</strong>
            </div>
            <div className="invalid">
              <span>DÒNG CẦN KIỂM TRA</span>
              <strong>{preview.summary.errorRows}</strong>
            </div>
            <div>
              <span>TÁC GIẢ</span>
              <strong>{preview.summary.authorCount}</strong>
            </div>
            <div>
              <span>NĂM XB</span>
              <strong>{yearRange(preview)}</strong>
            </div>
          </section>
          <section className="import-categories">
            <span className="eyebrow">MÔN LOẠI PHÁT HIỆN</span>
            {preview.summary.categories.length ? (
              <div>
                {preview.summary.categories.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            ) : (
              <p>Chưa có môn loại trong file.</p>
            )}
          </section>
          {preview.errors.length > 0 && (
            <section className="import-errors">
              <div className="panel-head red">
                <TriangleAlert size={18} /> DÒNG CẦN KIỂM TRA
              </div>
              <ul>
                {preview.errors.map((item) => (
                  <li key={item.row}>
                    <strong>ROW {item.row}</strong>
                    <span>{item.messages.join(' · ')}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="import-book-table-wrap">
            <div className="panel-head yellow">DANH SÁCH XEM TRƯỚC</div>
            <table className="import-book-table">
              <thead>
                <tr>
                  <th>ROW</th>
                  <th>TÊN SÁCH</th>
                  <th>TÁC GIẢ</th>
                  <th>NXB</th>
                  <th>NĂM</th>
                  <th>ĐƠN GIÁ</th>
                  <th>MÔN LOẠI</th>
                </tr>
              </thead>
              <tbody>
                {preview.books.map((book) => (
                  <tr className={book.issues?.length ? 'has-issues' : ''} key={book.row}>
                    <td>{book.row}</td>
                    <td>
                      <strong>{book.title}</strong>
                      {book.issues?.length ? (
                        <small>{book.issues.join(' · ')}</small>
                      ) : (
                        <small>
                          <CheckCircle2 size={14} /> Sẵn sàng nhập
                        </small>
                      )}
                    </td>
                    <td>{book.author || '---'}</td>
                    <td>{book.publisher || '---'}</td>
                    <td>{book.publication_year || '---'}</td>
                    <td>{formatBookPrice(book.price) || 'Chưa cập nhật'}</td>
                    <td>{book.category || '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {error && <p className="form-error import-error">{error}</p>}
          <div className="import-actions">
            <button
              className="button secondary"
              onClick={() => void cancelPreview()}
              disabled={state === 'CONFIRMING'}
            >
              <X size={18} /> HỦY IMPORT
            </button>
            <button
              className="button primary"
              onClick={() => void confirm()}
              disabled={state === 'CONFIRMING' || preview.summary.validBooks === 0}
            >
              {state === 'CONFIRMING' ? (
                <>
                  <LoaderCircle className="spin" size={18} /> ĐANG NHẬP...
                </>
              ) : (
                <>
                  <Upload size={18} /> XÁC NHẬN NHẬP KHO
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
