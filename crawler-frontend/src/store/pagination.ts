import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TableCrawledURL } from '../types/url';
import type { Column } from '../types/components';
type PaginationState = {
  items: TableCrawledURL[];
  perPage: number;
  currentPage: number;
  setPerPage: (page: number) => void;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  handlePerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onPageChange: (page: number) => void;
  visibleItems: TableCrawledURL[];
  columns: Column<TableCrawledURL>[];
  //   paginationItems: TableCrawledURL[];
  actions: {
    setPaginationitems: (items: TableCrawledURL[]) => void;
    onPageChange: (page: number) => void;
  };
};

export const usePaginationStore = create<PaginationState>()(
  devtools((set, get) => {
    const recalcvisibility = (items: TableCrawledURL[]) => {
      const { currentPage, perPage } = get();

      const startIdx = (currentPage - 1) * perPage;
      const endIdx = Math.min(items.length, startIdx + perPage);
      const visibleItems = items.slice(startIdx, endIdx);
      const totalPages = Math.max(1, Math.ceil(items.length / perPage));
      set({ items, visibleItems, totalPages });
    };

    return {
      perPage: 5,
      currentPage: 1,
      setPerPage: (page: number) => set({ perPage: page }),
      setCurrentPage: (page: number) => set({ currentPage: page }),
      columns: [],
      visibleItems: [],
      totalPages: 1,
      actions: {
        setPaginationitems: (items: TableCrawledURL[]) => {
          recalcvisibility(items);
        },
        onPageChange: (page: number) => {
          set({ currentPage: page });
          recalcvisibility(get().items);
        },
        handlePerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
          const { currentPage, totalPages } = get();
          set({
            perPage: parseInt(e.target.value),
            currentPage: currentPage > totalPages ? totalPages : currentPage,
          });
          recalcvisibility(get().items);
        },
      },
    };
  }),
);
