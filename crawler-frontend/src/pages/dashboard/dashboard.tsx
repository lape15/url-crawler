import { useMemo } from 'react';
import { useCrawledURLs } from '../../hooks/useCrawl';
import { Table } from '../../components/table/table';
import { extractColumnsFromData } from '../../utils/table';
import styles from './dashboard.module.css';
import Input from '../../components/form/input';
import { useCrawState } from '../../hooks/useCrawlState';
import Button from '../../components/buttons/button';
import { ProgressBar } from '../../components/progress-bar/progress';
import { Pagination } from '../../components/pagination/pagination';

export const PostDashboard = () => {
  const { data, isLoading, error } = useCrawledURLs();
  const {
    crawlUrl,
    handleCrawlUrlState,
    handleCrawlSubmit,
    isPending,
    status,
    handleSelectedMap,
    handleSelectAll,
    navigateToUrlPage,
    selected,
    deleteSelectedUrls,
    currentPage,
    totalPages,
    onPageChange,
    visibleItems,
  } = useCrawState(data);

  const columns = useMemo(() => {
    return extractColumnsFromData(visibleItems || []);
  }, [visibleItems]);

  const urlActions = useMemo(
    () => ({
      navigateAction: navigateToUrlPage,
      selectAction: handleSelectedMap,
      handleSelectAll,
      deleteSelectedUrls,
    }),
    [navigateToUrlPage, handleSelectedMap, handleSelectAll, deleteSelectedUrls],
  );

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Failed to load data.</p>;

  return (
    <div className={styles.dashboard}>
      <h2>Welcome to your Dashboard!</h2>
      <div className={styles.crawlArea}>
        <Input
          type="text"
          onChange={handleCrawlUrlState}
          value={crawlUrl}
          placeholder="Enter URL"
          label=""
          name="url"
        />
        <Button
          title="Get Analytics"
          onClick={handleCrawlSubmit}
          type="button"
          disabled={!crawlUrl || isPending}
        />
      </div>
      {status && (
        <div>
          <span className={styles.status}>{status.state.message}</span>
          <ProgressBar />
        </div>
      )}
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
