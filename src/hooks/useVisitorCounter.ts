/**
 * Real Website Visitor Counter Hook
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Visitor Counter Hook (Feature 2)
 * 
 * Safety & Resilience Guarantees:
 * 1. Counts once per browser session via sessionStorage check.
 * 2. Repeated clock ticks and component re-renders NEVER inflate counts.
 * 3. Never sends personal data, GPS, or tracking metrics.
 * 4. Gracefully handles network or backend failures without crashing.
 * 5. Accurately reports zero/initial counts without fabricating numbers.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface VisitorCounterState {
  totalVisits: number | null;
  todayVisits: number | null;
  loading: boolean;
  error: string | null;
  storageType: 'database' | 'memory' | null;
  notice?: string;
  refetch: () => Promise<void>;
}

const SESSION_STORAGE_KEY = 'hk_visitor_session_recorded_v1';

function getOrCreateSessionToken(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const newToken = 'sess_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
    return newToken;
  } catch {
    return 'fallback_session';
  }
}

export function useVisitorCounter(): VisitorCounterState {
  const [totalVisits, setTotalVisits] = useState<number | null>(null);
  const [todayVisits, setTodayVisits] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [storageType, setStorageType] = useState<'database' | 'memory' | null>(null);
  const [notice, setNotice] = useState<string | undefined>(undefined);

  // Guard to guarantee execution only once on mount, regardless of parent re-renders or StrictMode
  const hasInitialized = useRef<boolean>(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/visits/stats');
      if (!res.ok) {
        throw new Error(`Failed to fetch visitor stats (${res.status})`);
      }
      const data = await res.json();
      if (data && typeof data.totalVisits === 'number') {
        setTotalVisits(data.totalVisits);
        setTodayVisits(data.todayVisits);
        setStorageType(data.storageType || 'memory');
        setNotice(data.message);
        setError(null);
      }
    } catch (err: any) {
      console.warn('[VisitorCounter] Error fetching visitor stats:', err);
      setError(err?.message || 'Visitor stats unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  const recordVisitSession = useCallback(async () => {
    try {
      let isRecordedInSession = false;
      try {
        isRecordedInSession = Boolean(sessionStorage.getItem(SESSION_STORAGE_KEY));
      } catch {
        // sessionStorage unavailable (e.g. strict private mode)
      }

      // If already recorded in this browser session, simply fetch the latest numbers
      if (isRecordedInSession) {
        await fetchStats();
        return;
      }

      // Session not yet recorded: invoke server-side increment
      const sessionId = getOrCreateSessionToken();
      const res = await fetch('/api/visits/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        throw new Error(`Visit recording returned ${res.status}`);
      }

      const data = await res.json();
      if (data && typeof data.totalVisits === 'number') {
        setTotalVisits(data.totalVisits);
        setTodayVisits(data.todayVisits);
        setStorageType(data.storageType || 'memory');
        setNotice(data.message);
        setError(null);

        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      console.warn('[VisitorCounter] Error recording session:', err);
      // Graceful fallback: attempt read-only stats
      await fetchStats();
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    recordVisitSession();
  }, [recordVisitSession]);

  return {
    totalVisits,
    todayVisits,
    loading,
    error,
    storageType,
    notice,
    refetch: fetchStats,
  };
}
