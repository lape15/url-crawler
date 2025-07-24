import React, { useState } from 'react';
import { useCrawl } from './useCrawl';
import type { CrawlActionState } from '../types/url';
import { useCrawlWebSocket } from './useCrawlWebSocket';

export const useCrawState = () => {
  const [crawlUrl, setCrawlUrl] = useState('');
  const [status, setStatus] = useState<CrawlActionState>();

  const { mutate, isPending } = useCrawl();

  const crawlUrlMutation = (url: string) => {
    mutate(url || crawlUrl, {
      onSuccess: () => {
        setCrawlUrl('');
      },
    });
  };
  const { start, stop, isConnected } = useCrawlWebSocket({
    onStatusUpdate: (state: CrawlActionState | undefined) => {
      setStatus(state);
    },
    isCrawling: isPending,
    onMutate: crawlUrlMutation,
  });

  const handleCrawlUrlState = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCrawlUrl(e.target.value);
  };

  const cancelCrawl = (url: string) => {
    stop(url);
  };

  const handleCrawlSubmit = (url?: string) => {
    const stringArg = typeof url === 'string' ? url : crawlUrl;
    start(stringArg);
  };
  return {
    crawlUrl,
    handleCrawlUrlState,
    handleCrawlSubmit,
    isPending,
    cancelCrawl,
    status,
    isConnected,
  };
};
