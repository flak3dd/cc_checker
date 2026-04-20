import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { apiClient } from '@/services/api';

/**
 * Polls the backend /api/health endpoint to track connectivity.
 * Returns { isConnected, isChecking, retry }.
 * Automatically pauses when app is backgrounded.
 */
export function useApiHealth(intervalMs = 8000) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null); // null = unknown
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const check = useCallback(async () => {
    setIsChecking(true);
    try {
      await apiClient.get('/api/health', { timeout: 4000 });
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Initial check
    check();

    // Poll while app is active
    timerRef.current = setInterval(() => {
      if (appState.current === 'active') check();
    }, intervalMs);

    // Pause/resume on app state changes
    const sub = AppState.addEventListener('change', (next) => {
      appState.current = next;
      if (next === 'active') check(); // immediate check on foreground
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      sub.remove();
    };
  }, [check, intervalMs]);

  return { isConnected, isChecking, retry: check };
}
