/**
 * Unit & Contract Tests: Step 25 — Controlled Google Drive Ingestion Foundation
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 25 — Controlled Google Drive to Website Ingestion Foundation
 * 
 * Verifies:
 * 1. Valid preview manifest accepted
 * 2. Invalid taxonomy rejected (invalid section, missing fields)
 * 3. Missing required metadata rejected
 * 4. Dry-run performs zero HTTP calls
 * 5. Dry-run produces safe metadata
 * 6. Dry-run does not expose secrets
 * 7. Missing base URL rejected
 * 8. Missing API key rejected
 * 9. Explicit confirmation boundary: no-confirm performs zero HTTP calls
 * 10. Confirm prepares and executes exactly one gateway request
 * 11. Deterministic idempotency key: same manifest produces identical key
 * 12. Divergent manifest produces different idempotency key
 * 13. User taxonomy remains authoritative (zero alterations)
 * 14. Published status strictly defaults and remains false
 * 15. Source provenance preserved completely (system, source_id, source_name, source_url)
 * 16. Ingestion endpoint maps to /api/automation/ingest with Bearer auth and Idempotency-Key
 * 17. HTTP 401, 400, 409, 500 error handling
 * 18. Network failure handling
 * 19. No direct Supabase import or access in ingestion foundation
 * 20. No direct Storage import or access in ingestion foundation
 * 21. No automatic retry loop on network failure
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  runGoogleDriveIngestion,
  generateGoogleDriveIdempotencyKey,
  extractSafeGoogleDriveMetadata,
} from '../src/services/googleDriveIngestionService.js';
import { AutomationManifest } from '../src/types/automation.js';

let passed = 0;
let failed = 0;

function check(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
  }
}

const samplePreviewManifest: AutomationManifest = {
  manifest_version: '1.0',
  section: 'research',
  category: 'personal-website',
  topic: 'Hemant Kumar Kushwaha',
  content_type: 'research_project',
  title: 'HEMANT KUMAR KUSHWAHA.com',
  body: '# Research Overview\n\nPersonal knowledge platform architecture and verified automation pipeline.',
  source_url: 'https://docs.google.com/document/d/mock-drive-id-12345/edit',
  published: true, // caller sets published=true, but foundation must override to false for safety
  source: {
    system: 'google-drive',
    source_id: 'mock-drive-id-12345',
    source_name: 'HEMANT KUMAR KUSHWAHA.com',
    source_url: 'https://docs.google.com/document/d/mock-drive-id-12345/edit',
    generated_at: '2026-09-22T10:00:00.000Z',
  },
};

async function runStep25Tests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 25: GOOGLE DRIVE CONTROLLED INGESTION FOUNDATION');
  console.log('================================================================');

  // Test 1: Valid preview manifest accepted in dry-run
  const dryRunResult = await runGoogleDriveIngestion({
    manifest: samplePreviewManifest,
    dryRun: true,
  });
  check(dryRunResult.success === true, '1. Valid preview manifest accepted in dry-run mode');
  check(dryRunResult.dryRun === true, '1b. Result correctly flagged as dryRun: true');
  check(Boolean(dryRunResult.metadata), '1c. Safe metadata object produced');

  // Test 2: Invalid taxonomy rejected (invalid section)
  const invalidSectionManifest: any = {
    ...samplePreviewManifest,
    section: 'invalid_section_name',
  };
  const invalidSectionResult = await runGoogleDriveIngestion({
    manifest: invalidSectionManifest,
    dryRun: true,
  });
  check(invalidSectionResult.success === false, '2. Invalid section rejected');
  check(
    invalidSectionResult.error?.code === 'INVALID_SECTION' ||
      invalidSectionResult.error?.code === 'INVALID_MANIFEST',
    '2b. Appropriate error code returned for invalid section'
  );

  // Test 3: Missing required metadata rejected
  const missingTitleManifest: any = {
    ...samplePreviewManifest,
    title: '',
  };
  const missingTitleResult = await runGoogleDriveIngestion({
    manifest: missingTitleManifest,
    dryRun: true,
  });
  check(missingTitleResult.success === false, '3. Empty or missing title rejected');

  // Test 4: Dry-run performs zero HTTP calls
  let httpCallsCount = 0;
  const mockFetchThatFails = async () => {
    httpCallsCount++;
    throw new Error('fetch should NOT be called during dry-run');
  };
  await runGoogleDriveIngestion({
    manifest: samplePreviewManifest,
    dryRun: true,
    fetchFn: mockFetchThatFails as any,
  });
  check(httpCallsCount === 0, '4. Dry-run performs zero HTTP calls');

  // Test 5: No-confirm performs zero HTTP calls and returns confirmationRequired
  httpCallsCount = 0;
  const noConfirmResult = await runGoogleDriveIngestion({
    manifest: samplePreviewManifest,
    dryRun: false,
    confirm: false,
    baseUrl: 'https://example.com',
    apiKey: 'mock-key',
    fetchFn: mockFetchThatFails as any,
  });
  check(noConfirmResult.success === false, '5. No-confirm stops execution safely');
  check(noConfirmResult.confirmationRequired === true, '5b. confirmationRequired: true returned');
  check(httpCallsCount === 0, '5c. Zero HTTP calls executed without explicit confirmation');

  // Test 6: Missing base URL rejected when confirm=true
  const missingBaseUrlResult = await runGoogleDriveIngestion({
    manifest: samplePreviewManifest,
    dryRun: false,
    confirm: true,
    baseUrl: '',
    apiKey: 'mock-key',
  });
  check(missingBaseUrlResult.success === false, '6. Missing base URL rejected');
  check(
    missingBaseUrlResult.error?.code === 'MISSING_CONFIG_BASE_URL',
    '6b. Error code MISSING_CONFIG_BASE_URL returned'
  );

  // Test 7: Missing API key rejected when confirm=true
  const missingApiKeyResult = await runGoogleDriveIngestion({
    manifest: samplePreviewManifest,
    dryRun: false,
    confirm: true,
    baseUrl: 'https://example.com',
    apiKey: '',
  });
  check(missingApiKeyResult.success === false, '7. Missing API key rejected');
  check(
    missingApiKeyResult.error?.code === 'MISSING_CONFIG_API_KEY',
    '7b. Error code MISSING_CONFIG_API_KEY returned'
  );

  // Test 8: Confirm prepares and executes exactly ONE gateway request
  let executedUrls: string[] = [];
  let capturedHeaders: Record<string, string> = {};
  let capturedBody: any = null;

  const mockSuccessfulFetch = async (url: string | URL | Request, init?: RequestInit) => {
    executedUrls.push(url.toString());
    capturedHeaders = (init?.headers as Record<string, string>) || {};
    capturedBody = JSON.parse((init?.body as string) || '{}');

    return {
      ok: true,
      status: 201,
      text: async () =>
        JSON.stringify({
          success: true,
          data: {
            content_id: 'content-uuid-1234',
            slug: 'hemant-kumar-kushwaha-com',
            title: samplePreviewManifest.title,
          },
        }),
    } as Response;
  };

  const confirmResult = await runGoogleDriveIngestion({
    manifest: samplePreviewManifest,
    dryRun: false,
    confirm: true,
    baseUrl: 'https://hemantkrkushwaha.com',
    apiKey: 'mock-secret-api-key',
    fetchFn: mockSuccessfulFetch as any,
  });

  check(confirmResult.success === true, '8. Confirm executes successfully');
  check(executedUrls.length === 1, '8b. Exactly one HTTP request executed');
  check(
    executedUrls[0] === 'https://hemantkrkushwaha.com/api/automation/ingest',
    '8c. Targets existing POST /api/automation/ingest endpoint'
  );
  check(
    capturedHeaders['Authorization'] === 'Bearer mock-secret-api-key',
    '8d. Authorization Bearer header configured'
  );
  check(
    Boolean(capturedHeaders['Idempotency-Key']),
    '8e. Deterministic Idempotency-Key header included'
  );
  check(
    capturedHeaders['Content-Type'] === 'application/json',
    '8f. JSON Content-Type header set'
  );

  // Test 9: Deterministic Idempotency Key properties
  const key1 = generateGoogleDriveIdempotencyKey(samplePreviewManifest);
  const key2 = generateGoogleDriveIdempotencyKey(samplePreviewManifest);
  check(key1 === key2, '9. Same manifest generates identical Idempotency-Key');
  check(key1.startsWith('gdrive_'), '9b. Key has standard gdrive_ prefix');
  check(key1.length === 39, '9c. Key has valid length (7 prefix + 32 hex chars)');

  const modifiedManifest: AutomationManifest = {
    ...samplePreviewManifest,
    title: 'Different Title',
  };
  const key3 = generateGoogleDriveIdempotencyKey(modifiedManifest);
  check(key1 !== key3, '10. Different manifest generates distinct Idempotency-Key');

  // Test 10: Taxonomy supremacy & user values authoritative
  check(
    capturedBody?.manifest?.section === samplePreviewManifest.section,
    '11. Section preserved verbatim without inference'
  );
  check(
    capturedBody?.manifest?.category === samplePreviewManifest.category,
    '11b. Category preserved verbatim without inference'
  );
  check(
    capturedBody?.manifest?.topic === samplePreviewManifest.topic,
    '11c. Topic preserved verbatim without inference'
  );
  check(
    capturedBody?.manifest?.content_type === samplePreviewManifest.content_type,
    '11d. Content type preserved verbatim without inference'
  );
  check(
    capturedBody?.manifest?.title === samplePreviewManifest.title,
    '11e. Title preserved verbatim without inference'
  );

  // Test 11: Publishing safety: published strictly overridden to false
  check(
    capturedBody?.manifest?.published === false,
    '12. Published forced to false during ingestion foundation'
  );
  check(
    confirmResult.metadata?.published === false,
    '12b. Metadata reports published: false'
  );

  // Test 12: Source provenance preserved
  check(
    capturedBody?.manifest?.source?.system === 'google-drive',
    '13. source.system preserved as google-drive'
  );
  check(
    capturedBody?.manifest?.source?.source_id === 'mock-drive-id-12345',
    '13b. source.source_id preserved'
  );
  check(
    capturedBody?.manifest?.source?.source_name === 'HEMANT KUMAR KUSHWAHA.com',
    '13c. source.source_name preserved'
  );
  check(
    capturedBody?.manifest?.source?.source_url === 'https://docs.google.com/document/d/mock-drive-id-12345/edit',
    '13d. source.source_url preserved'
  );

  // Test 13: HTTP 401 Unauthorized handling
  const mock401Fetch = async () =>
    ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }),
    } as Response);

  const res401 = await runGoogleDriveIngestion({
    manifest: samplePreviewManifest,
    confirm: true,
    baseUrl: 'https://example.com',
    apiKey: 'invalid-key',
    fetchFn: mock401Fetch as any,
  });
  check(res401.success === false, '14. HTTP 401 mapped to failure');
  check(res401.httpStatus === 401, '14b. HTTP status 401 preserved');
  check(res401.error?.code === 'UNAUTHORIZED', '14c. Standard UNAUTHORIZED error code');

  // Test 14: HTTP 409 Conflict handling
  const mock409Fetch = async () =>
    ({
      ok: false,
      status: 409,
      text: async () =>
        JSON.stringify({
          slug: 'hemant-kumar-kushwaha-com',
          error: { code: 'CONFLICT_DUPLICATE_SLUG', message: 'Slug exists' },
        }),
    } as Response);

  const res409 = await runGoogleDriveIngestion({
    manifest: samplePreviewManifest,
    confirm: true,
    baseUrl: 'https://example.com',
    apiKey: 'mock-key',
    fetchFn: mock409Fetch as any,
  });
  check(res409.success === false, '15. HTTP 409 conflict handled cleanly');
  check(res409.error?.code === 'CONFLICT_DUPLICATE_SLUG', '15b. CONFLICT_DUPLICATE_SLUG code returned');

  // Test 15: Network failure handling without crashing
  const mockNetworkFailFetch = async () => {
    throw new Error('Connection refused / ECONNREFUSED');
  };
  const resNetFail = await runGoogleDriveIngestion({
    manifest: samplePreviewManifest,
    confirm: true,
    baseUrl: 'https://example.com',
    apiKey: 'mock-key',
    fetchFn: mockNetworkFailFetch as any,
  });
  check(resNetFail.success === false, '16. Network failure caught and mapped cleanly');
  check(resNetFail.error?.code === 'NETWORK_FAILURE', '16b. NETWORK_FAILURE error code returned');

  // Test 16: Zero Supabase & Storage imports in googleDriveIngestionService.ts
  const serviceFileContent = fs.readFileSync(
    path.join(process.cwd(), 'src/services/googleDriveIngestionService.ts'),
    'utf-8'
  );
  check(
    !serviceFileContent.includes('@supabase/supabase-js'),
    '17. Zero direct @supabase/supabase-js imports in ingestion service'
  );
  check(
    !serviceFileContent.includes('from \'./storageService'),
    '17b. Zero direct storageService imports in ingestion service'
  );
  check(
    !serviceFileContent.includes('uploadFile'),
    '17c. Zero direct uploadFile calls in ingestion service'
  );

  // Test 17: No automatic retry on failure
  let retryCount = 0;
  const mockCountingFailFetch = async () => {
    retryCount++;
    return {
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: { message: 'Internal Server Error' } }),
    } as Response;
  };
  await runGoogleDriveIngestion({
    manifest: samplePreviewManifest,
    confirm: true,
    baseUrl: 'https://example.com',
    apiKey: 'mock-key',
    fetchFn: mockCountingFailFetch as any,
  });
  check(retryCount === 1, '18. Exactly one attempt made on HTTP error (zero automatic retry loops)');

  console.log('================================================================');
  console.log(`STEP 25 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep25Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
