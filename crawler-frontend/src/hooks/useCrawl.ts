import { useMutation } from '@tanstack/react-query';
import { crawlUrl } from '../services/auth';

export const useCrawl = () => {
  return useMutation({
    mutationFn: (url: string) => crawlUrl(url),
  });
};
