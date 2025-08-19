import { useMemo } from 'react';
import style from './pagination.module.css';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function getPagination(current: number, total: number) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pagesSet = new Set([1, 2, total - 1, total]);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) pagesSet.add(p);
  }
  const sorted = Array.from(pagesSet).sort((a, b) => a - b);
  const display = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || sorted[i] === sorted[i - 1] + 1) {
      display.push(sorted[i]);
    } else {
      display.push('...');
      display.push(sorted[i]);
    }
  }
  return display;
}
export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) => {
  const pageList = useMemo(() => {
    return getPagination(currentPage, totalPages);
  }, [currentPage, totalPages]);

  return (
    <nav className={style.pagination} aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${style.paginationBtn} `}
      >
        Prev
      </button>
      {pageList.map((item, idx) =>
        item === '...' ? (
          <span key={`dots-${idx}`} className="px-3 py-1 text-gray-500">
            ...
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item as number)}
            aria-current={item === currentPage ? 'page' : undefined}
            className={`${style.paginationBtn} ${
              item === currentPage ? style.active : ''
            }`}
          >
            {item}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${style.paginationBtn} `}
      >
        Next
      </button>
    </nav>
  );
};
