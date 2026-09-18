import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { libraryApi } from '../../services/domain/library';
import { BookTitleTicker } from '../../components/community/TrendingBooks';

export function TrendingBooksPage() {
  const query = useQuery({ queryKey: ['trending-books', 'all'], queryFn: () => libraryApi.trendingBooks(100).then((response) => response.data.items) });
  return <div className="trending-books-page"><Link className="back-link" to="/thu-vien"><ArrowLeft size={17} /> QUAY LẠI THƯ VIỆN</Link><header className="page-heading trending-books-heading"><div><span className="eyebrow">THƯ VIỆN / XẾP HẠNG</span><h1>SÁCH THỊNH HÀNH</h1><p>Những đầu sách đang được cộng đồng quan tâm qua đánh giá, game và ảnh bìa.</p></div><Trophy size={42} /></header>{query.isPending ? <div className="state-card">Đang tải bảng xếp hạng...</div> : query.isError ? <div className="state-card error">Không thể tải bảng xếp hạng lúc này.</div> : query.data?.length ? <section className="trending-books-list">{query.data.map((book, index) => <Link className="trending-book-row" to={`/thu-vien/sach/${book.id}`} key={book.id}><b>{String(index + 1).padStart(2, '0')}</b><div><strong><BookTitleTicker title={book.title} /></strong><span>{book.author || 'Chưa rõ tác giả'}</span></div></Link>)}</section> : <div className="state-card empty-state">Chưa có sách đủ điều kiện thịnh hành.</div>}</div>;
}
