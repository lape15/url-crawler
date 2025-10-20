import { useState, useMemo, useRef, useEffect } from 'react';
import type { JobStatus, URLProgress, ProgressMap } from '../types/url';
import { useCrawlerActions, useCrawlerStore } from '../store';

const worker =
  typeof window !== 'undefined'
    ? new Worker(new URL('../worker/worker.ts', import.meta.url), {
        type: 'module',
      })
    : null;
const token = localStorage.getItem('token');
export function useCrawlJobWorker(jobId: string | null, intervalMs = 1200) {
  const [jobStatus, setJobStatus] = useState<JobStatus>('');

  const setProgress = useCrawlerStore((state) => state.setProgress);
  const { updateCrawledUrls } = useCrawlerActions();

  const activeJob = useRef<string | null>(null);

  useEffect(() => {
    if (!jobId || !worker) return;
    const onMessage = (event: MessageEvent) => {
      const { type, jobId: jid, data } = event.data || {};
      if (type === 'RESULT') {
        updateCrawledUrls(data);
      }
      if (type !== 'SNAPSHOT' || jid !== jobId || !data) return;
      setJobStatus(data.status as JobStatus);

      const snapshot: ProgressMap = {};
      const prog = (data.progress ?? {}) as Record<
        string,
        Partial<URLProgress>
      >;
      for (const url of Object.keys(prog)) {
        snapshot[url] = { ...(prog[url] as URLProgress) };
      }
      // setProgress((prev) => ({ ...prev, ...snapshot }));
      setProgress(snapshot);
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({ type: 'START', jobId, intervalMs, token });
    activeJob.current = jobId;
    return () => {
      worker.removeEventListener('message', onMessage);
      if (activeJob.current === jobId) {
        worker.postMessage({ type: 'STOP', jobId });
        activeJob.current = null;
      }
    };
  }, [jobId, intervalMs, setProgress, updateCrawledUrls]);
  const isDone = jobStatus === 'complete' || jobStatus === 'failed';
  return {
    jobStatus,
    isDone,
  };
}
