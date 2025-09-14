import { useMutation, useQuery } from '@tanstack/react-query';
import {
  bulkCrawl,
  crawlUrl,
  deleteMultipleUrls,
  deleteUrl,
  getCrawledURLs,
} from '../services/crawl';

export const useCrawl = () => {
  return useMutation({
    mutationFn: (url: string) => crawlUrl(url),
  });
};

export const useCrawledURLs = () => {
  return useQuery({
    queryKey: ['crawledURLs'],
    queryFn: getCrawledURLs,
  });
};

export const useDeleteUrl = () => {
  return useMutation({
    mutationFn: (url: string) => deleteUrl(url),
  });
};

export const useDeleteMultipleUrls = () => {
  return useMutation({
    mutationFn: (urls: string[]) => deleteMultipleUrls(urls),
  });
};

export const useBulkCrawl = () => {
  return useMutation({
    mutationFn: (urls: string[]) => bulkCrawl(urls),
  });
};
