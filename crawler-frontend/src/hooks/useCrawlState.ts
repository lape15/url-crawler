import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useNavigate } from 'react-router-dom';
import { useCrawl, useDeleteUrl, useDeleteMultipleUrls } from './useCrawl';
import type { CrawlActionState, TableCrawledURL } from '../types/url';
import { useCrawlWebSocket } from './useCrawlWebSocket';
import { usePaginationState } from './usePagination';

const validArr: (keyof TableCrawledURL)[] = [
  'ID',
  'URL',
  'HTMLVersion',
  'HasLoginForm',
  'Status',
];

const extractValidData = (data: TableCrawledURL[]) => {
  if (!data) return [];

  return data.map((item) =>
    validArr.reduce((acc, key) => {
      acc[key] = key === 'Status' ? 'Done' : item[key];
      return acc;
    }, {} as TableCrawledURL),
  );
};
export const useCrawState = (data?: TableCrawledURL[] | undefined) => {
  const [crawlUrl, setCrawlUrl] = useState('');
  const [status, setStatus] = useState<CrawlActionState>();
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const {
    visibleItems,
    currentPage,
    totalPages,
    onPageChange,
    handlePerPageChange,
  } = usePaginationState(extractValidData(data || []));

  const { mutate, isPending } = useCrawl();
  const { mutate: deleteMutate, isPending: isPendingDelete } = useDeleteUrl();
  const { mutate: deleteMutateMultiple, isPending: isPendingDeleteMultiple } =
    useDeleteMultipleUrls();
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const crawlUrlMutation = (url: string) => {
    mutate(url || crawlUrl, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['crawledURLs'] });
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

  const handleSelectedMap = useCallback(
    (payload: TableCrawledURL, e?: React.ChangeEvent<HTMLInputElement>) => {
      const { URL: id } = payload;

      setSelected((prev) => {
        const next = new Map(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.set(id, e?.target.value ?? id);
        }
        return next;
      });
    },
    [],
  );

  const handleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const total = data?.length ?? 0;
      if (!data || total === 0) return new Map();

      const allSelected = prev.size === total;

      return allSelected
        ? new Map()
        : new Map(data.map(({ URL }) => [URL, URL]));
    });
  }, [data]);

  const deleteSelectedUrls = useCallback(() => {
    const urls = Array.from(selected.values());
    if (urls.length > 0) {
      deleteMutateMultiple(urls, {
        onSuccess: () => {
          setSelected(new Map());
          queryClient.invalidateQueries({ queryKey: ['crawledURLs'] });
        },
      });
    }
  }, [selected, deleteMutateMultiple, queryClient]);

  return {
    crawlUrl,
    handleCrawlUrlState,
    handleCrawlSubmit,
    isPending,
    cancelCrawl,
    status,
    isConnected,
    navigateToUrlPage,
    handleSelectedMap,
    handleSelectAll,
    deleteSelectedUrls,
    selected,
    isPendingDelete,
    isPendingDeleteMultiple,
    visibleItems,
    currentPage,
    totalPages,
    onPageChange,
    handlePerPageChange,
    deleteMutate,
  };
};
