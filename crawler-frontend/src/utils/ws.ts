const HOST = 'ws://localhost:8000/';

export function buildWsUrl(crawlUrl?: string, isBulk?: boolean) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Missing auth token');
  const u = new URL('/crawl', HOST);
  if (!isBulk && crawlUrl) u.searchParams.set('url', crawlUrl);
  u.searchParams.set('token', token);
  return u.toString();
}
