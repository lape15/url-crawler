export interface CrawledURL {
  ID: number;
  URL: string;
  HTMLVersion: string;
  Title: string;
  HeadingsCount: { [key: string]: number } | null;
  InternalLinks: number;
  ExternalLinks: number;
  BrokenLinks: number;
  HasLoginForm: boolean;
  UserID: string;
  Status?: string;
}

export type TableCrawledURL = Pick<
  CrawledURL,
  'ID' | 'URL' | 'HTMLVersion' | 'HasLoginForm' | 'Status'
>;
export interface CrawledURLsResponse {
  crawledUrls: CrawledURL[];
}

export type CrawlActionState = {
  state: { message: string; status: string };
  url?: string;
};

export type CrawlStatus = CrawlActionState | undefined;

export type maybe = string | number | boolean | undefined;
