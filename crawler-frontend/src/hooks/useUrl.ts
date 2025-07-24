import { useQuery } from '@tanstack/react-query';
import { getUrl } from '../services/crawl';

export const useUrl = (url: string) => {
  return useQuery({
    queryKey: ['url', url],
    queryFn: () => getUrl(url),
  });
};
