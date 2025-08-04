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
export const getUrl = async (url: string): Promise<CrawledURL> => {
  const encoded = encodeURIComponent(url);
  const res = await API.get(`/crawler/url?url=${encoded}`);
  return res.data.url;
};

export const deleteUrl = async (url: string): Promise<CrawledURL> => {
  const encoded = encodeURIComponent(url);
  const res = await API.delete(`/crawler/url?url=${encoded}`);
  return res.data.message;
};

export const deleteMultipleUrls = async (
  urls: string[],
): Promise<CrawledURL> => {
  const res = await API.post('/crawler/urls/delete', { urls });
  return res.data.message;
};
