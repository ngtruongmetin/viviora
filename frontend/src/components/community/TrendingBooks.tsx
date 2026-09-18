import { useQuery } from '@tanstack/react-query';
import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { libraryApi } from '../../services/domain/library';

export type TrendingBook = { id: string; title: string; author?: string | null };

export function BookTitleTicker({ title }: { title: string }) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useLayoutEffect(() => {
    const measure = () => setOverflowing(Boolean(measureRef.current && textRef.current && textRef.current.scrollWidth > measureRef.current.clientWidth + 1));
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (observer && measureRef.current) observer.observe(measureRef.current);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [title]);
  return <span ref={measureRef} className={overflowing ? 'trend-title-ticker' : 'trend-title-static'} title={title}>{overflowing ? <span className="trend-title-track"><span ref={textRef}>{title}</span><span aria-hidden="true">{title}</span></span> : <span ref={textRef}>{title}</span>}</span>;
}

export function TrendingBooks() {
  const query = useQuery({ queryKey: ['trending-books', 3], queryFn: () => libraryApi.trendingBooks(3).then((response) => response.data.items) });
  return <aside className="trending"><div className="panel-head">SÁCH THỊNH HÀNH</div>{query.isPending ? <div className="trend-empty"><span>Đang tải sách...</span></div> : query.isError ? <div className="trend-empty"><strong>KHÔNG THỂ TẢI</strong><span>Thử lại sau.</span></div> : query.data?.length ? <>{query.data.map((book, index) => <Link className="trend-book" to={`/thu-vien/sach/${book.id}`} key={book.id}><b>{String(index + 1).padStart(2, '0')}</b><div><strong><BookTitleTicker title={book.title} /></strong><span>{book.author || 'Chưa rõ tác giả'}</span></div></Link>)}<Link className="trend-more" to="/thu-vien/sach-thinh-hanh">XEM THÊM</Link></> : <div className="trend-empty"><strong>CHƯA CÓ DỮ LIỆU</strong><span>Sách thịnh hành sẽ xuất hiện khi thư viện có dữ liệu.</span></div>}</aside>;
}
