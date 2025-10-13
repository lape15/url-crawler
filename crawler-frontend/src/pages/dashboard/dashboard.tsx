import styles from './dashboard.module.css';
import Input from '../../components/form/input';
import { useCrawState } from '../../hooks/useCrawlState';
import Button from '../../components/buttons/button';
import { ProgressBar } from '../../components/progress-bar/progress';
import { AllUrls } from '../url/all_urls';
import { useCrawlerStore } from '../../store';

export const PostDashboard = () => {
  const {
    handleCrawlUrlState,
    handleCrawlSubmit,

    status,
    crawlUrl,
  } = useCrawState();

  const isLoading = useCrawlerStore((state) => state.isLoading);
  const crawledUrls = useCrawlerStore((state) => state.crawledUrls);

  // console.log({ jobStatus, progress, urls, isDone });

  if (isLoading && !crawledUrls.length) {
    return <div>Loading...</div>;
  }

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
          helpText='Separate multiple URLs with ","'
        />
        <Button
          title="Get Analytics"
          onClick={handleCrawlSubmit}
          type="button"
          disabled={!crawlUrl || isLoading}
        />
      </div>
      {status && (
        <div>
          <span className={styles.status}>{status.state.message}</span>
          <ProgressBar />
        </div>
      )}
      <AllUrls />
    </div>
  );
};
