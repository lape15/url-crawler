import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { QueryClient } from '@tanstack/react-query';
import type {
  CrawlActionState,
  TableCrawledURL,
  ProgressMap,
  MutateFnType,
  JobStatus,
} from '../types';

import { getCrawledURLs } from '../services/crawl';

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

type CrawledActions = {
  deleteSelectedUrls: (mutateFn: MutateFnType) => void;
  fetchCrawledUrls: () => void;
  handleBulkCrawlSubmit: (mutateFn: MutateFnType) => void;
  submitCrawl: (mutateFn: MutateFnType, crawlUrl: string) => void;
  handleSelectAll: () => void;
  handleSelectedMap: (
    payload: TableCrawledURL,
    e?: React.ChangeEvent<HTMLInputElement>,
  ) => void;

  updateCrawledUrls: (data: TableCrawledURL[]) => void;
};
type CrawlerState = {
  queryClient?: QueryClient;
  setQueryClient: (qc: QueryClient) => void;
  crawlUrl: string;
  setCrawlUrl: (url: string) => void;
  status: CrawlActionState | undefined;
  setStatus: (state: CrawlActionState) => void;
  selected: Map<string, string>;
  setSelected: (map: Map<string, string>) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  handlePerPageChange: (page: number) => void;
  handleCrawlUrlState: (state: CrawlActionState) => void;
  crawledUrls: TableCrawledURL[];
  setCrawledUrls: (urls: TableCrawledURL[]) => void;
  isLoading: boolean;
  jobStatus: JobStatus;
  progress: ProgressMap;
  setProgress: (progress: ProgressMap) => void;
  urls: string[];
  isDone: boolean;
  actions: CrawledActions;
  jobId: string | null;
};

export const useCrawlerStore = create<CrawlerState>()(
  devtools((set, get) => ({
    queryClient: undefined,
    setQueryClient: (qc) => set({ queryClient: qc }),
    crawlUrl: '',
    setCrawlUrl: (url: string) => set({ crawlUrl: url }),
    status: undefined,
    setStatus: (state: CrawlActionState) => set({ status: state }),
    selected: new Map(),
    setSelected: (map: Map<string, string>) => set({ selected: map }),
    crawledUrls: [],
    setCrawledUrls: (urls: TableCrawledURL[]) => set({ crawledUrls: urls }),
    isLoading: false,
    jobStatus: '',
    progress: {},
    setProgress: (progress: ProgressMap) => {
      const { crawledUrls } = get();
      const updated = crawledUrls.map((url) => {
        if (progress[url.URL]) {
          url.Status = progress[url.URL].status;
        }
        return url;
      });

      set({ progress, crawledUrls: updated });
    },
    urls: [],
    isDone: false,
    jobId: null,
    actions: {
      deleteSelectedUrls: (mutateFn: MutateFnType) => {
        const { selected, queryClient } = get();
        const urls = Array.from(selected.values());
        if (urls.length > 0) {
          set({ isLoading: true });
          mutateFn(urls, {
            onSuccess: () => {
              set({ selected: new Map(), isLoading: false });
              queryClient!.invalidateQueries({ queryKey: ['crawledURLs'] });
            },
          });
        }
      },
      fetchCrawledUrls: async () => {
        const { queryClient } = get();
        if (queryClient) {
          set({ isLoading: true });
          const data = await queryClient.fetchQuery({
            queryKey: ['crawledURLs'],
            queryFn: getCrawledURLs,
          });
          set({ crawledUrls: extractValidData(data), isLoading: false });
        }
      },
      handleBulkCrawlSubmit: async (mutateFn: MutateFnType) => {
        const { selected } = get();
        const urls = Array.from(selected.values());
        set({ isLoading: true });
        mutateFn(urls, {
          onSuccess: (data) => {
            set({
              jobId: data.job_id,
              isLoading: false,
            });
          },
        });
      },

      handleSelectedMap: (
        payload: TableCrawledURL,
        e?: React.ChangeEvent<HTMLInputElement>,
      ) => {
        const { selected } = get();
        const { URL: id } = payload;
        const next = new Map(selected);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.set(id, e?.target.value ?? id);
        }
        set({ selected: next });
      },
      handleSelectAll: () => {
        const { crawledUrls, selected } = get();
        const total = crawledUrls.length ?? 0;
        const allSelected = selected.size === total;
        set({
          selected: allSelected
            ? new Map()
            : new Map(crawledUrls.map(({ URL }) => [URL, URL])),
        });
      },

      submitCrawl: async (mutateFn: MutateFnType, crawlUrl: string) => {
        // const { queryClient } = get();
        set({ isLoading: true });
        const splitUrls = crawlUrl.split(',');
        mutateFn(splitUrls, {
          onSuccess: (data) => {
            set({ crawlUrl: '', isLoading: false, jobId: data.job_id });
            // queryClient!.invalidateQueries({ queryKey: ['crawledURLs'] });
          },
        });
      },
      updateCrawledUrls: (data: TableCrawledURL[]) => {
        const extract = extractValidData(data || []);
        const { crawledUrls: existing = [] } = get();

        const result: TableCrawledURL[] = [...existing];
        for (const item of extract) {
          if (!item?.URL) continue;
          const idx = result.findIndex((r) => r.URL === item.URL);
          if (idx >= 0) {
            result[idx] = { ...result[idx], ...item };
          } else {
            result.push(item);
          }
        }

        set({
          crawledUrls: result,
          selected: new Map(),
          jobId: null,
          progress: {},
        });
      },
    },
  })),
);

export const useCrawlerActions = () =>
  useCrawlerStore((state) => state.actions);
