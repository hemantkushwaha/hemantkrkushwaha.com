/**
 * Server-Side Visitor Counter Service
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Privacy-Conscious Visitor Counting
 * 
 * Guarantees & Constraints:
 * 1. Production Authority: Supabase PostgreSQL is the sole authoritative store in production.
 *    In-memory fallback is restricted strictly to local development and deterministic tests.
 * 2. Privacy-first: Zero IP addresses, zero GPS coordinates, zero user-agent logs, zero fingerprinting.
 * 3. Session validation: Validates session token format strictly; requests with missing
 *    or invalid tokens are rejected and never increment the counter.
 * 4. Deduplication & Distributed Abuse Boundaries:
 *    - Client-side: sessionStorage prevents repeat invocations from standard browser navigation.
 *    - Server-side (local container / dev instance): in-memory sliding-window cache suppresses duplicate requests.
 *    - Distributed Serverless Limitation: Independent Vercel Lambdas execute in isolated, ephemeral runtimes.
 *      In-memory caches are not shared across distributed serverless instances.
 *    - Security Realism: Origin, Referer, Sec-Fetch-Site headers, and client-generated session IDs
 *      do NOT provide cryptographically strong protection against deliberate automated abuse, as any custom
 *      script, curl command, or bot can synthesize unique session tokens and forge HTTP headers.
 *    - Safest Practical Next Step for High-Traffic / Bot Defense: An edge rate-limiting layer with
 *      distributed state (such as Upstash Redis with token-bucket algorithm or Cloudflare Turnstile /
 *      WAF bot protection) at the reverse proxy layer, rather than unbounded relational database table writes.
 * 5. Global Daily Semantics: Canonical daily counting rolls over at 00:00:00 UTC.
 */

import { getServerSupabaseClient } from '../lib/supabaseServer.js';

export interface VisitorStatsResult {
  success: boolean;
  totalVisits: number | null;
  todayVisits: number | null;
  recorded?: boolean;
  isDatabaseConnected: boolean;
  storageType: 'database' | 'memory' | 'unavailable';
  message?: string;
  error?: string;
}

// Session token format requirement: "sess_" followed by 8 to 64 alphanumeric or underscore characters
export const SESSION_TOKEN_REGEX = /^sess_[a-zA-Z0-9_-]{8,64}$/;

/**
 * Validates whether the supplied session ID satisfies token format requirements.
 */
export function isValidSessionId(sessionId: unknown): sessionId is string {
  return typeof sessionId === 'string' && SESSION_TOKEN_REGEX.test(sessionId);
}

// In-memory runtime store (strictly for local development / testing)
class InMemoryVisitorStore {
  private totalVisits: number = 0;
  private dailyVisits: Map<string, number> = new Map();
  private recentSessions: Map<string, number> = new Map(); // sessionId -> timestamp
  private readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

  public getTodayDateKey(): string {
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

  public recordSession(sessionId: string): boolean {
    if (this.isSessionRecent(sessionId)) {
      return false; // Already recorded recently
    }

    this.recentSessions.set(sessionId, Date.now());
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
 * In production: Supabase PostgreSQL is strictly authoritative.
 * In development: In-memory store is used if Supabase is unconfigured.
 */
export async function recordVisit(sessionId?: unknown): Promise<VisitorStatsResult> {
  // 1. Strict validation: Reject missing or malformed session tokens immediately
  if (!isValidSessionId(sessionId)) {
    return {
      success: false,
      totalVisits: null,
      todayVisits: null,
      recorded: false,
      isDatabaseConnected: false,
      storageType: 'unavailable',
      error: 'Invalid or missing session token format. Expected pattern: ^sess_[a-zA-Z0-9_-]{8,64}$',
    };
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const supabase = getServerSupabaseClient();
  const todayDateStr = new Date().toISOString().slice(0, 10); // Standard UTC date boundary

  // 2. Database path (authoritative)
  if (supabase) {
    try {
      // Local instance cache check to prevent rapid repeated DB round-trips
      if (inMemoryVisitorStore.isSessionRecent(sessionId)) {
        return getVisitStats();
      }

      // Call database stored procedure with service_role privileges
      const { data, error } = await supabase.rpc('increment_site_visit', {
        target_date: todayDateStr,
      });

      if (!error && data && data.length > 0) {
        inMemoryVisitorStore.recordSession(sessionId);

        const row = data[0];
        return {
          success: true,
          totalVisits: Number(row.total_visits || 0),
          todayVisits: Number(row.today_visits || 0),
          recorded: true,
          isDatabaseConnected: true,
          storageType: 'database',
        };
      } else if (error) {
        console.warn('[VisitorCounter] Supabase RPC error:', error.message);
      }
    } catch (err) {
      console.warn('[VisitorCounter] Supabase RPC exception:', err);
    }
  }

  // 3. Production safety guard:
  // If Supabase is unavailable in production, refuse to fabricate or display volatile in-memory numbers.
  if (isProduction) {
    return {
      success: false,
      totalVisits: null,
      todayVisits: null,
      recorded: false,
      isDatabaseConnected: false,
      storageType: 'unavailable',
      message: 'Visitor counter is temporarily unavailable.',
    };
  }

  // 4. Local development / test fallback ONLY
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
      ? 'Database migration pending approval. Operating in local development fallback.'
      : 'Supabase credentials not configured. Operating in local development fallback.',
  };
}

/**
 * Retrieves the current visitor stats without incrementing the count.
 */
export async function getVisitStats(): Promise<VisitorStatsResult> {
  const isProduction = process.env.NODE_ENV === 'production';
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
      console.warn('[VisitorCounter] Supabase stats query failed:', err);
    }
  }

  // If in production and database is unavailable, report truthfully
  if (isProduction) {
    return {
      success: false,
      totalVisits: null,
      todayVisits: null,
      isDatabaseConnected: false,
      storageType: 'unavailable',
      message: 'Visitor statistics are temporarily unavailable.',
    };
  }

  // Local development fallback
  const stats = inMemoryVisitorStore.getStats();
  return {
    success: true,
    totalVisits: stats.totalVisits,
    todayVisits: stats.todayVisits,
    isDatabaseConnected: false,
    storageType: 'memory',
    message: supabase
      ? 'Database migration pending approval. Operating in local development fallback.'
      : 'Supabase credentials not configured. Operating in local development fallback.',
  };
}
