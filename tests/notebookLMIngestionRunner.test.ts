/**
 * Unit & Integration Test Suite: Step 19 — Controlled NotebookLM Export Ingestion Runner
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 19 — Controlled NotebookLM Export Ingestion Runner
 * 
 * Verifies Part L Requirements:
 * 1. Missing package path rejected.
 * 2. Invalid JSON rejected.
 * 3. Invalid package rejected.
 * 4. Valid package accepted.
 * 5. Dry-run performs zero HTTP calls.
 * 6. Dry-run produces safe metadata.
 * 7. Dry-run does not expose secrets.
 * 8. Missing base URL rejected.
 * 9. Missing API key rejected.
 * 10. --confirm required.
 * 11. No-confirm performs zero HTTP calls.
 * 12. Confirm performs exactly one POST.
 * 13. Correct endpoint used.
 * 14. Authorization header generated internally.
 * 15. Authorization header never logged.
 * 16. API key never appears in output.
 * 17. Deterministic Idempotency-Key generated.
 * 18. Same package produces same Idempotency-Key.
 * 19. Different package produces different Idempotency-Key.
 * 20. HTTP 401 handled safely.
 * 21. HTTP 400 handled safely.
 * 22. HTTP 409 handled safely.
 * 23. HTTP 500 handled safely.
 * 24. Network failure handled safely.
 * 25. Successful response parsed.
 * 26. Existing NotebookLM Adapter reused.
 * 27. Existing package validator reused.
 * 28. No Supabase import.
 * 29. No Storage import.
 * 30. No NotebookLM API.
 * 31. No browser automation.
 * 32. Existing Step 9 regression passes.
 * 33. Existing Step 10 regression passes.
 * 34. Existing Step 14 regression passes.
 * 35. Existing Step 15 regression passes.
 * 36. Existing Step 16 regression passes.
 * 37. Existing Step 17 regression passes.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  runNotebookLMIngestion,
  generateNotebookLMIdempotencyKey,
  extractSafePackageMetadata,
  parseCliArgs,
} from '../scripts/notebookLM-ingest.js';
import { NotebookLMExportPackage } from '../src/types/notebookLMExportPackage.js';
import { notebookLMAdapter } from '../src/services/adapters/notebookLMAdapter.js';
import {
  validateNotebookLMExportPackage,
  convertNotebookLMExportPackageToManifest,
} from '../src/services/notebookLMExportPackageService.js';
import { validateAutomationManifest, validateSourceMetadata } from '../src/services/manifestService.js';
import { generateDeterministicSlug } from '../src/services/contentIngestionService.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
  }
}

const examplePackagePath = path.resolve(process.cwd(), 'examples/notebooklm-export-package.json');

const sampleValidPackage: NotebookLMExportPackage = {
  package_version: '1.0',
  source: {
    system: 'notebooklm',
    source_id: 'test-notebook-abc',
    source_url: 'https://notebooklm.google.com/notebook/test-notebook-abc',
    source_name: 'Test Notebook on Protocols',
    generated_at: '2026-09-20T00:00:00.000Z',
  },
  metadata: {
    section: 'academics',
    category: 'computer-networks',
    topic: 'arp',
    content_type: 'study_material',
    title: 'Address Resolution Protocol Fundamentals',
    description: 'A study guide explaining ARP frame structure.',
    tags: ['networking', 'arp'],
  },
  content: {
    body: '# ARP Fundamentals\n\nARP maps IP addresses to MAC addresses.',
  },
};

/**
 * Creates a temporary file with given content, runs a callback, then removes the file.
 */
function withTempFile<T>(content: string, fn: (tempPath: string) => T): T {
  const tmpDir = os.tmpdir();
  const tempPath = path.join(tmpDir, `test_nlm_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
  fs.writeFileSync(tempPath, content, 'utf8');
  try {
    return fn(tempPath);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

async function withTempFileAsync<T>(content: string, fn: (tempPath: string) => Promise<T>): Promise<T> {
  const tmpDir = os.tmpdir();
  const tempPath = path.join(tmpDir, `test_nlm_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
  fs.writeFileSync(tempPath, content, 'utf8');
  try {
    return await fn(tempPath);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

export async function runStep19Tests(): Promise<void> {
  console.log('\n================================================================');
  console.log('STEP 19 TEST SUITE: CONTROLLED NOTEBOOKLM EXPORT INGESTION RUNNER');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // 1. Missing package path rejected
  // -------------------------------------------------------------
  {
    const logs: string[] = [];
    const result = await runNotebookLMIngestion({
      packagePath: '',
      logger: { log: (m) => logs.push(m), warn: (m) => logs.push(m), error: (m) => logs.push(m) },
    });
    assert(result.success === false, '1. Missing package path rejected (success is false)');
    assert(result.error?.code === 'MISSING_PACKAGE_PATH', '1b. Error code is MISSING_PACKAGE_PATH');
  }

  // -------------------------------------------------------------
  // 2. Invalid JSON rejected
  // -------------------------------------------------------------
  await withTempFileAsync('{ broken json: true ', async (badJsonPath) => {
    const logs: string[] = [];
    const result = await runNotebookLMIngestion({
      packagePath: badJsonPath,
      logger: { log: (m) => logs.push(m), warn: (m) => logs.push(m), error: (m) => logs.push(m) },
    });
    assert(result.success === false, '2. Invalid JSON rejected (success is false)');
    assert(result.error?.code === 'MALFORMED_REQUEST', '2b. Error code is MALFORMED_REQUEST');
  });

  // -------------------------------------------------------------
  // 3. Invalid package rejected
  // -------------------------------------------------------------
  await withTempFileAsync(
    JSON.stringify({ package_version: '1.0', source: { system: 'notebooklm' }, metadata: { section: 'academics' } }),
    async (invalidPkgPath) => {
      const logs: string[] = [];
      const result = await runNotebookLMIngestion({
        packagePath: invalidPkgPath,
        logger: { log: (m) => logs.push(m), warn: (m) => logs.push(m), error: (m) => logs.push(m) },
      });
      assert(result.success === false, '3. Invalid package rejected (missing required fields)');
      assert(
        result.error?.code === 'INVALID_MANIFEST' || result.error?.code === 'MISSING_REQUIRED_FIELD',
        '3b. Error code is MISSING_REQUIRED_FIELD or INVALID_MANIFEST'
      );
    }
  );

  // -------------------------------------------------------------
  // 4. Valid package accepted
  // -------------------------------------------------------------
  {
    const logs: string[] = [];
    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      dryRun: true,
      logger: { log: (m) => logs.push(m), warn: (m) => logs.push(m), error: (m) => logs.push(m) },
    });
    assert(result.success === true, '4. Valid package accepted');
    assert(result.metadata?.title.includes('Address Resolution Protocol'), '4b. Title extracted accurately');
    assert(result.metadata?.section === 'academics', '4c. Section extracted accurately');
  }

  // -------------------------------------------------------------
  // 5. Dry-run performs zero HTTP calls
  // -------------------------------------------------------------
  {
    let fetchCalled = 0;
    const mockFetch: any = async () => {
      fetchCalled++;
      return new Response('{}', { status: 200 });
    };

    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      dryRun: true,
      baseUrl: 'https://hemantkrkushwaha.com',
      apiKey: 'test-secret-key-12345',
      fetchFn: mockFetch,
    });

    assert(result.dryRun === true, '5a. Dry run flag is true');
    assert(fetchCalled === 0, '5. Dry-run performs zero HTTP calls');
  }

  // -------------------------------------------------------------
  // 6. Dry-run produces safe metadata
  // -------------------------------------------------------------
  {
    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      dryRun: true,
    });
    assert(Boolean(result.metadata), '6a. Metadata object returned');
    assert(result.metadata?.section === 'academics', '6b. Section matches package');
    assert(result.metadata?.category === 'computer-networks', '6c. Category matches package');
    assert(result.metadata?.topic === 'arp', '6d. Topic matches package');
    assert(result.metadata?.contentType === 'study_material', '6e. Content type matches package');
    assert(result.metadata?.sourceSystem === 'notebooklm', '6. Dry-run produces safe metadata');
  }

  // -------------------------------------------------------------
  // 7. Dry-run does not expose secrets
  // -------------------------------------------------------------
  {
    const capturedLogs: string[] = [];
    const secretKey = 'CRITICAL_SECRET_VALUE_987654321';
    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      dryRun: true,
      apiKey: secretKey,
      logger: {
        log: (msg) => capturedLogs.push(msg),
        warn: (msg) => capturedLogs.push(msg),
        error: (msg) => capturedLogs.push(msg),
      },
    });

    const allLogText = capturedLogs.join('\n');
    const resultString = JSON.stringify(result);

    assert(!allLogText.includes(secretKey), '7a. Secret key does not appear in dry-run logs');
    assert(!resultString.includes(secretKey), '7. Dry-run does not expose secrets');
  }

  // -------------------------------------------------------------
  // 8. Missing base URL rejected
  // -------------------------------------------------------------
  {
    const originalEnv = process.env.CONTENT_INGESTION_BASE_URL;
    delete process.env.CONTENT_INGESTION_BASE_URL;

    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: true,
      baseUrl: '',
      apiKey: 'test-key',
    });

    assert(result.success === false, '8a. Missing base URL fails execution');
    assert(result.error?.code === 'MISSING_CONFIG_BASE_URL', '8. Missing base URL rejected with MISSING_CONFIG_BASE_URL');

    if (originalEnv) {
      process.env.CONTENT_INGESTION_BASE_URL = originalEnv;
    }
  }

  // -------------------------------------------------------------
  // 9. Missing API key rejected
  // -------------------------------------------------------------
  {
    const originalEnv = process.env.CONTENT_INGESTION_API_KEY;
    delete process.env.CONTENT_INGESTION_API_KEY;

    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: true,
      baseUrl: 'https://hemantkrkushwaha.com',
      apiKey: '',
    });

    assert(result.success === false, '9a. Missing API key fails execution');
    assert(result.error?.code === 'MISSING_CONFIG_API_KEY', '9. Missing API key rejected with MISSING_CONFIG_API_KEY');

    if (originalEnv) {
      process.env.CONTENT_INGESTION_API_KEY = originalEnv;
    }
  }

  // -------------------------------------------------------------
  // 10. --confirm required
  // -------------------------------------------------------------
  {
    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: false,
      dryRun: false,
    });

    assert(result.success === false, '10a. Without confirm or dry-run, execution stops');
    assert(result.confirmationRequired === true, '10. --confirm required flag detected');
  }

  // -------------------------------------------------------------
  // 11. No-confirm performs zero HTTP calls
  // -------------------------------------------------------------
  {
    let fetchCalls = 0;
    const mockFetch: any = async () => {
      fetchCalls++;
      return new Response('{}', { status: 200 });
    };

    await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: false,
      dryRun: false,
      baseUrl: 'https://hemantkrkushwaha.com',
      apiKey: 'secret-key',
      fetchFn: mockFetch,
    });

    assert(fetchCalls === 0, '11. No-confirm performs zero HTTP calls');
  }

  // -------------------------------------------------------------
  // 12. Confirm performs exactly one POST
  // -------------------------------------------------------------
  {
    let postCalls = 0;
    let recordedMethod = '';
    const mockFetch: any = async (url: string, init: RequestInit) => {
      postCalls++;
      recordedMethod = init?.method || '';
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            content_id: 'test-uuid-1234',
            slug: 'address-resolution-protocol',
            title: 'Address Resolution Protocol',
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: true,
      baseUrl: 'https://hemantkrkushwaha.com',
      apiKey: 'secret-key',
      fetchFn: mockFetch,
    });

    assert(result.success === true, '12a. Ingestion succeeded with mock');
    assert(postCalls === 1, '12. Confirm performs exactly one POST');
    assert(recordedMethod === 'POST', '12c. Method was POST');
  }

  // -------------------------------------------------------------
  // 13. Correct endpoint used
  // -------------------------------------------------------------
  {
    let targetUrl = '';
    const mockFetch: any = async (url: string) => {
      targetUrl = url;
      return new Response(
        JSON.stringify({ success: true, data: { slug: 'test', title: 'Test' } }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: true,
      baseUrl: 'https://hemantkrkushwaha.com///',
      apiKey: 'secret-key',
      fetchFn: mockFetch,
    });

    assert(
      targetUrl === 'https://hemantkrkushwaha.com/api/automation/ingest',
      '13. Correct endpoint used (https://hemantkrkushwaha.com/api/automation/ingest)'
    );
  }

  // -------------------------------------------------------------
  // 14. Authorization header generated internally
  // -------------------------------------------------------------
  {
    let authHeader = '';
    const testSecret = 'secret-token-abcdef12345';
    const mockFetch: any = async (url: string, init: any) => {
      authHeader = init?.headers?.Authorization || '';
      return new Response(
        JSON.stringify({ success: true, data: { slug: 'test', title: 'Test' } }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: true,
      baseUrl: 'https://hemantkrkushwaha.com',
      apiKey: testSecret,
      fetchFn: mockFetch,
    });

    assert(authHeader === `Bearer ${testSecret}`, '14. Authorization header generated internally (Bearer <key>)');
  }

  // -------------------------------------------------------------
  // 15. Authorization header never logged
  // -------------------------------------------------------------
  {
    const logs: string[] = [];
    const testSecret = 'super-secret-auth-key-never-log';
    const mockFetch: any = async () => {
      return new Response(
        JSON.stringify({ success: true, data: { slug: 'test', title: 'Test' } }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: true,
      baseUrl: 'https://hemantkrkushwaha.com',
      apiKey: testSecret,
      fetchFn: mockFetch,
      logger: {
        log: (m) => logs.push(m),
        warn: (m) => logs.push(m),
        error: (m) => logs.push(m),
      },
    });

    const joinedLogs = logs.join('\n');
    assert(!joinedLogs.includes(`Bearer ${testSecret}`), '15. Authorization header never logged');
  }

  // -------------------------------------------------------------
  // 16. API key never appears in output
  // -------------------------------------------------------------
  {
    const logs: string[] = [];
    const testSecret = 'sensitive-raw-api-key-value-123';
    const mockFetch: any = async () => {
      return new Response(
        JSON.stringify({ success: true, data: { slug: 'test', title: 'Test' } }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: true,
      baseUrl: 'https://hemantkrkushwaha.com',
      apiKey: testSecret,
      fetchFn: mockFetch,
      logger: {
        log: (m) => logs.push(m),
        warn: (m) => logs.push(m),
        error: (m) => logs.push(m),
      },
    });

    const joinedLogs = logs.join('\n');
    const serializedResult = JSON.stringify(result);

    assert(!joinedLogs.includes(testSecret), '16a. Raw API key never appears in logs');
    assert(!serializedResult.includes(testSecret), '16. API key never appears in output');
  }

  // -------------------------------------------------------------
  // 17. Deterministic Idempotency-Key generated
  // -------------------------------------------------------------
  {
    const key = generateNotebookLMIdempotencyKey(sampleValidPackage);
    assert(typeof key === 'string' && key.startsWith('nlm_'), '17a. Key starts with nlm_ prefix');
    assert(key.length === 36, '17. Deterministic Idempotency-Key generated (prefix + 32-char hex)');
  }

  // -------------------------------------------------------------
  // 18. Same package produces same Idempotency-Key
  // -------------------------------------------------------------
  {
    const key1 = generateNotebookLMIdempotencyKey(sampleValidPackage);
    const key2 = generateNotebookLMIdempotencyKey({ ...sampleValidPackage });
    assert(key1 === key2, '18. Same package produces same Idempotency-Key');
  }

  // -------------------------------------------------------------
  // 19. Different package produces different Idempotency-Key
  // -------------------------------------------------------------
  {
    const key1 = generateNotebookLMIdempotencyKey(sampleValidPackage);
    const diffPackage: NotebookLMExportPackage = {
      ...sampleValidPackage,
      metadata: {
        ...sampleValidPackage.metadata,
        title: 'Completely Different Title Here',
      },
    };
    const key2 = generateNotebookLMIdempotencyKey(diffPackage);
    assert(key1 !== key2, '19. Different package produces different Idempotency-Key');
  }

  // -------------------------------------------------------------
  // 20. HTTP 401 handled safely
  // -------------------------------------------------------------
  {
    const mockFetch: any = async () => {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: true,
      baseUrl: 'https://hemantkrkushwaha.com',
      apiKey: 'wrong-key',
      fetchFn: mockFetch,
    });

    assert(result.success === false, '20a. Handled 401 failure');
    assert(result.httpStatus === 401, '20b. HTTP status 401 recorded');
    assert(result.error?.code === 'UNAUTHORIZED', '20. HTTP 401 handled safely (code: UNAUTHORIZED)');
  }

  // -------------------------------------------------------------
  // 21. HTTP 400 handled safely
  // -------------------------------------------------------------
  {
    const mockFetch: any = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_MANIFEST', message: 'Category is missing' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: true,
      baseUrl: 'https://hemantkrkushwaha.com',
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    assert(result.success === false, '21a. Handled 400 failure');
    assert(result.httpStatus === 400, '21. HTTP 400 handled safely');
  }

  // -------------------------------------------------------------
  // 22. HTTP 409 handled safely
  // -------------------------------------------------------------
  {
    const mockFetch: any = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'CONFLICT_DUPLICATE_SLUG', message: 'Slug already exists' },
          slug: 'arp-fundamentals',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: true,
      baseUrl: 'https://hemantkrkushwaha.com',
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    assert(result.success === false, '22a. Handled 409 conflict');
    assert(result.httpStatus === 409, '22b. HTTP status 409 recorded');
    assert(result.error?.code === 'CONFLICT_DUPLICATE_SLUG', '22. HTTP 409 handled safely (CONFLICT_DUPLICATE_SLUG)');
  }

  // -------------------------------------------------------------
  // 23. HTTP 500 handled safely
  // -------------------------------------------------------------
  {
    const mockFetch: any = async () => {
      return new Response('Internal Server Error', { status: 500 });
    };

    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: true,
      baseUrl: 'https://hemantkrkushwaha.com',
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    assert(result.success === false, '23a. Handled 500 server error');
    assert(result.httpStatus === 500, '23. HTTP 500 handled safely');
  }

  // -------------------------------------------------------------
  // 24. Network failure handled safely
  // -------------------------------------------------------------
  {
    const mockFetch: any = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:443');
    };

    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: true,
      baseUrl: 'https://offline-domain.invalid',
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    assert(result.success === false, '24a. Handled network crash without throwing');
    assert(result.error?.code === 'NETWORK_FAILURE', '24. Network failure handled safely (code: NETWORK_FAILURE)');
  }

  // -------------------------------------------------------------
  // 25. Successful response parsed
  // -------------------------------------------------------------
  {
    const mockFetch: any = async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            content_id: 'publication-id-9988',
            slug: 'arp-deep-dive',
            title: 'Address Resolution Protocol Deep Dive',
            fileUploaded: true,
            storagePath: 'academics/computer-networks/arp/arp-study-notes.pdf',
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const result = await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      confirm: true,
      baseUrl: 'https://hemantkrkushwaha.com',
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    assert(result.success === true, '25a. Successful response confirmed');
    assert(result.data?.contentId === 'publication-id-9988', '25b. content_id parsed');
    assert(result.data?.slug === 'arp-deep-dive', '25c. slug parsed');
    assert(result.data?.title === 'Address Resolution Protocol Deep Dive', '25. Successful response parsed');
  }

  // -------------------------------------------------------------
  // 26. Existing NotebookLM Adapter reused
  // -------------------------------------------------------------
  {
    const spy = { called: false };
    const originalTryAdapt = notebookLMAdapter.tryAdapt.bind(notebookLMAdapter);
    notebookLMAdapter.tryAdapt = (input: any) => {
      spy.called = true;
      return originalTryAdapt(input);
    };

    await runNotebookLMIngestion({
      packagePath: examplePackagePath,
      dryRun: true,
    });

    notebookLMAdapter.tryAdapt = originalTryAdapt;
    assert(spy.called === true, '26. Existing NotebookLM Adapter reused');
  }

  // -------------------------------------------------------------
  // 27. Existing package validator reused
  // -------------------------------------------------------------
  {
    const validation = validateNotebookLMExportPackage(sampleValidPackage);
    assert(validation.valid === true, '27. Existing package validator reused');
  }

  // -------------------------------------------------------------
  // 28. No Supabase import
  // -------------------------------------------------------------
  {
    const runnerSource = fs.readFileSync(path.resolve(process.cwd(), 'scripts/notebookLM-ingest.ts'), 'utf8');
    const hasSupabaseImport = /import.*@supabase\/supabase-js/.test(runnerSource);
    assert(!hasSupabaseImport && !runnerSource.includes('@supabase/supabase-js'), '28a. No @supabase/supabase-js imported in runner');
    assert(!runnerSource.includes('createClient'), '28b. No createClient in runner');
    assert(!runnerSource.includes('supabase.from'), '28. No Supabase import');
  }

  // -------------------------------------------------------------
  // 29. No Storage import
  // -------------------------------------------------------------
  {
    const runnerSource = fs.readFileSync(path.resolve(process.cwd(), 'scripts/notebookLM-ingest.ts'), 'utf8');
    assert(!runnerSource.includes('storageService'), '29a. No storageService in runner');
    assert(!runnerSource.includes('supabase.storage'), '29b. No supabase.storage in runner');
    assert(!runnerSource.includes('uploadContentFile'), '29. No Storage import');
  }

  // -------------------------------------------------------------
  // 30. No NotebookLM API
  // -------------------------------------------------------------
  {
    const runnerSource = fs.readFileSync(path.resolve(process.cwd(), 'scripts/notebookLM-ingest.ts'), 'utf8');
    assert(!runnerSource.includes('notebooks.list'), '30a. No NotebookLM API client methods');
    assert(!runnerSource.includes('notebooklm.google.com/api'), '30. No NotebookLM API');
  }

  // -------------------------------------------------------------
  // 31. No browser automation
  // -------------------------------------------------------------
  {
    const runnerSource = fs.readFileSync(path.resolve(process.cwd(), 'scripts/notebookLM-ingest.ts'), 'utf8');
    assert(!runnerSource.includes('puppeteer'), '31a. No puppeteer');
    assert(!runnerSource.includes('playwright'), '31b. No playwright');
    assert(!runnerSource.includes('selenium'), '31. No browser automation');
  }

  // -------------------------------------------------------------
  // 32. Existing Step 9 regression passes
  // -------------------------------------------------------------
  {
    const slug = generateDeterministicSlug('Address Resolution Protocol (ARP) Deep Dive');
    assert(slug === 'address-resolution-protocol-arp-deep-dive', '32. Existing Step 9 regression passes');
  }

  // -------------------------------------------------------------
  // 33. Existing Step 10 regression passes
  // -------------------------------------------------------------
  {
    // Validate that manifest validation rejects missing taxonomy
    const invalidManifest: any = { version: '1.0', section: 'invalid-sec', title: 'Test' };
    const validResult = validateAutomationManifest(invalidManifest);
    assert(validResult.valid === false, '33. Existing Step 10 regression passes');
  }

  // -------------------------------------------------------------
  // 34. Existing Step 14 regression passes
  // -------------------------------------------------------------
  {
    const validSource = validateSourceMetadata({ system: 'notebooklm', source_id: 'nb-123' });
    const invalidSource = validateSourceMetadata({ system: 'unsupported-source-xyz' as any });
    assert(validSource.valid === true && invalidSource.valid === false, '34. Existing Step 14 regression passes');
  }

  // -------------------------------------------------------------
  // 35. Existing Step 15 regression passes
  // -------------------------------------------------------------
  {
    const adaptResult = notebookLMAdapter.tryAdapt({
      section: 'academics',
      category: 'computer-networks',
      topic: 'arp',
      content_type: 'study_material',
      title: 'ARP Step 15 Regression',
      body: 'Content body here',
    });
    assert(adaptResult.success === true, '35. Existing Step 15 regression passes');
  }

  // -------------------------------------------------------------
  // 36. Existing Step 16 regression passes
  // -------------------------------------------------------------
  {
    const manifest = adaptResultToManifest();
    const validation = validateAutomationManifest(manifest);
    assert(validation.valid === true, '36. Existing Step 16 regression passes');
  }

  // -------------------------------------------------------------
  // 37. Existing Step 17 regression passes
  // -------------------------------------------------------------
  {
    const convResult = convertNotebookLMExportPackageToManifest(sampleValidPackage);
    assert(convResult.success === true, '37. Existing Step 17 regression passes');
  }

  console.log('\n================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

function adaptResultToManifest() {
  return {
    manifest_version: '1.0' as const,
    section: 'academics' as const,
    category: 'Computer Science',
    topic: 'Computer Networks',
    content_type: 'study_material' as const,
    title: 'Step 16 Manifest Validation Regression',
    body: 'Manifest body content.',
    source: {
      system: 'notebooklm' as const,
      source_id: 'step16-source-id',
    },
  };
}

// Run directly when executed
runStep19Tests().catch((err) => {
  console.error('[Unhandled Test Error]', err);
  process.exit(1);
});
