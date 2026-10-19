
import { useState, useEffect, useCallback, useRef } from 'react';

export interface VisitorCounterState {
  totalVisits: number | null;
  todayVisits: number | null;
  loading: boolean;
  error: string | null;
  storageType: 'database' | 'memory' | 'unavailable' | null;
  notice?: string;
  refetch: () => Promise<void>;
}

const SESSION_STORAGE_KEY = 'hk_visitor_session_recorded_v1';
const SESSION_TOKEN_REGEX = /^sess_[a-zA-Z0-9_-]{8,64}$/;

export function getOrCreateSessionToken(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (existing && SESSION_TOKEN_REGEX.test(existing)) {
      return existing;
    }

    const randomPart = Array.from(
      crypto.getRandomValues(new Uint8Array(16)),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('');

    return `sess_${randomPart}`;
  } catch {
    // If secure random generation is unavailable, do not invent a weak token.
    throw new Error('Secure session token generation is unavailable.');
  }
}

interface VisitorApiResponse {
  success?: boolean;
  totalVisits?: number | null;
  todayVisits?: number | null;
  storageType?: 'database' | 'memory' | 'unavailable';
  message?: string;
  error?: string;
  recorded?: boolean;
}

function isValidStatsResponse(
  data: VisitorApiResponse,
): data is VisitorApiResponse & {
  totalVisits: number;
  todayVisits: number;
} {
  return (
    data.success === true &&
    typeof data.totalVisits === 'number' &&
    Number.isSafeInteger(data.totalVisits) &&
    data.totalVisits >= 0 &&
    typeof data.todayVisits === 'number' &&
    Number.isSafeInteger(data.todayVisits) &&
    data.todayVisits >= 0 &&
    (data.storageType === 'database' || data.storageType === 'memory')
  );
}

export function useVisitorCounter(): VisitorCounterState {
  const [totalVisits, setTotalVisits] = useState<number | null>(null);
  const [todayVisits, setTodayVisits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageType, setStorageType] =
    useState<VisitorCounterState['storageType']>(null);
  const [notice, setNotice] = useState<string | undefined>();

  const hasInitialized = useRef(false);

  const applyResponse = useCallback((data: VisitorApiResponse) => {
    if (isValidStatsResponse(data)) {
      setTotalVisits(data.totalVisits);
      setTodayVisits(data.todayVisits);
      setStorageType(data.storageType);
      setNotice(data.message);
      setError(null);
      return true;
    }

    setTotalVisits(null);
    setTodayVisits(null);
    setStorageType('unavailable');
    setError(data.message || data.error || 'Visitor statistics are unavailable.');
    return false;
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/visits/stats');
      const data = (await res.json()) as VisitorApiResponse;

      if (!res.ok || !applyResponse(data)) {
        if (res.ok) {
          setError(data.message || 'Invalid visitor statistics response.');
        } else {
          setTotalVisits(null);
          setTodayVisits(null);
          setStorageType('unavailable');
          setError(data.message || `Visitor stats returned ${res.status}`);
        }
      }
    } catch {
      setTotalVisits(null);
      setTodayVisits(null);
      setStorageType('unavailable');
      setError('Visitor statistics are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, [applyResponse]);

  const recordVisitSession = useCallback(async () => {
    try {
      let existingSession: string | null = null;

      try {
        existingSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
      } catch {
        // Continue with a request; the server remains authoritative.
      }

      if (existingSession && SESSION_TOKEN_REGEX.test(existingSession)) {
        await fetchStats();
        return;
      }

      const sessionId = getOrCreateSessionToken();
      const res = await fetch('/api/visits/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = (await res.json()) as VisitorApiResponse;

      if (!res.ok) {
        throw new Error(data.message || data.error || `Visit recording returned ${res.status}`);
      }

      if (!applyResponse(data)) {
        return;
      }

      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      } catch {
        // Counting may work even if browser storage is disabled.
      }
    } catch {
      // Do not turn a failed recording into a fabricated count.
      await fetchStats();
    } finally {
      setLoading(false);
    }
  }, [applyResponse, fetchStats]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    void recordVisitSession();
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
