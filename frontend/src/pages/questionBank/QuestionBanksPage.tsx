import { BookOpen, ChevronRight, Database, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { questionBanksApi } from '../../services/domain/questionBanks';

export function QuestionBanksPage() {
  const query = useQuery({
    queryKey: ['question-banks'],
    queryFn: () => questionBanksApi.list().then((response) => response.data),
  });
  if (query.isPending) return <div className="state-card">Đang tải kho câu hỏi...</div>;
  if (query.isError)
    return <div className="state-card error">Không thể tải kho câu hỏi lúc này.</div>;
  const items = query.data?.items || [];
  return (
    <div className="question-banks-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">VIVIORA / QUESTION BANK</span>
          <h1>KHO CÂU HỎI</h1>
          <p>Quản lý câu hỏi ôn tập được gắn trực tiếp với từng đầu sách.</p>
        </div>
      </div>
      {items.length === 0 ? (
        <section className="question-empty state-card">
          <span className="empty-icon">
            <Database size={32} />
          </span>
          <h2>CHƯA CÓ KHO CÂU HỎI</h2>
          <p>Hãy mở một đầu sách trong thư viện để bắt đầu xây dựng bộ câu hỏi.</p>
          <Link className="button primary" to="/thu-vien">
            <BookOpen size={17} /> ĐI ĐẾN THƯ VIỆN
          </Link>
        </section>
      ) : (
        <div className="question-bank-list">
          {items.map((bank) => (
            <Link className="question-bank-card" to={`/kho-cau-hoi/${bank.id}`} key={bank.id}>
              <div className="question-bank-card-top">
                <span>QUESTION BANK</span>
                <ChevronRight size={22} />
              </div>
              <h2>{bank.book.title}</h2>
              <p>{bank.book.author || 'Chưa rõ tác giả'}</p>
              <div className="question-bank-stats">
                <div>
                  <strong>{bank.statistics.total}</strong>
                  <span>TỔNG CÂU</span>
                </div>
                <div>
                  <strong>{bank.statistics.mc}</strong>
                  <span>
                    <ListChecks size={14} /> MC
                  </span>
                </div>
                <div>
                  <strong>{bank.statistics.tf}</strong>
                  <span>TF</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
