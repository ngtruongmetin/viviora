import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { questionBanksApi, type QuestionImportPreview } from '../../services/domain/questionBanks';

type Props = { bankId: string; onClose: () => void; onImported: () => Promise<void> };

export function QuestionImportModal({ bankId, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<QuestionImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const invalid = Boolean(preview?.invalidRows);
  const cancelTemporary = async () => {
    if (preview)
      await questionBanksApi.cancelImport(bankId, preview.temporaryImportId).catch(() => undefined);
  };
  const close = async () => {
    await cancelTemporary();
    onClose();
  };
  const chooseFile = (next: File | null) => {
    setFile(next);
    setPreview(null);
  };
  const checkFile = async () => {
    if (!file) return toast.error('Hãy chọn file Excel .xlsx.');
    setBusy(true);
    try {
      setPreview((await questionBanksApi.previewImport(bankId, file)).data.data);
    } catch {
      toast.error('Không thể phân tích file Excel.');
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!preview || invalid) return;
    setBusy(true);
    try {
      const result = await questionBanksApi.confirmImport(bankId, preview.temporaryImportId);
      toast.success(`Đã nhập ${result.data.data.imported} câu hỏi.`);
      await onImported();
      onClose();
    } catch {
      toast.error('Không thể nhập câu hỏi.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => void close()}>
      <section
        className="viviora-modal question-import-modal"
        role="dialog"
        aria-modal="true"
        aria-label="NHẬP CÂU HỎI TỪ EXCEL"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="question-import-heading">
          <div>
            <span className="eyebrow">QUESTION BANK / NHẬP DỮ LIỆU</span>
            <h2>NHẬP CÂU HỎI TỪ EXCEL</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Đóng"
            onClick={() => void close()}
          >
            <X size={20} />
          </button>
        </header>
        <div className="question-import-steps">
          <span className={!preview ? 'active' : ''}>01 TẢI FILE</span>
          <span className={preview ? 'active' : ''}>02 KIỂM TRA & XÁC NHẬN</span>
        </div>
        {!preview ? (
          <div className="question-import-upload">
            <button
              className="question-import-dropzone"
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <FileSpreadsheet size={42} />
              <strong>{file ? file.name : 'CHỌN FILE EXCEL'}</strong>
              <small>
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                  : 'Tải lên file .xlsx cho kho hiện tại.'}
              </small>
            </button>
            <input
              ref={fileRef}
              className="visually-hidden"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => chooseFile(event.target.files?.[0] || null)}
            />
            <div className="question-import-guide">
              <strong>A TYPE · B QUESTION · C-F OPTIONS · G EXPLAIN · H POINT</strong>
              <span>
                MC: 4 đáp án, chỉ 1 đáp án bắt đầu bằng *. TF: C = * là TRUE, D = * là FALSE. Point
                để trống mặc định 10.
              </span>
            </div>
          </div>
        ) : (
          <div className="question-import-preview">
            <div className="question-import-filebar">
              <span>
                <FileSpreadsheet size={18} /> {preview.fileName}
              </span>
              <strong>{preview.totalRows} DÒNG</strong>
            </div>
            <div className="question-import-stat-grid">
              <div>
                <span>TỔNG CÂU HỎI</span>
                <strong>{preview.statistics.total}</strong>
              </div>
              <div>
                <span>HỢP LỆ</span>
                <strong>{preview.validRows}</strong>
              </div>
              <div className={invalid ? 'invalid' : ''}>
                <span>LỖI</span>
                <strong>{preview.invalidRows}</strong>
              </div>
            </div>
            {invalid ? (
              <div className="question-import-error-summary">
                <h3>
                  <AlertTriangle size={19} /> FILE CẦN ĐƯỢC SỬA
                </h3>
                {preview.errors.map((error) => (
                  <p key={error.row}>
                    <strong>DÒNG {error.row}</strong>
                    <span>{error.messages.join(' · ')}</span>
                  </p>
                ))}
              </div>
            ) : (
              <div className="question-import-ready">
                <CheckCircle2 size={19} /> FILE HỢP LỆ - SẴN SÀNG NHẬP
              </div>
            )}
            <div className="question-import-list">
              <div className="question-import-list-head">XEM TRƯỚC DỮ LIỆU</div>
              {preview.rows.map((row) => (
                <div className="question-import-row" key={row.rowNumber}>
                  <span>{row.rowNumber}</span>
                  <b className={row.type === 'TF' ? 'tf' : 'mc'}>{row.type}</b>
                  <strong>{row.question || 'Dòng chưa có nội dung'}</strong>
                  <em>{row.point} ĐIỂM</em>
                </div>
              ))}
            </div>
          </div>
        )}
        <footer className="question-import-footer">
          <button
            className="button secondary"
            type="button"
            onClick={() => void close()}
            disabled={busy}
          >
            HỦY
          </button>
          {preview ? (
            <>
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  void cancelTemporary();
                  chooseFile(null);
                }}
                disabled={busy}
              >
                QUAY LẠI
              </button>
              {!invalid && (
                <button
                  className="button primary"
                  type="button"
                  onClick={() => void confirm()}
                  disabled={busy}
                >
                  {busy ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />} XÁC
                  NHẬN NHẬP {preview.validRows} CÂU
                </button>
              )}
            </>
          ) : (
            <button
              className="button primary"
              type="button"
              onClick={() => void checkFile()}
              disabled={busy || !file}
            >
              {busy ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />} KIỂM TRA
              FILE
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
