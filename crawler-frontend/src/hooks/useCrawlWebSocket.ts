import { useRef, useCallback, useEffect, useState } from 'react';
import type { CrawlActionState } from '../types/url';

const token = localStorage.getItem('token');
const uri = 'ws://localhost:8000/crawl?url=';
// type CrawlStatus = CrawlActionState | undefined;

interface UseCrawlWebSocketOptions {
  onStatusUpdate: (state: CrawlActionState | undefined) => void;
  onMutate?: (url: string) => void;
  isCrawling?: boolean;
}

const returnUrl = (url: string, isBulkCrawling?: boolean) =>
  isBulkCrawling
    ? `${uri}token=${token}`
    : `${uri}${encodeURIComponent(url)}&token=${token}`;

export function useCrawlWebSocket({
  onStatusUpdate,
  onMutate,
}: UseCrawlWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const closeConnection = useCallback(() => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Crawl completed normally');
      }
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      closeConnection();
    };
  }, [closeConnection]);

  const start = useCallback(
    (crawlUrl: string, isBulkCrawling?: boolean) => {
      if (!isBulkCrawling && !crawlUrl) {
        return;
      }
      if (!token) return;

      closeConnection();

      const ws = new WebSocket(returnUrl(crawlUrl, isBulkCrawling));
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        onStatusUpdate({
          state: { status: 'pending', message: 'Starting analysis' },
          url: crawlUrl,
        });

        onMutate?.(crawlUrl);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          switch (message.status) {
            case 'progress':
              onStatusUpdate({
                state: {
                  status: 'progress',
                  message: message.message || 'Running analysis',
                },
                url: crawlUrl,
              });
              break;
            case 'error':
              onStatusUpdate({
                state: {
                  status: 'error',
                  message: message.message || 'Analysis failed',
                },
                url: crawlUrl,
              });
              //   closeConnection();
              break;
            case 'completed':
              onStatusUpdate(undefined);
              closeConnection();
              break;
          }
        } catch (err) {
          console.error('Invalid WS message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        closeConnection();
      };

      ws.onclose = (event) => {
        if (wsRef.current === ws) {
          wsRef.current = null;
          setIsConnected(false);

          if (event.code !== 1000) {
            onStatusUpdate(undefined);
          }
        }
      };
    },
    [onStatusUpdate, onMutate, closeConnection],
  );

  const stop = useCallback(async (url?: string, bulkUrls?: string[]) => {
    const ws = wsRef.current;

    if (!ws) {
      console.error('WebSocket not initialized');
      return;
    }

    // 🔄 Wait until WebSocket is open
    if (ws.readyState === WebSocket.CONNECTING) {
      await new Promise<void>((resolve) => {
        const waitForOpen = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            clearInterval(waitForOpen);
            resolve();
          } else if (
            ws.readyState === WebSocket.CLOSED ||
            ws.readyState === WebSocket.CLOSING
          ) {
            clearInterval(waitForOpen);
            console.error('WebSocket closed before connection was established');
            resolve();
          }
        }, 50);
      });
    }

    return new Promise<void>((resolve) => {
      const pending = new Set<string>();

      const handleMessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data);

        if (message.status === 'cancelled' && message.url) {
          pending.delete(decodeURIComponent(message.url));
          if (pending.size === 0) {
            ws.removeEventListener('message', handleMessage);
            resolve();
          }
        }
      };

      ws.addEventListener('message', handleMessage);

      const sendCancelMessage = (targetUrl: string) => {
        try {
          pending.add(targetUrl);
          ws.send(
            JSON.stringify({
              action: 'cancel',
              url: encodeURIComponent(targetUrl),
            }),
          );
        } catch (error) {
          console.error('Error sending cancel message:', error);
          pending.delete(targetUrl);
        }
      };

      if (url) {
        sendCancelMessage(url);
      }

      if (bulkUrls) {
        bulkUrls.forEach((u) => sendCancelMessage(u));
      }

      // fallback timeout for all
      setTimeout(() => {
        if (pending.size > 0) {
          ws.removeEventListener('message', handleMessage);
          resolve();
        }
      }, 3000);
    });
  }, []);

  return { start, stop, isConnected, closeConnection };
}
