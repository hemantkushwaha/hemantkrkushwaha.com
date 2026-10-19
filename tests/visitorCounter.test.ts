/**
 * Test Suite: Real Website Visitor Counter (Feature 2)
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 28 Verification
 */

import fs from 'fs';
import path from 'path';
import {
  recordVisit,
  getVisitStats,
  inMemoryVisitorStore,
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
  console.log('🧪 RUNNING FEATURE 2: REAL VISITOR COUNTER TESTS');
  console.log('================================================================');

  // Reset in-memory store for clean deterministic test run
  inMemoryVisitorStore.resetForTesting();

  // --- 1. Empty Counter & Initial State ---
  console.log('\n--- 1. Empty State & Initial Read ---');
  const initialStats = await getVisitStats();
  assert(initialStats.success === true, '1.1 getVisitStats returns success');
  assert(initialStats.totalVisits === 0, '1.2 Initial total visits starts at genuine 0');
  assert(initialStats.todayVisits === 0, '1.3 Initial today visits starts at genuine 0');

  // --- 2. Secure Server-Side Counting & Deduplication ---
  console.log('\n--- 2. Server-Side Visit Recording & Session Deduplication ---');
  const sessionA = 'test_session_alpha_123';
  const recordResult1 = await recordVisit(sessionA);
  assert(recordResult1.success === true, '2.1 First visit recording succeeds');
  assert(recordResult1.recorded === true, '2.2 First visit flagged as recorded');
  assert(recordResult1.totalVisits === 1, '2.3 Total visits increments to 1');
  assert(recordResult1.todayVisits === 1, '2.4 Today visits increments to 1');

  // Consecutive recording with the SAME session ID (e.g. page navigation or re-render)
  const recordResult2 = await recordVisit(sessionA);
  assert(recordResult2.success === true, '2.5 Second request with same session succeeds');
  assert(recordResult2.totalVisits === 1, '2.6 Duplicate session request does NOT inflate total visits (remains 1)');
  assert(recordResult2.todayVisits === 1, '2.7 Duplicate session request does NOT inflate today visits (remains 1)');

  // Third recording with a DIFFERENT session ID
  const sessionB = 'test_session_beta_456';
  const recordResult3 = await recordVisit(sessionB);
  assert(recordResult3.success === true, '2.8 Distinct session recording succeeds');
  assert(recordResult3.totalVisits === 2, '2.9 Total visits increments to 2 for distinct visitor');
  assert(recordResult3.todayVisits === 2, '2.10 Today visits increments to 2 for distinct visitor');

  // --- 3. Independence from Clock Ticks ---
  console.log('\n--- 3. Clock Tick & Render Independence ---');
  // Simulate 10 read requests (as might occur during app renders or polling)
  for (let i = 0; i < 10; i++) {
    const stats = await getVisitStats();
    assert(stats.totalVisits === 2, `3.1 Stats retrieval does not increment count (iteration ${i + 1})`);
  }

  // Verify that hook source code does not bind counter updates to clock ticks
  const counterHookCode = fs.readFileSync('src/hooks/useVisitorCounter.ts', 'utf-8');
  assert(!counterHookCode.includes('setInterval'), '3.2 useVisitorCounter does not invoke setInterval');
  assert(!counterHookCode.includes('useVisitorClock'), '3.3 useVisitorCounter is decoupled from useVisitorClock');

  // --- 4. Database Migration & Security Verification ---
  console.log('\n--- 4. Supabase Migration & Security Audit ---');
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20261019000000_site_visits.sql');
  assert(fs.existsSync(migrationPath), '4.1 Supabase migration file exists');

  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS site_daily_visits'), '4.2 Table site_daily_visits created');
  assert(migrationSql.includes('ALTER TABLE site_daily_visits ENABLE ROW LEVEL SECURITY;'), '4.3 Row Level Security (RLS) enabled');
  assert(migrationSql.includes('REVOKE ALL ON TABLE site_daily_visits FROM anon, authenticated;'), '4.4 Client anon and authenticated privileges revoked');
  assert(migrationSql.includes('GRANT ALL ON TABLE site_daily_visits TO service_role;'), '4.5 Full privileges granted exclusively to service_role');
  assert(migrationSql.includes('increment_site_visit'), '4.6 Atomic increment stored procedure defined');
  assert(migrationSql.includes('get_site_visit_stats'), '4.7 Read-only statistics function defined');

  // Privacy guarantees in SQL
  assert(!migrationSql.includes('ip_address'), '4.8 Zero IP address columns in database schema');
  assert(!migrationSql.includes('user_agent'), '4.9 Zero user-agent columns in database schema');
  assert(!migrationSql.includes('location'), '4.10 Zero location columns in database schema');

  // --- 5. Component & UI Integration Verification ---
  console.log('\n--- 5. Layout & UI Integration ---');
  const footerCode = fs.readFileSync('src/components/layout/Footer.tsx', 'utf-8');
  assert(footerCode.includes('VisitorPresenceSection'), '5.1 Footer renders VisitorPresenceSection');

  const headerCode = fs.readFileSync('src/components/layout/Header.tsx', 'utf-8');
  assert(headerCode.includes('VisitorClock'), '5.2 Header renders compact VisitorClock');

  const presenceCode = fs.readFileSync('src/components/common/VisitorPresenceSection.tsx', 'utf-8');
  assert(presenceCode.includes('VisitorClock'), '5.3 VisitorPresenceSection contains VisitorClock');
  assert(presenceCode.includes('VisitorCounter'), '5.4 VisitorPresenceSection contains VisitorCounter');

  console.log('================================================================');
  console.log('🎉 ALL FEATURE 2 VISITOR COUNTER TESTS PASSED');
  console.log('================================================================');
}

runVisitorCounterTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
