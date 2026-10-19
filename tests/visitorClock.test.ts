/**
 * Test Suite: Visitor Local Date & Time (Feature 1)
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 28 Verification
 */

import {
  detectVisitorTimeZone,
  resolveTimeZoneDetails,
  formatVisitorDate,
  formatVisitorTime,
  formatVisitorCompactTime,
  checkDstActive,
} from '../src/hooks/useVisitorClock';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runVisitorClockTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING FEATURE 1: VISITOR LOCAL DATE & TIME TESTS');
  console.log('================================================================');

  // --- 1. Automatic Timezone Detection via Intl API ---
  console.log('\n--- 1. Timezone Detection & Dynamic Environment ---');
  const detectedTz = detectVisitorTimeZone();
  assert(typeof detectedTz === 'string' && detectedTz.length > 0, '1.1 Timezone is detected via Intl.DateTimeFormat');
  console.log(`     (Runtime detected timezone: ${detectedTz})`);

  // --- 2. Guarantee No Hardcoding to IST / Asia/Kolkata ---
  console.log('\n--- 2. Non-Hardcoded Universal Timezone Support ---');
  const sampleTimezones = [
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Europe/Paris',
    'Asia/Kolkata',
    'UTC',
  ];

  const testDate = new Date('2026-10-19T14:30:45Z');

  for (const tz of sampleTimezones) {
    const details = resolveTimeZoneDetails(testDate, tz);
    assert(Boolean(details.label), `2.1 Resolves label for ${tz}: ${details.label}`);
    assert(Boolean(details.shortName || details.offsetStr), `2.2 Resolves abbreviation/offset for ${tz}: ${details.shortName || details.offsetStr}`);

    const dateStr = formatVisitorDate(testDate, tz);
    assert(typeof dateStr === 'string' && dateStr.length > 0, `2.3 Formats localized date for ${tz}: "${dateStr}"`);

    const timeStr = formatVisitorTime(testDate, tz);
    assert(timeStr.includes(':'), `2.4 Formats localized time with seconds for ${tz}: "${timeStr}"`);

    const compactTimeStr = formatVisitorCompactTime(testDate, tz);
    assert(compactTimeStr.includes(':'), `2.5 Formats compact time for ${tz}: "${compactTimeStr}"`);
  }

  // Confirm that New York and Tokyo produce different formatted times for the same instant
  const nyTime = formatVisitorTime(testDate, 'America/New_York');
  const tokyoTime = formatVisitorTime(testDate, 'Asia/Tokyo');
  assert(nyTime !== tokyoTime, `2.6 Different timezones produce different local wall-clock times (NY: ${nyTime} vs Tokyo: ${tokyoTime})`);

  // --- 3. Daylight Saving Time (DST) Automatic Calculation ---
  console.log('\n--- 3. Daylight Saving Time (DST) Transitions ---');
  // New York observes DST: Summer (July) is EDT (UTC-4), Winter (January) is EST (UTC-5)
  const summerDate = new Date('2026-07-15T12:00:00Z');
  const winterDate = new Date('2026-01-15T12:00:00Z');

  const nySummerDetails = resolveTimeZoneDetails(summerDate, 'America/New_York');
  const nyWinterDetails = resolveTimeZoneDetails(winterDate, 'America/New_York');
  assert(nySummerDetails.shortName === 'EDT', '3.1 Summer in New York resolves to EDT');
  assert(nyWinterDetails.shortName === 'EST', '3.2 Winter in New York resolves to EST');
  assert(checkDstActive(summerDate, 'America/New_York') === true, '3.3 Summer date correctly identifies active DST in New York');
  assert(checkDstActive(winterDate, 'America/New_York') === false, '3.4 Winter date correctly identifies inactive DST in New York');

  // Zones without DST (e.g. Asia/Kolkata) never report active DST
  assert(checkDstActive(summerDate, 'Asia/Kolkata') === false, '3.5 Non-DST zone (Asia/Kolkata) returns false for DST');

  // --- 4. Privacy & Zero Tracking Invariants ---
  console.log('\n--- 4. Privacy & Geolocation Invariants ---');
  // Check that code does not reference navigator.geolocation or GPS APIs
  const hookSource = await import('fs').then(fs => fs.readFileSync('src/hooks/useVisitorClock.ts', 'utf-8'));
  assert(!hookSource.includes('navigator.geolocation'), '4.1 useVisitorClock does not access navigator.geolocation');
  assert(!hookSource.includes('getCurrentPosition'), '4.2 useVisitorClock does not request getCurrentPosition');
  assert(!hookSource.includes('ipapi') && !hookSource.includes('ip-api'), '4.3 useVisitorClock does not make third-party IP lookups');

  console.log('================================================================');
  console.log('🎉 ALL FEATURE 1 VISITOR CLOCK TESTS PASSED');
  console.log('================================================================');
}

runVisitorClockTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
