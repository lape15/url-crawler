import { useBulkCrawl } from './useCrawl';
import { useCrawlWebSocket } from './useCrawlWebSocket';
import type { CrawlActionState } from '../types/url';

type UrlBulkCrawl = {
  selected: Map<string, string>;
  setStatus: React.Dispatch<React.SetStateAction<CrawlActionState | undefined>>;
};

export const useUrlBulkCraw = (props: UrlBulkCrawl) => {
  const { selected, setStatus } = props;
  const { mutate, isPending } = useBulkCrawl();

  const handleBulkCrawl = () => {
    const urls = Array.from(selected.values());
    mutate(urls);
  };

  const { start, stop, isConnected } = useCrawlWebSocket({
    onStatusUpdate: (state: CrawlActionState | undefined) => {
      setStatus(state);
    },
    isCrawling: isPending,
    onMutate: handleBulkCrawl,
  });

  const handleBulkWsCrawlAction = () => {
    start('', true);
  };

  const handleStopBulkCrawlAction = () => {
    const urls = Array.from(selected.values());
    stop('', urls);
  };

  return {
    handleBulkWsCrawlAction,
    handleStopBulkCrawlAction,
    isConnected,
  };
};
