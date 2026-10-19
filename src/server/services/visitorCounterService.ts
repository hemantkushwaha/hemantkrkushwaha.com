/**
 * Server-Side Visitor Counter Service
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Privacy-Conscious Visitor Counting
 * 
 * Guarantees:
 * 1. Server-authoritative: Clients cannot dictate arbitrary counter values.
 * 2. Privacy-first: Zero IP addresses, zero GPS coordinates, zero user-agent logs.
 * 3. Session deduplication: Consecutive requests from the same visitor session
 *    within a sliding window are ignored and do not inflate counts.
 * 4. Graceful resilience: If Supabase connection is pending migration or
 *    temporarily unreachable, the service operates seamlessly using an
 *    in-memory runtime counter without breaking the website.
 */

import { getServerSupabaseClient } from '../lib/supabaseServer.js';

export interface VisitorStatsResult {
  success: boolean;
  totalVisits: number;
  todayVisits: number;
  recorded?: boolean;
  isDatabaseConnected: boolean;
  storageType: 'database' | 'memory';
  message?: string;
}

// In-memory runtime fallback storage
class InMemoryVisitorStore {
  private totalVisits: number = 0;
  private dailyVisits: Map<string, number> = new Map();
  private recentSessions: Map<string, number> = new Map(); // sessionId -> timestamp
  private readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

  private getTodayDateKey(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD in UTC
  }

  private purgeExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, timestamp] of this.recentSessions.entries()) {
      if (now - timestamp > this.SESSION_TTL_MS) {
        this.recentSessions.delete(sessionId);
      }
    }
  }

  public isSessionRecent(sessionId?: string): boolean {
    if (!sessionId) return false;
    this.purgeExpiredSessions();
    const lastSeen = this.recentSessions.get(sessionId);
    return Boolean(lastSeen && Date.now() - lastSeen < this.SESSION_TTL_MS);
  }

  public recordSession(sessionId?: string): boolean {
    if (sessionId && this.isSessionRecent(sessionId)) {
      return false; // Already recorded recently
    }

    if (sessionId) {
      this.recentSessions.set(sessionId, Date.now());
    }

    this.totalVisits += 1;
    const todayKey = this.getTodayDateKey();
    const currentToday = this.dailyVisits.get(todayKey) || 0;
    this.dailyVisits.set(todayKey, currentToday + 1);
    return true;
  }

  public getStats(): { totalVisits: number; todayVisits: number } {
    const todayKey = this.getTodayDateKey();
    return {
      totalVisits: this.totalVisits,
      todayVisits: this.dailyVisits.get(todayKey) || 0,
    };
  }

  public resetForTesting() {
    this.totalVisits = 0;
    this.dailyVisits.clear();
    this.recentSessions.clear();
  }
}

export const inMemoryVisitorStore = new InMemoryVisitorStore();

/**
 * Records a visitor session server-side.
 * Increments visitor count if session has not been counted in the current session window.
 */
export async function recordVisit(sessionId?: string): Promise<VisitorStatsResult> {
  const supabase = getServerSupabaseClient();
  const todayDateStr = new Date().toISOString().slice(0, 10);

  // If Supabase is available, attempt to record to database
  if (supabase) {
    try {
      // Check server-side session deduplication cache before executing DB increment
      if (sessionId && inMemoryVisitorStore.isSessionRecent(sessionId)) {
        return getVisitStats();
      }

      // Call database stored procedure
      const { data, error } = await supabase.rpc('increment_site_visit', {
        target_date: todayDateStr,
      });

      if (!error && data && data.length > 0) {
        if (sessionId) {
          inMemoryVisitorStore.recordSession(sessionId);
        }

        const row = data[0];
        return {
          success: true,
          totalVisits: Number(row.total_visits || 0),
          todayVisits: Number(row.today_visits || 0),
          recorded: true,
          isDatabaseConnected: true,
          storageType: 'database',
        };
      }
    } catch (err) {
      console.warn('[VisitorCounter] Supabase RPC failed, falling back to memory counter:', err);
    }
  }

  // Fallback to in-memory runtime store
  const recorded = inMemoryVisitorStore.recordSession(sessionId);
  const stats = inMemoryVisitorStore.getStats();

  return {
    success: true,
    totalVisits: stats.totalVisits,
    todayVisits: stats.todayVisits,
    recorded,
    isDatabaseConnected: false,
    storageType: 'memory',
    message: supabase
      ? 'Database migration pending approval. Operating with session-authoritative tracking.'
      : 'Supabase credentials not configured. Operating with session-authoritative tracking.',
  };
}

/**
 * Retrieves the current visitor stats without incrementing the count.
 */
export async function getVisitStats(): Promise<VisitorStatsResult> {
  const supabase = getServerSupabaseClient();
  const todayDateStr = new Date().toISOString().slice(0, 10);

  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('get_site_visit_stats', {
        target_date: todayDateStr,
      });

      if (!error && data && data.length > 0) {
        const row = data[0];
        return {
          success: true,
          totalVisits: Number(row.total_visits || 0),
          todayVisits: Number(row.today_visits || 0),
          isDatabaseConnected: true,
          storageType: 'database',
        };
      }
    } catch (err) {
      console.warn('[VisitorCounter] Supabase stats query failed, falling back to memory counter:', err);
    }
  }

  const stats = inMemoryVisitorStore.getStats();
  return {
    success: true,
    totalVisits: stats.totalVisits,
    todayVisits: stats.todayVisits,
    isDatabaseConnected: false,
    storageType: 'memory',
    message: supabase
      ? 'Database migration pending approval. Operating with session-authoritative tracking.'
      : 'Supabase credentials not configured. Operating with session-authoritative tracking.',
  };
}
