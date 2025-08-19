import { useState, useEffect } from 'react';
import type { TableCrawledURL } from '../types/url';

export const pageDropdownOptions = [10, 25, 50, 100];
export const usePaginationState = (items: Array<TableCrawledURL>) => {
  const [perPage, setPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [perPage, totalPages, currentPage]);
  const startIdx = (currentPage - 1) * perPage;
  const endIdx = Math.min(items.length, startIdx + perPage);
  const visibleItems = items.slice(startIdx, endIdx);

  if (items.length === 0)
    return {
      visibleItems: [],
      currentPage: 0,
      totalPages: 1,
      onPageChange: () => {},
      handlePerPageChange: () => {},
    };
  const onPageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  return {
    visibleItems,
    currentPage,
    totalPages,
    onPageChange,
    handlePerPageChange,
  };
};
