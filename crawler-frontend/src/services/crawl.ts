import type { CrawledURL } from '../types/url';
import { API } from './auth';
export const crawlUrl = (url: string) =>
  API.post('/crawler/urls', {
    url,
  });

export const getCrawledURLs = async (): Promise<CrawledURL[]> => {
  const res = await API.get('/crawler/urls');
  return res.data.crawledUrls;
};
