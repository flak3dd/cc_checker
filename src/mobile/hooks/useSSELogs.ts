import { useEffect, useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

const EventSourcePolyfill = require('event-source-polyfill').EventSourcePolyfill;
const EventSourceClass = Platform.OS === 'web' && typeof window !== 'undefined' && window.EventSource
  ? window.EventSource
  : EventSourcePolyfill;

type EventSource = InstanceType<typeof EventSourceClass>;

import { API_BASE_URL } from '@/services/api';

interface SSELogLine {
  text: any;
  timestamp?: string;
}

interface UseSSELogsProps {
  file: 'wa' | 'wa-checkout' | 'cc';
}

export const useSSELogs = ({ file }: UseSSELogsProps) => {
  const [lines, setLines] = useState<SSELogLine[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<{ id: NodeJS.Timeout; delay: number } | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE_URL}/api/logs/stream?file=${file}`;

    const eventSource = new EventSourceClass(url);

    eventSource.onopen = () => {
      setIsConnected(true);
      setLines([]);
    };

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const line = JSON.parse(event.data);
        if (!line || typeof line !== 'object') return;

        const timestampStr = typeof line.timestamp === 'string' 
          ? line.timestamp 
          : '';

        setLines((prev) => {
          const newLines = [...prev, { text: line, timestamp: timestampStr }];
          return newLines.slice(-200);
        });
      } catch {
        // Silently ignore parse errors
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      const current = timeoutRef.current;
      const delay = current ? Math.min(current.delay * 2, 30000) : 1000;

      timeoutRef.current = {
        id: setTimeout(() => connect(), delay),
        delay,
      };
    };

    eventSourceRef.current = eventSource;
  }, [file]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (timeoutRef.current?.id) clearTimeout(timeoutRef.current.id);
    };
  }, [connect]);

  return {
    lines,
    isConnected,
    reconnect: connect,
  };
};