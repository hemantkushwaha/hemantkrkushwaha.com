/**
 * Test Suite: Real Website Visitor Counter (Feature 2 & Security Audit Fixes)
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 28 Audit Verification
 */

import fs from 'fs';
import path from 'path';
import {
  recordVisit,
  getVisitStats,
  inMemoryVisitorStore,
  isValidSessionId,
  SESSION_TOKEN_REGEX,
} from '../src/server/services/visitorCounterService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runVisitorCounterTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING FEATURE 2: REAL VISITOR COUNTER TESTS & AUDIT FIXES');
  console.log('================================================================');

  // Ensure development environment mode and isolate unit tests from polluting live database
  process.env.NODE_ENV = 'development';
  const origKey = process.env.SUPABASE_SECRET_KEY;
  const origServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  inMemoryVisitorStore.resetForTesting();

  // --- 1. Empty Counter & Initial State ---
  console.log('\n--- 1. Empty State & Initial Read ---');
  const initialStats = await getVisitStats();
  assert(initialStats.success === true, '1.1 getVisitStats returns success');
  assert(initialStats.totalVisits === 0, '1.2 Initial total visits starts at genuine 0');
  assert(initialStats.todayVisits === 0, '1.3 Initial today visits starts at genuine 0');

  // --- 2. Session Token Validation & Format Protection ---
  console.log('\n--- 2. Session Token Format & Validation Guardrails ---');
  assert(isValidSessionId('sess_alpha_12345678') === true, '2.1 Valid session token passes regex');
  assert(isValidSessionId('sess_98765432_zxywvuts') === true, '2.2 Standard generated session token passes regex');
  assert(isValidSessionId(undefined) === false, '2.3 Undefined session token is rejected');
  assert(isValidSessionId(null) === false, '2.4 Null session token is rejected');
  assert(isValidSessionId('') === false, '2.5 Empty string session token is rejected');
  assert(isValidSessionId('invalid_prefix_12345') === false, '2.6 Non-prefixed token is rejected');
  assert(isValidSessionId('sess_<script>alert(1)</script>') === false, '2.7 Malicious characters rejected by regex');
  assert(isValidSessionId('sess_short') === false, '2.8 Too short session token is rejected');

  // Test that invalid tokens are rejected by recordVisit without incrementing counter
  const rejected1 = await recordVisit(undefined);
  assert(rejected1.success === false, '2.9 recordVisit rejects undefined token');
  assert(rejected1.error?.includes('Invalid or missing session token format'), '2.10 Error message reports invalid format');

  const rejected2 = await recordVisit('malformed_token');
  assert(rejected2.success === false, '2.11 recordVisit rejects malformed token');

  const statsAfterRejected = await getVisitStats();
  assert(statsAfterRejected.totalVisits === 0, '2.12 Failed validation attempts do NOT increment total visits');

  // --- 3. Secure Server-Side Counting & Session Deduplication ---
  console.log('\n--- 3. Server-Side Visit Recording & Session Deduplication ---');
  const sessionA = 'sess_valid_alpha_12345';
  const recordResult1 = await recordVisit(sessionA);
  assert(recordResult1.success === true, '3.1 First visit recording succeeds');
  assert(recordResult1.recorded === true, '3.2 First visit flagged as recorded');
  assert(recordResult1.totalVisits === 1, '3.3 Total visits increments to 1');
  assert(recordResult1.todayVisits === 1, '3.4 Today visits increments to 1');

  // Consecutive recording with the SAME session ID (e.g. page navigation or re-render)
  const recordResult2 = await recordVisit(sessionA);
  assert(recordResult2.success === true, '3.5 Second request with same session succeeds');
  assert(recordResult2.totalVisits === 1, '3.6 Duplicate session request does NOT inflate total visits (remains 1)');
  assert(recordResult2.todayVisits === 1, '3.7 Duplicate session request does NOT inflate today visits (remains 1)');

  // Third recording with a DIFFERENT valid session ID
  const sessionB = 'sess_valid_beta_67890';
  const recordResult3 = await recordVisit(sessionB);
  assert(recordResult3.success === true, '3.8 Distinct session recording succeeds');
  assert(recordResult3.totalVisits === 2, '3.9 Total visits increments to 2 for distinct visitor');
  assert(recordResult3.todayVisits === 2, '3.10 Today visits increments to 2 for distinct visitor');

  // --- 4. Production Persistence Guard & Graceful Unavailable State ---
  console.log('\n--- 4. Production Authority & Fallback Isolation ---');
  // When in production mode and Supabase credentials are not connected
  process.env.NODE_ENV = 'production';
  const prodRecord = await recordVisit('sess_prod_tester_99999');
  assert(prodRecord.success === false, '4.1 In production with unconfigured DB, recordVisit reports false');
  assert(prodRecord.storageType === 'unavailable', '4.2 Storage type reports unavailable (not memory)');
  assert(prodRecord.totalVisits === null, '4.3 Total visits is null (never fabricated)');

  const prodStats = await getVisitStats();
  assert(prodStats.success === false, '4.4 In production with unconfigured DB, getVisitStats reports false');
  assert(prodStats.storageType === 'unavailable', '4.5 Stats storage type reports unavailable');

  // Reset back to development for remaining tests
  process.env.NODE_ENV = 'development';

  // --- 5. UTC Daily Rollover Semantics ---
  console.log('\n--- 5. UTC Daily Rollover Semantics ---');
  const expectedUtcDate = new Date().toISOString().slice(0, 10);
  const memoryDateKey = inMemoryVisitorStore.getTodayDateKey();
  assert(memoryDateKey === expectedUtcDate, `5.1 Daily key matches canonical UTC date (${expectedUtcDate})`);

  // --- 6. Supabase SQL Security Audit Verification ---
  console.log('\n--- 6. Supabase Migration Security & Hardening Audit ---');
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20261019000000_site_visits.sql');
  assert(fs.existsSync(migrationPath), '6.1 Supabase migration file exists');

  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
  assert(migrationSql.includes('SET search_path = public, pg_temp'), '6.2 SECURITY DEFINER functions enforce safe, immutable search_path');
  assert(migrationSql.includes('REVOKE ALL ON FUNCTION increment_site_visit(DATE) FROM PUBLIC, anon, authenticated;'), '6.3 increment_site_visit execution explicitly revoked from PUBLIC, anon, authenticated');
  assert(migrationSql.includes('REVOKE ALL ON FUNCTION get_site_visit_stats(DATE) FROM PUBLIC, anon, authenticated;'), '6.4 get_site_visit_stats execution explicitly revoked from PUBLIC, anon, authenticated');
  assert(migrationSql.includes('GRANT EXECUTE ON FUNCTION increment_site_visit(DATE) TO service_role;'), '6.5 increment_site_visit execution granted exclusively to service_role');
  assert(migrationSql.includes('GRANT EXECUTE ON FUNCTION get_site_visit_stats(DATE) TO service_role;'), '6.6 get_site_visit_stats execution granted exclusively to service_role');
  assert(migrationSql.includes('COALESCE(target_date, CURRENT_DATE)'), '6.7 NULL or invalid target_date sanitized with COALESCE guard');
  assert(migrationSql.includes('CREATE OR REPLACE FUNCTION update_site_daily_visits_updated_at()'), '6.8 Dedicated trigger function update_site_daily_visits_updated_at defined');
  assert(migrationSql.includes('EXECUTE FUNCTION update_site_daily_visits_updated_at()'), '6.9 Trigger references dedicated update_site_daily_visits_updated_at function');
  assert(!migrationSql.includes('FUNCTION update_updated_at_column()'), '6.10 Shared function update_updated_at_column is NOT redefined or modified');
  assert(migrationSql.includes('REVOKE ALL ON FUNCTION update_site_daily_visits_updated_at() FROM PUBLIC, anon, authenticated;'), '6.11 Dedicated trigger function privileges revoked from PUBLIC, anon, authenticated');
  assert(!migrationSql.includes('ip_address'), '6.12 Zero IP address columns');
  assert(!migrationSql.includes('user_agent'), '6.13 Zero user-agent columns');

  // --- 7. Express and Vercel Handler Parity ---
  console.log('\n--- 7. Express & Vercel Handler Parity ---');
  const expressRouteCode = fs.readFileSync('src/server/routes/visitorRoutes.ts', 'utf-8');
  const vercelRecordCode = fs.readFileSync('api/visits/record.ts', 'utf-8');
  const vercelStatsCode = fs.readFileSync('api/visits/stats.ts', 'utf-8');

  assert(expressRouteCode.includes('isValidSessionId'), '7.1 Express route validates session token with isValidSessionId');
  assert(vercelRecordCode.includes('isValidSessionId'), '7.2 Vercel record handler validates session token with isValidSessionId');
  assert(expressRouteCode.includes('sec-fetch-site'), '7.3 Express route includes defense-in-depth sec-fetch-site check');
  assert(vercelRecordCode.includes('sec-fetch-site'), '7.4 Vercel record handler includes defense-in-depth sec-fetch-site check');
  assert(vercelRecordCode.includes('status(400)'), '7.5 Vercel record handler returns 400 on malformed token');
  assert(expressRouteCode.includes('status(400)'), '7.6 Express route returns 400 on malformed token');
  assert(vercelStatsCode.includes('status(503)'), '7.7 Vercel stats handler returns 503 on unavailable state');
  assert(expressRouteCode.includes('status(503)'), '7.8 Express stats route returns 503 on unavailable state');

  // --- 8. UI Integration & UTC Labels ---
  console.log('\n--- 8. UI Integration & UTC Labels ---');
  const counterComponentCode = fs.readFileSync('src/components/common/VisitorCounter.tsx', 'utf-8');
  assert(counterComponentCode.includes("Today's Visits (UTC)") || counterComponentCode.includes("Today&apos;s Visits (UTC)"), '8.1 UI labels daily visits with UTC milestone');
  assert(counterComponentCode.includes('00:00 UTC'), '8.2 Footnote clarifies 00:00 UTC daily reset boundary');

  if (origKey) process.env.SUPABASE_SECRET_KEY = origKey;
  if (origServiceKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origServiceKey;

  console.log('================================================================');
  console.log('🎉 ALL FEATURE 2 AUDIT & SECURITY FIX TESTS PASSED');
  console.log('================================================================');
}

runVisitorCounterTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
