import { useLocation } from 'react-router-dom';
import type { CrawledURL } from '../../types/url';
import { useUrl } from '../../hooks/useUrl';
import styles from './url.module.css';
import Button from '../../components/buttons/button';
import { ChartComponent } from '../../components/chart/chart';
import { useCrawState } from '../../hooks/useCrawlState';
import { getChartLinkData, renderData } from '../../utils/chart';

const excluded = ['ID', 'UserID'];

export const UrlPage = () => {
  const location = useLocation();

  const { handleCrawlSubmit, isPending, cancelCrawl, isConnected } =
    useCrawState();

  const routeState = location.state as { url?: string };
  const { data, isLoading, error } = useUrl(routeState?.url || '');
  const urlKeys = Object.keys(data || {}) as (keyof CrawledURL)[];

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Failed to load url details.</p>;

  const crawlUrlAction = () => {
    handleCrawlSubmit(routeState?.url || '');
  };
  const cancelCrawlAction = () => {
    cancelCrawl(routeState?.url || '');
  };

  return (
    <div className={styles.urlArea}>
      <div className={styles.urlHeader}>
        <h2>{routeState?.url}</h2>
        <div className={styles.urlActions}>
          <Button
            title="Crawl"
            type="button"
            onClick={crawlUrlAction}
            disabled={isPending || isConnected}
          />
          <Button
            title="Stop"
            type="button"
            onClick={cancelCrawlAction}
            disabled={!isPending}
          />
        </div>
      </div>
      <div className={styles.url}>
        <div className={styles.urlInfo}>
          {urlKeys
            .filter((key) => !excluded.includes(key))
            .map((key) => (
              <div className={styles.urlInfoItem} key={key}>
                <p>{key} :</p>
                <span>{renderData(data?.[key])}</span>
              </div>
            ))}
        </div>
        <div className={styles.urlChart} style={{ height: '400px' }}>
          <ChartComponent data={getChartLinkData(data!)} />
        </div>
      </div>
    </div>
  );
};
