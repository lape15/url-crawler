import type { MutateOptions, UseMutateFunction } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';

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

type URLStatus = 'queued' | 'running' | 'success' | 'failed';
export type JobStatus = 'pending' | 'running' | 'complete' | 'failed' | '';

export type URLProgress = {
  url: string;
  status: URLStatus;
  message?: string;
  started_at?: string;
  finished_at?: string;
};
export type ProgressMap = Record<string, URLProgress>;

type MutationType = UseMutateFunction<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AxiosResponse<any, any>, // TData
  Error, // TError
  string[] | string, // TVariables (array of urls)
  unknown // TContext
>;

export type MutateFnType = MutationType;
