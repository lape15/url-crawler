import React, { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useNavigate } from 'react-router-dom';
import { useDeleteUrl } from './useCrawl';
import type { TableCrawledURL } from '../types/url';
import { useUrlBulkCrawler } from './index';
import { useCrawlerActions, useCrawlerStore } from '../store';

//Todo ___________________________________Refactor________To______Zustand
export const useCrawState = () => {
  const [crawlUrl, setCrawlUrl] = useState<string>('');
  const status = useCrawlerStore((state) => state.status);
  const selected = useCrawlerStore((state) => state.selected);

  const { fetchCrawledUrls } = useCrawlerActions();
  const setQueryClient = useCrawlerStore((state) => state.setQueryClient);
  const queryClientRef = useCrawlerStore((state) => state.queryClient);

  const { mutate: deleteMutate, isPending: isPendingDelete } = useDeleteUrl();
  const { handleCrawlSubmit: handleCrawlSearchSubmit } = useUrlBulkCrawler();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  useEffect(() => {
    setQueryClient(queryClient);
    if (queryClientRef) {
      fetchCrawledUrls();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, queryClientRef]);

  const handleCrawlUrlState = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCrawlUrl(e.target.value);
  };

  const handleCrawlSubmit = (url?: string) => {
    handleCrawlSearchSubmit(crawlUrl || (url as string));
    setCrawlUrl('');
  };

  const navigateToUrlPage = useCallback(
    (params: TableCrawledURL) => {
      const { ID: id, URL: url } = params;
      navigate(`/url/${id}`, {
        state: {
          url,
        },
      });
    },
    [navigate],
  );
  // console.log({ jobStatus, progress, urls, isDone });

  return {
    crawlUrl,
    handleCrawlUrlState,
    handleCrawlSubmit,

    status,

    navigateToUrlPage,

    selected,
    isPendingDelete,

    deleteMutate,
  };
};
