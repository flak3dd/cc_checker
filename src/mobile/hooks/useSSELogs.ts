import { useEffect, useState, useRef, useCallback } from 'react';
const EventSourcePolyfill = require('event-source-polyfill').EventSourcePolyfill;
  type EventSource = InstanceType<typeof EventSourcePolyfill>;
import { API_BASE_URL } from '@/services/api';
import { colors } from '@/constants/theme';

interface SSELogLine {
  text: string;
  color: string;
  timestamp: Date;
}

interface UseSSELogsProps {
  file: 'wa' | 'wa-checkout' | 'cc';
}

export const useSSELogs = ({ file }: UseSSELogsProps) => {
  const [lines, setLines] = useState<SSELogLine[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<any>(null);

  const getLineColor = useCallback((line: string) => {
    const lower = line.toLowerCase();
    if (lower.includes('[hit') || lower.includes('success') || lower.includes('✓') || lower.includes('pass')) return colors.success;
    if (lower.includes('[fail') || lower.includes('error') || lower.includes('✗') || lower.includes('failed')) return colors.terminalError;
    if (lower.includes('warning') || lower.includes('retry')) return colors.terminalHighlight;
    if (lower.includes('start') || lower.includes('running')) return colors.info;
    return colors.terminalText;
  }, []);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE_URL}/api/logs/stream?file=${file}`;
    const eventSource = new EventSourcePolyfill(url, {
      withCredentials: false,
    });

    eventSource.onopen = () => {
      console.log(`[SSE] Connected to ${file} stream`);
      setIsConnected(true);
      setLines([]); // Clear on reconnect
    };

eventSource.onmessage = (event: MessageEvent) => {
  try {
    const line = JSON.parse(event.data);
    setLines(prev => {
      const newLines = [...prev, { text: line, color: getLineColor(line), timestamp: new Date() }];
      return newLines.slice(-200); // Keep last 200
    });
  } catch {
    // Ignore parse errors
  }
};

eventSource.onerror = (err: Event) => {
  console.error(`[SSE] Error on ${file}:`, err);
  setIsConnected(false);
  eventSource.close();
};

    eventSourceRef.current = eventSource;

    // Reconnect logic
    timeoutRef.current = setTimeout(() => {
      if (!isConnected) connect();
    }, 5000);
  }, [file]);

  useEffect(() => {
    connect();

  return () => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
  }, [connect]);

  return {
    lines,
    isConnected,
    reconnect: connect,
  };
};

