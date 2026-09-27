import { Check, CheckCircle2, Circle, ListChecks, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LibraryModal } from '../library/LibraryModal';
import type { Question, QuestionInput, QuestionType } from '../../services/domain/questionBanks';

const labels = ['A', 'B', 'C', 'D'];
type Props = {
  question?: Question;
  onClose: () => void;
  onSubmit: (data: QuestionInput) => Promise<void>;
};

export function QuestionFormModal({ question, onClose, onSubmit }: Props) {
  const [type, setType] = useState<QuestionType>(question?.type || 'MC');
  const [content, setContent] = useState(question?.content || '');
  const [explanation, setExplanation] = useState(question?.answer_explanation || '');
  const [options, setOptions] = useState(
    labels.map((label) => ({
      label: question?.options.find((item) => item.position === labels.indexOf(label))?.label || '',
      isCorrect: Boolean(
        question?.options.find((item) => item.position === labels.indexOf(label))?.is_correct,
      ),
    })),
  );
  const [correctAnswer, setCorrectAnswer] = useState<boolean | undefined>(question?.correct_answer);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (type === 'TF')
      setCorrectAnswer(question?.type === 'TF' ? question.correct_answer : undefined);
  }, [type, question]);
  const submit = async () => {
    if (!content.trim()) return toast.error('Vui lòng nhập nội dung câu hỏi.');
    if (
      type === 'MC' &&
      (options.some((item) => !item.label.trim()) ||
        options.filter((item) => item.isCorrect).length !== 1)
    )
      return toast.error('MC cần đủ 4 đáp án và đúng 1 đáp án đúng.');
    if (type === 'TF' && correctAnswer === undefined)
      return toast.error('Vui lòng chọn ĐÚNG hoặc SAI.');
    setBusy(true);
    try {
      await onSubmit({
        type,
        content: content.trim(),
        answerExplanation: explanation.trim() || null,
        ...(type === 'MC'
          ? { options: options.map((item) => ({ ...item, label: item.label.trim() })) }
          : { correctAnswer }),
      });
    } catch {
      toast.error('Không thể lưu câu hỏi.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <LibraryModal title={question ? 'SỬA CÂU HỎI' : 'THÊM CÂU HỎI'} onClose={onClose} wide>
      <div className="question-modal-body">
        <div className="question-type-tabs">
          <button
            type="button"
            className={type === 'MC' ? 'active' : ''}
            onClick={() => setType('MC')}
          >
            <ListChecks size={17} /> MC - TRẮC NGHIỆM
          </button>
          <button
            type="button"
            className={type === 'TF' ? 'active' : ''}
            onClick={() => setType('TF')}
          >
            <CheckCircle2 size={17} /> TF - ĐÚNG / SAI
          </button>
        </div>
        <label className="question-field">
          <span>{type === 'TF' ? 'MỆNH ĐỀ' : 'NỘI DUNG CÂU HỎI'}</span>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} />
        </label>
        {type === 'MC' ? (
          <div className="question-options">
            <div className="question-field-heading">
              <span>CÁC ĐÁP ÁN</span>
              <small>CHỌN ĐÁP ÁN ĐÚNG</small>
            </div>
            {options.map((option, index) => (
              <div className="question-option-input" key={labels[index]}>
                <strong>{labels[index]}.</strong>
                <input
                  value={option.label}
                  onChange={(event) =>
                    setOptions(
                      options.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, label: event.target.value } : item,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className={option.isCorrect ? 'correct' : ''}
                  title={`Chọn đáp án ${labels[index]} đúng`}
                  onClick={() =>
                    setOptions(
                      options.map((item, itemIndex) => ({
                        ...item,
                        isCorrect: itemIndex === index,
                      })),
                    )
                  }
                >
                  {option.isCorrect ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="question-field">
            <span>ĐÁP ÁN ĐÚNG</span>
            <div className="tf-choice">
              <button
                type="button"
                className={correctAnswer === true ? 'selected true' : ''}
                onClick={() => setCorrectAnswer(true)}
              >
                <Check size={22} /> ĐÚNG
              </button>
              <button
                type="button"
                className={correctAnswer === false ? 'selected false' : ''}
                onClick={() => setCorrectAnswer(false)}
              >
                <X size={22} /> SAI
              </button>
            </div>
          </div>
        )}
        <label className="question-field">
          <span>
            GIẢI THÍCH ĐÁP ÁN <small>(TÙY CHỌN)</small>
          </span>
          <textarea
            className="short"
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
          />
        </label>
      </div>
      <div className="modal-actions">
        <button className="button secondary" type="button" onClick={onClose} disabled={busy}>
          HỦY
        </button>
        <button
          className="button primary"
          type="button"
          onClick={() => void submit()}
          disabled={busy}
        >
          <Save size={17} /> {busy ? 'ĐANG LƯU...' : 'LƯU CÂU HỎI'}
        </button>
      </div>
    </LibraryModal>
  );
}
