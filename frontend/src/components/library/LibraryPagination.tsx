import { ArrowLeft, ArrowRight } from 'lucide-react';

type PaginationProps = {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function LibraryPagination({ page, limit, total, onPageChange }: PaginationProps) {
  const pageCount = Math.ceil(total / limit);
  if (pageCount <= 1) return null;
  return (
    <nav className="library-pagination" aria-label="Phân trang thư viện">
      <button className="icon-button" type="button" title="Trang trước" disabled={page === 1} onClick={() => onPageChange(page - 1)}><ArrowLeft size={18} /></button>
      <span>TRANG {page} / {pageCount}</span>
      <button className="icon-button" type="button" title="Trang sau" disabled={page === pageCount} onClick={() => onPageChange(page + 1)}><ArrowRight size={18} /></button>
    </nav>
  );
}
