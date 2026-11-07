import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Download, Eraser, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { SurveyQuestionFormModal } from '../../components/survey/SurveyQuestionFormModal';
import { surveysApi } from '../../services/domain/surveys';

export function AdminSurveyPage() {
  const client = useQueryClient();
  const [editor, setEditor] = useState<any>(undefined);
  const list = useQuery({
    queryKey: ['admin-surveys'],
    queryFn: () => surveysApi.listAdmin().then((r) => r.data.items),
  });
  const surveyId = list.data?.[0]?.id;
  const detail = useQuery({
    queryKey: ['admin-survey', surveyId],
    queryFn: () => surveysApi.adminDetail(surveyId!).then((r) => r.data.data),
    enabled: !!surveyId,
  });
  const dash = useQuery({
    queryKey: ['survey-dashboard', surveyId],
    queryFn: () => surveysApi.dashboard(surveyId!).then((r) => r.data.data),
    enabled: !!surveyId,
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['admin-surveys'] });
    void client.invalidateQueries({ queryKey: ['admin-survey'] });
    void client.invalidateQueries({ queryKey: ['survey-dashboard'] });
  };
  const update = useMutation({
    mutationFn: (data: object) => surveysApi.update(surveyId!, data),
    onSuccess: () => {
      refresh();
      toast.success('Đã cập nhật khảo sát.');
    },
  });
  const remove = useMutation({
    mutationFn: (qid: string) => surveysApi.removeQuestion(surveyId!, qid),
    onSuccess: refresh,
  });
  const survey = detail.data;
  if (list.isPending || detail.isPending)
    return <div className="state-card">Đang tải khảo sát...</div>;
  if (!survey) return <div className="state-card error">Không tìm thấy khảo sát.</div>;
  const locked = survey.status === 'PUBLISHED';
  const summary = dash.data?.summary;
  const questions = dash.data?.survey?.sections.flatMap((section: any) => section.questions) || [];
  const saveQuestion = async (data: unknown) => {
    try {
      if (editor) await surveysApi.updateQuestion(survey.id, editor.id, data);
      else await surveysApi.createQuestion(survey.id, data);
      toast.success('Đã lưu câu hỏi.');
      refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Không thể lưu câu hỏi.');
      throw error;
    }
  };
  return (
    <div className="survey-admin">
      <header className="page-heading">
        <div>
          <span className="eyebrow">QUẢN TRỊ / NGHIÊN CỨU</span>
          <h1>KHẢO SÁT SAU SỬ DỤNG</h1>
          <p>
            Trạng thái: <strong>{survey.status}</strong>.{' '}
            {locked ? 'Phiếu xuất bản đã khóa cấu trúc.' : 'Có thể chỉnh sửa cấu trúc phiếu.'}
          </p>
        </div>
        <div className="survey-admin-actions">
          <button
            className="button secondary"
            onClick={() => update.mutate({ status: locked ? 'UNPUBLISHED' : 'PUBLISHED' })}
          >
            <Power size={17} />
            {locked ? 'HỦY XUẤT BẢN' : 'XUẤT BẢN'}
          </button>
          <button className="button primary" disabled={locked} onClick={() => setEditor(null)}>
            <Plus size={17} /> THÊM CÂU HỎI
          </button>
          <button
            className="button danger"
            onClick={() => {
              if (confirm('Xóa toàn bộ phản hồi? Thao tác không thể khôi phục.'))
                surveysApi.clearResponses(survey.id).then(refresh);
            }}
          >
            <Eraser size={17} /> XÓA PHẢN HỒI
          </button>
          <a className="button secondary" href={`/api/surveys/admin/${survey.id}/export`}>
            <Download size={17} /> XUẤT CSV
          </a>
          <a className="button secondary" href={`/api/surveys/admin/${survey.id}/export.xlsx`}>
            <Download size={17} /> XUẤT EXCEL
          </a>
        </div>
      </header>
      {survey.is_demo && (
        <div className="survey-internal-banner" role="status">
          <strong>KHẢO SÁT L2</strong>
          <span>Internal data.</span>
        </div>
      )}
      {summary && (
        <section className="member-stats">
          <div className="member-stat blue">
            <span>HỌC SINH ĐỦ ĐIỀU KIỆN</span>
            <strong>{summary.eligible}</strong>
          </div>
          <div className="member-stat yellow">
            <span>ĐÃ HOÀN THÀNH</span>
            <strong>{summary.completed}</strong>
          </div>
          <div className="member-stat">
            <span>TỶ LỆ HOÀN THÀNH</span>
            <strong>{Math.round(summary.completionRate * 100)}%</strong>
          </div>
        </section>
      )}
      <section className="survey-section">
        <h2>BỘ CÂU HỎI</h2>
        {survey.sections.map((section) => (
          <div key={section.id}>
            <h3>{section.title}</h3>
            {section.questions.map((question) => (
              <div className="survey-admin-question survey-admin-question-rich" key={question.id}>
                <div>
                  <span className="survey-type">{question.type}</span>
                  <strong>
                    {question.code}. {question.content}
                  </strong>
                  {question.options.length > 0 && (
                    <small>{question.options.map((option) => option.label).join(' · ')}</small>
                  )}
                </div>
                <div>
                  <button
                    className="icon-button"
                    disabled={locked}
                    onClick={() => setEditor(question)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button destructive"
                    disabled={locked}
                    onClick={() => remove.mutate(question.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>
      <section className="survey-section">
        <h2>
          <BarChart3 size={19} /> PHÂN TÍCH KẾT QUẢ
        </h2>
        {questions.map((question: any) => {
          const stat = dash.data?.stats?.[question.id];
          if (question.type === 'TEXT')
            return (
              <article className="survey-chart" key={question.id}>
                <h3>
                  {question.code}. {question.content}
                </h3>
                <p>{stat?.count || 0} phản hồi mở.</p>
              </article>
            );
          const data = Object.entries(stat?.counts || {}).map(([name, value]) => ({ name, value }));
          return (
            <article className="survey-chart" key={question.id}>
              <h3>
                {question.code}. {question.content}
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide={data.length > 6} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f6c445" />
                </BarChart>
              </ResponsiveContainer>
            </article>
          );
        })}
      </section>
      {editor !== undefined && (
        <SurveyQuestionFormModal
          survey={survey}
          question={editor || undefined}
          onClose={() => setEditor(undefined)}
          onSave={saveQuestion}
        />
      )}
    </div>
  );
}
