import { useMutation, useQuery } from '@tanstack/react-query';
import { crawlUrl, getCrawledURLs } from '../services/crawl';

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
