import { useMemo, useEffect, useCallback } from 'react';
import { extractColumnsFromData } from '../../utils/table';
import { Table } from '../../components/table/table';
import { Pagination } from '../../components/pagination/pagination';
import {
  usePaginationStore,
  useCrawlerStore,
  useCrawlerActions,
} from '../../store';
import { useUrlBulkCrawler, useDeleteMultipleUrls } from '../../hooks';
import type { MutateFnType } from '../../types';
import { useCrawState } from '../../hooks/useCrawlState';
import styles from '../pages.module.css';

export const AllUrls = () => {
  const crawledUrls = useCrawlerStore((state) => state.crawledUrls);
  const visibleItems = usePaginationStore((state) => state.visibleItems);
  const selected = useCrawlerStore((state) => state.selected);
  const { mutate: deleteMutateMultiple } = useDeleteMultipleUrls();
  const setPaginationitems = usePaginationStore(
    (state) => state.actions.setPaginationitems,
  );
  const { navigateToUrlPage } = useCrawState();
  const currentPage = usePaginationStore((state) => state.currentPage);
  const totalPages = usePaginationStore((state) => state.totalPages);
  const onPageChange = usePaginationStore(
    (state) => state.actions.onPageChange,
  );
  const { handleSelectedMap, handleSelectAll, deleteSelectedUrls } =
    useCrawlerActions();

  const { handleBulkCrawlAction, jobStatus, progress, urls, isDone } =
    useUrlBulkCrawler();

  useEffect(() => {
    setPaginationitems(crawledUrls);
  }, [crawledUrls, setPaginationitems]);

  const columns = useMemo(() => {
    return extractColumnsFromData(visibleItems || []);
  }, [visibleItems]);

  const passDeleteMutation = useCallback(
    () => deleteSelectedUrls(deleteMutateMultiple as unknown as MutateFnType),
    [deleteMutateMultiple, deleteSelectedUrls],
  );

  const urlActions = useMemo(
    () => ({
      navigateAction: navigateToUrlPage,
      selectAction: handleSelectedMap,
      handleSelectAll,
      deleteSelectedUrls: passDeleteMutation,
      handleBulkCrawlAction,
    }),
    [
      navigateToUrlPage,
      handleSelectedMap,
      handleSelectAll,
      passDeleteMutation,
      handleBulkCrawlAction,
    ],
  );

  // console.log({ jobStatus, progress, urls, isDone });
  return (
    <div className={styles.pages}>
      <Table
        data={visibleItems || []}
        columns={columns}
        canDelete={true}
        action={urlActions}
        selected={selected}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
};
