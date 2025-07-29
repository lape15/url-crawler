import { useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrawledURLs } from '../../hooks/useCrawl';
import { Table } from '../../components/table/table';
import { extractColumnsFromData } from '../../utils/table';
import styles from './dashboard.module.css';
import Input from '../../components/form/input';
import { useCrawState } from '../../hooks/useCrawlState';
import Button from '../../components/buttons/button';
import { ProgressBar } from '../../components/progress-bar/progress';
import type { CrawledURL } from '../../types/url';

export const PostDashboard = () => {
  const { data, isLoading, error } = useCrawledURLs();
  const {
    crawlUrl,
    handleCrawlUrlState,
    handleCrawlSubmit,
    isPending,
    status,
  } = useCrawState();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Map<string, string>>(new Map());

  const columns = useMemo(() => {
    return extractColumnsFromData(data || []);
  }, [data]);

  const navigateToUrlPage = useCallback(
    (params: CrawledURL) => {
      const { ID: id, URL: url } = params;
      navigate(`/url/${id}`, {
        state: {
          url,
        },
      });
    },
    [navigate],
  );

  const handleSelectedMap = useCallback(
    (payload: CrawledURL) => {
      const { URL: id } = payload;
      const temp = selected;
      if (temp.has(id)) {
        temp.delete(id);
      } else {
        temp.set(id, id);
      }
      setSelected(temp);
    },
    [selected],
  );

  const urlActions = useMemo(
    () => ({
      navigateAction: navigateToUrlPage,
      selectAction: handleSelectedMap,
    }),
    [navigateToUrlPage, handleSelectedMap],
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
        data={data || []}
        columns={columns}
        canDelete={true}
        action={urlActions}
        selected={selected}
      />
    </div>
  );
};
