import { useMemo } from 'react';
import { useBulkCrawl, useCrawlUrSubmit } from './index';
// import { useCrawlWebSocket } from './useCrawlWebSocket';
import type { CrawlActionState, MutateFnType } from '../types/url';
import { useCrawlJobWorker } from './useCrawlJobWorker';
import { useCrawlerActions, useCrawlerStore } from '../store';

type UrlBulkCrawl = {
  selected: Map<string, string>;
  setStatus: (state: CrawlActionState) => void;
};

export const useUrlBulkCrawler = (props?: UrlBulkCrawl) => {
  const { mutate, isPending } = useBulkCrawl();
  const { mutate: crawlMutate } = useCrawlUrSubmit();
  const { handleBulkCrawlSubmit, submitCrawl } = useCrawlerActions();
  const jobId = useCrawlerStore((state) => state.jobId);
  const { jobStatus, isDone } = useCrawlJobWorker(jobId);
  const progress = useCrawlerStore((state) => state.progress);
  const selected = useCrawlerStore((state) => state.selected);

  const urls = useMemo(() => Object.keys(progress), [progress]);

  const handleBulkCrawlAction = () => {
    handleBulkCrawlSubmit(mutate as unknown as MutateFnType);
  };

  const handleStopBulkCrawlAction = () => {
    const urls = Array.from(selected!.values());
    // stop('', urls);
  };

  const handleCrawlSubmit = (crawlUrl?: string) => {
    submitCrawl(
      crawlMutate as unknown as MutateFnType,
      crawlUrl || (crawlUrl as string),
    );
  };
  return {
    handleBulkCrawlAction,
    handleStopBulkCrawlAction,
    handleCrawlSubmit,
    jobStatus,
    progress,
    urls,
    isDone,
  };
};
