import React, { useState, useRef, useEffect } from 'react';
import { useCrawl } from './useCrawl';
import type { CrawlActionState } from '../types/url';

const token = localStorage.getItem('token');

export const useCrawState = () => {
  const [crawlUrl, setCrawlUrl] = useState('');
  const [status, setStatus] = useState<CrawlActionState>();
  const wsRef = useRef<WebSocket | null>(null);
  const { mutate, isPending } = useCrawl();

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, [wsRef]);
  const handleCrawlUrlState = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCrawlUrl(e.target.value);
  };

  const handleCrawlSubmit = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    const ws = new WebSocket(
      `ws://localhost:8000/crawl?url=${encodeURIComponent(crawlUrl)}&token=${token}`,
    );
    wsRef.current = ws;

    mutate(crawlUrl);

    ws.onopen = () => {
      console.log('WebSocket connection established');
      setStatus({
        state: {
          message: 'Starting analysis',
          status: 'pending',
        },
        url: crawlUrl,
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📩 WebSocket message:', message);

        switch (message.status) {
          case 'progress':
            setStatus({
              ...status,
              state: {
                message: 'Running analysis',
                status: 'progress',
              },
            });
            break;
          case 'error':
            setStatus({
              ...status,
              state: {
                message: 'Analysis failed',
                status: 'error',
              },
            });
            break;
          case 'completed':
            // Final status - connection will close
            setStatus({
              ...status,
              state: {
                message: 'Analysis completed',
                status: 'completed',
              },
            });
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Clean up reference
      if (wsRef.current === ws) {
        wsRef.current = null;
        setStatus(undefined);
      }
    };
  };
  return {
    crawlUrl,
    handleCrawlUrlState,
    handleCrawlSubmit,
    isPending,
    wsRef,
    status,
  };
};
