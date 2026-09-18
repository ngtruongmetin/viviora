import { ArrowLeft, CheckCircle2, Eye, EyeOff, ListChecks, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { BookCover } from '../../components/library/BookCover';
import { ConfirmQuestionDeleteModal } from '../../components/questionBank/ConfirmQuestionDeleteModal';
import { QuestionFormModal } from '../../components/questionBank/QuestionFormModal';
import { QuestionImportModal } from '../../components/questionBank/QuestionImportModal';
import { questionBanksApi, type Question, type QuestionInput, type QuestionType } from '../../services/domain/questionBanks';

export function QuestionBankPage() {
  const { bankId = '' } = useParams();
  const client = useQueryClient();
  const [filter, setFilter] = useState<QuestionType | undefined>();
  const [editing, setEditing] = useState<Question | null | undefined>();
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [deleteBank, setDeleteBank] = useState(false);
  const [importing, setImporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const bankQuery = useQuery({ queryKey: ['question-bank', bankId], queryFn: () => questionBanksApi.detail(bankId).then((response) => response.data), enabled: Boolean(bankId) });
  const questionsQuery = useQuery({ queryKey: ['question-bank-questions', bankId, filter], queryFn: () => questionBanksApi.questions(bankId, filter).then((response) => response.data), enabled: Boolean(bankId) });
  const refresh = async () => { await client.invalidateQueries({ queryKey: ['question-bank', bankId] }); await client.invalidateQueries({ queryKey: ['question-bank-questions', bankId] }); };
  const save = async (data: QuestionInput) => { if (editing) await questionBanksApi.updateQuestion(editing.id, data); else await questionBanksApi.createQuestion(bankId, data); toast.success(editing ? 'Đã cập nhật câu hỏi' : 'Đã thêm câu hỏi'); setEditing(undefined); await refresh(); };
  const remove = async () => { if (!deleting) return; setBusy(true); try { await questionBanksApi.removeQuestion(deleting.id); setDeleting(null); await refresh(); } catch { toast.error('Không thể xóa câu hỏi.'); } finally { setBusy(false); } };
  const removeBank = async () => { setBusy(true); try { await questionBanksApi.remove(bankId); window.location.href = '/kho-cau-hoi'; } catch { toast.error('Không thể xóa kho câu hỏi.'); setBusy(false); } };
  if (bankQuery.isPending) return <div className="state-card">Đang tải kho câu hỏi...</div>;
  if (bankQuery.isError || !bankQuery.data) return <div className="state-card error">Không tìm thấy kho câu hỏi này.</div>;
  const bank = bankQuery.data.data;
  const questions = questionsQuery.data?.items || [];
  return <div className="question-bank-page">
    <Link className="back-link" to="/kho-cau-hoi"><ArrowLeft size={17} /> QUAY LẠI KHO CÂU HỎI</Link>
    <section className="question-bank-hero"><div className="question-book-mark"><BookCover book={{ title: bank.book.title, author: bank.book.author, category: null, cover_url: bank.book.cover_url }} compact /></div><div><span className="eyebrow">QUESTION BANK / KHO CÂU HỎI</span><h1>{bank.book.title}</h1><p>{bank.book.author || 'Chưa rõ tác giả'}</p></div><div className="question-bank-hero-actions"><button className="button primary" type="button" onClick={() => setImporting(true)}><Plus size={17} /> NHẬP CÂU HỎI TỪ EXCEL</button><button className="button danger" type="button" onClick={() => setDeleteBank(true)}><Trash2 size={17} /> XÓA KHO</button></div></section>
    <div className="question-stat-grid"><div><span>TỔNG CÂU HỎI</span><strong>{bank.statistics.total}</strong></div><div className="mc"><span>MULTIPLE CHOICE</span><strong>{bank.statistics.mc}</strong></div><div className="tf"><span>TRUE / FALSE</span><strong>{bank.statistics.tf}</strong></div></div>
    <div className="question-list-heading"><div className="question-list-title"><h2>CÂU HỎI</h2><button className="button primary" type="button" onClick={() => setEditing(null)}><Plus size={17} /> THÊM CÂU HỎI</button></div><div className="question-filters"><button className={!filter ? 'selected' : ''} type="button" onClick={() => setFilter(undefined)}>TẤT CẢ {bank.statistics.total}</button><button className={filter === 'MC' ? 'selected' : ''} type="button" onClick={() => setFilter('MC')}>MC {bank.statistics.mc}</button><button className={filter === 'TF' ? 'selected' : ''} type="button" onClick={() => setFilter('TF')}>TF {bank.statistics.tf}</button></div></div>
    {questionsQuery.isPending ? <div className="state-card">Đang tải câu hỏi...</div> : questions.length === 0 ? <section className="question-empty state-card"><span className="empty-icon"><ListChecks size={32} /></span><h2>CHƯA CÓ CÂU HỎI</h2><p>Thêm câu hỏi MC hoặc TF đầu tiên cho cuốn sách này.</p><button className="button primary" type="button" onClick={() => setEditing(null)}><Plus size={17} /> THÊM CÂU HỎI</button></section> : <div className="question-cards">{questions.map((question) => <QuestionCard key={question.id} question={question} expanded={Boolean(expanded[question.id])} onToggle={() => setExpanded((current) => ({ ...current, [question.id]: !current[question.id] }))} onEdit={() => setEditing(question)} onDelete={() => setDeleting(question)} />)}</div>}
    {editing !== undefined && <QuestionFormModal question={editing || undefined} onClose={() => setEditing(undefined)} onSubmit={save} />}
    {importing && <QuestionImportModal bankId={bankId} onClose={() => setImporting(false)} onImported={refresh} />}
    {deleting && <ConfirmQuestionDeleteModal title="XÓA CÂU HỎI?" message="Hành động này không thể hoàn tác." loading={busy} onClose={() => setDeleting(null)} onConfirm={() => void remove()} />}
    {deleteBank && <ConfirmQuestionDeleteModal title="XÓA KHO CÂU HỎI?" message={`Xóa kho của ${bank.book.title} sẽ xóa toàn bộ câu hỏi liên quan.`} loading={busy} onClose={() => setDeleteBank(false)} onConfirm={() => void removeBank()} />}
  </div>;
}

function QuestionCard({ question, expanded, onToggle, onEdit, onDelete }: { question: Question; expanded: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return <article className={`question-card ${expanded ? 'is-expanded' : ''}`}><header className={question.type === 'MC' ? 'mc' : 'tf'}><strong>{question.type === 'MC' ? <><ListChecks size={16} /> MC</> : <><CheckCircle2 size={16} /> TF</>}</strong></header><div className="question-card-content"><span className="question-card-label">CÂU HỎI</span><h3>{question.content}</h3>{expanded && <div className="question-answer-reveal">{question.type === 'MC' ? <div className="answer-summary">{question.options.map((option, index) => <span className={option.is_correct ? 'correct' : ''} key={option.id || index}>{String.fromCharCode(65 + index)}. {option.label}{option.is_correct && <CheckCircle2 size={17} />}</span>)}</div> : <div className="tf-summary"><span>ĐÁP ÁN</span>{question.correct_answer ? <><CheckCircle2 size={17} /> ĐÚNG</> : <><XCircle size={17} /> SAI</>}</div>}{question.answer_explanation && <p className="explanation"><strong>GIẢI THÍCH</strong>{question.answer_explanation}</p>}</div>}<button className="answer-toggle" type="button" onClick={onToggle}>{expanded ? <EyeOff size={17} /> : <Eye size={17} />} {expanded ? 'ẨN ĐÁP ÁN' : 'HIỆN ĐÁP ÁN'}</button></div><footer><button className="button secondary" type="button" onClick={onEdit}><Pencil size={16} /> SỬA</button><button className="button danger" type="button" onClick={onDelete}><Trash2 size={17} /> XÓA</button></footer></article>;
}
