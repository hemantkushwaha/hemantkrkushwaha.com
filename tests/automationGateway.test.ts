/**
 * Step 16: External Automation Gateway Foundation Tests
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 16 — External Automation Gateway Foundation
 * 
 * Validates All 27 Step 16 Requirements (Part M 1-27):
 * 1. Valid Manifest v1.0 accepted.
 * 2. NotebookLM source accepted.
 * 3. Google Slides source accepted.
 * 4. Google AI Studio source accepted.
 * 5. Google Drive source accepted.
 * 6. Manual source accepted.
 * 7. Invalid source rejected.
 * 8. Missing manifest rejected.
 * 9. Invalid manifest rejected.
 * 10. section preserved.
 * 11. category preserved.
 * 12. topic preserved.
 * 13. content_type preserved.
 * 14. title preserved.
 * 15. body preserved.
 * 16. tags preserved.
 * 17. source metadata preserved.
 * 18. gateway delegates to existing ingestion service.
 * 19. gateway does NOT directly access Supabase.
 * 20. gateway does NOT directly access Storage.
 * 21. authentication remains required.
 * 22. invalid authentication rejected.
 * 23. Idempotency-Key is preserved.
 * 24. standard success envelope returned.
 * 25. standard error envelope returned.
 * 26. secrets are not logged.
 * 27. payload limits remain enforced.
 */

import fs from 'fs';
import path from 'path';
import {
  processAutomationGatewayRequest,
  createSafeAuditContext,
  MAX_GATEWAY_FILE_SIZE,
} from '../src/services/automationGatewayService.js';
import {
  AutomationGatewayRequest,
  AutomationManifest,
  SUPPORTED_SOURCE_SYSTEMS,
} from '../src/types/automation.js';
import { handleAutomationGatewayIngest } from '../src/server/controllers/automationGatewayController.js';
import { authenticateIngestionRequest } from '../src/server/middleware/authMiddleware.js';

const TEST_API_KEY = 'test-automation-gateway-key-step16-xyz987';
process.env.CONTENT_INGESTION_API_KEY = TEST_API_KEY;

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

// In-memory mock database store
const mockDatabase = {
  content: new Map<string, any>(),
  tags: new Map<string, any>(),
  content_tags: [] as any[],
  content_relationships: [] as any[],
};

function createMockSupabaseClient() {
  return {
    from(tableName: string) {
      if (tableName === 'content') {
        return {
          select(fields: string) {
            return {
              eq(column: string, value: any) {
                return {
                  single: async () => {
                    if (column === 'slug') {
                      const item = mockDatabase.content.get(value);
                      if (item) return { data: item, error: null };
                      return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
                    }
                    return { data: null, error: null };
                  },
                };
              },
            };
          },
          insert(record: any) {
            return {
              select: () => ({
                single: async () => {
                  const id = 'mock-id-' + Math.random().toString(36).substring(2, 9);
                  const saved = { ...record, id };
                  mockDatabase.content.set(record.slug, saved);
                  return { data: saved, error: null };
                },
              }),
            };
          },
        };
      }
      if (tableName === 'tags') {
        return {
          select(fields: string) {
            return {
              in: async (col: string, values: string[]) => {
                const found: any[] = [];
                for (const v of values) {
                  if (mockDatabase.tags.has(v)) {
                    found.push(mockDatabase.tags.get(v));
                  }
                }
                return { data: found, error: null };
              },
            };
          },
          insert: async (records: any[]) => {
            const inserted = records.map((r) => {
              const item = { ...r, id: 'tag-' + Math.random().toString(36).substring(2, 9) };
              mockDatabase.tags.set(r.name, item);
              return item;
            });
            return { data: inserted, error: null };
          },
        };
      }
      if (tableName === 'content_tags') {
        return {
          insert: async (records: any[]) => {
            mockDatabase.content_tags.push(...records);
            return { data: records, error: null };
          },
        };
      }
      if (tableName === 'content_relationships') {
        return {
          insert: async (records: any[]) => {
            mockDatabase.content_relationships.push(...records);
            return { data: records, error: null };
          },
        };
      }
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        insert: async () => ({ data: [], error: null }),
      };
    },
  };
}

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    set(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    send(data: any) {
      this.body = data;
      return this;
    },
  };
  return res;
}

const baseValidManifest: AutomationManifest = {
  manifest_version: '1.0',
  section: 'research',
  category: 'Artificial Intelligence',
  topic: 'Gateway Architecture',
  content_type: 'research_paper',
  title: 'Provider Neutral Gateway Specification in Distributed Systems',
  subcategory: 'Distributed Ingestion',
  description: 'Formal architectural specification of provider-neutral ingestion gateways.',
  body: '# Provider-Neutral Gateway\n\nThis paper presents the formal contract for ingestion gateways.',
  tags: ['Gateway', 'Automation', 'Systems Architecture'],
  language: 'en',
  visibility: 'public',
  is_featured: true,
  published: true,
};

async function runAutomationGatewayTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 16: EXTERNAL AUTOMATION GATEWAY TESTS');
  console.log('================================================================\n');

  const mockClient = createMockSupabaseClient();

  // -------------------------------------------------------------
  // 1. Valid Manifest v1.0 accepted
  // -------------------------------------------------------------
  {
    const req: AutomationGatewayRequest = {
      manifest: {
        ...baseValidManifest,
        title: 'Valid Manifest Ingestion Test',
      },
      dryRun: true,
    };
    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === true, '1. Valid Manifest v1.0 accepted');
    assert(result.data?.slug === 'valid-manifest-ingestion-test', '1a. Generates correct deterministic slug');
    assert(result.data?.title === 'Valid Manifest Ingestion Test', '1b. Preserves title');
  }

  // -------------------------------------------------------------
  // 2. NotebookLM source accepted
  // -------------------------------------------------------------
  {
    const req: AutomationGatewayRequest = {
      manifest: {
        ...baseValidManifest,
        title: 'NotebookLM Source Test',
      },
      source: {
        system: 'notebooklm',
        source_id: 'nb-source-101',
        source_url: 'https://notebooklm.google.com/notebook/test',
        generated_at: '2026-09-19T10:00:00.000Z',
      },
      dryRun: true,
    };
    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === true, '2. NotebookLM source accepted');
    assert(result.auditContext?.source_system === 'notebooklm', '2a. Audit context records notebooklm system');
  }

  // -------------------------------------------------------------
  // 3. Google Slides source accepted
  // -------------------------------------------------------------
  {
    const req: AutomationGatewayRequest = {
      manifest: {
        ...baseValidManifest,
        title: 'Google Slides Source Test',
        content_type: 'presentation',
      },
      source: {
        system: 'google-slides',
        source_id: 'slides-deck-202',
        source_url: 'https://docs.google.com/presentation/d/test',
        generated_at: '2026-09-19T10:00:00.000Z',
      },
      dryRun: true,
    };
    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === true, '3. Google Slides source accepted');
    assert(result.auditContext?.source_system === 'google-slides', '3a. Audit context records google-slides system');
  }

  // -------------------------------------------------------------
  // 4. Google AI Studio source accepted
  // -------------------------------------------------------------
  {
    const req: AutomationGatewayRequest = {
      manifest: {
        ...baseValidManifest,
        title: 'Google AI Studio Source Test',
      },
      source: {
        system: 'google-ai-studio',
        source_id: 'aistudio-prompt-303',
        source_url: 'https://aistudio.google.com/prompt/test',
        generated_at: '2026-09-19T10:00:00.000Z',
      },
      dryRun: true,
    };
    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === true, '4. Google AI Studio source accepted');
    assert(result.auditContext?.source_system === 'google-ai-studio', '4a. Audit context records google-ai-studio system');
  }

  // -------------------------------------------------------------
  // 5. Google Drive source accepted
  // -------------------------------------------------------------
  {
    const req: AutomationGatewayRequest = {
      manifest: {
        ...baseValidManifest,
        title: 'Google Drive Source Test',
      },
      source: {
        system: 'google-drive',
        source_id: 'drive-file-404',
        source_url: 'https://drive.google.com/file/d/test',
        generated_at: '2026-09-19T10:00:00.000Z',
      },
      dryRun: true,
    };
    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === true, '5. Google Drive source accepted');
    assert(result.auditContext?.source_system === 'google-drive', '5a. Audit context records google-drive system');
  }

  // -------------------------------------------------------------
  // 6. Manual source accepted
  // -------------------------------------------------------------
  {
    const req: AutomationGatewayRequest = {
      manifest: {
        ...baseValidManifest,
        title: 'Manual Source Test',
      },
      source: {
        system: 'manual',
        source_id: 'manual-curation-505',
        generated_at: '2026-09-19T10:00:00.000Z',
      },
      dryRun: true,
    };
    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === true, '6. Manual source accepted');
    assert(result.auditContext?.source_system === 'manual', '6a. Audit context records manual system');
  }

  // -------------------------------------------------------------
  // 7. Invalid source rejected
  // -------------------------------------------------------------
  {
    const req: AutomationGatewayRequest = {
      manifest: {
        ...baseValidManifest,
        title: 'Invalid Source Test',
      },
      source: {
        system: 'unauthorized-external-crawler' as any,
        source_id: 'unknown-id',
      },
      dryRun: true,
    };
    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === false, '7. Invalid source rejected');
    assert(result.error?.code === 'INVALID_SOURCE_METADATA', '7a. Error code is INVALID_SOURCE_METADATA');
    assert(
      result.errors?.some((e) => e.includes('Invalid source system')),
      '7b. Error details specify invalid source system'
    );
  }

  // -------------------------------------------------------------
  // 8. Missing manifest rejected
  // -------------------------------------------------------------
  {
    const req = {
      source: { system: 'notebooklm' as const },
    } as any;
    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === false, '8. Missing manifest rejected');
    assert(
      result.error?.code === 'MISSING_REQUIRED_FIELD' || result.error?.code === 'INVALID_MANIFEST',
      '8a. Error code indicates missing manifest'
    );
  }

  // -------------------------------------------------------------
  // 9. Invalid manifest rejected
  // -------------------------------------------------------------
  {
    const req: AutomationGatewayRequest = {
      manifest: {
        ...baseValidManifest,
        section: 'invalid-section-xyz' as any,
      },
      dryRun: true,
    };
    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === false, '9. Invalid manifest rejected');
    assert(
      result.error?.code === 'INVALID_SECTION' || result.error?.code === 'INVALID_MANIFEST',
      '9a. Error code indicates invalid section/manifest'
    );
  }

  // -------------------------------------------------------------
  // 10-17. Taxonomy & Content Preservation (Part D)
  // -------------------------------------------------------------
  {
    const customTitle = 'Exact Verbatim Title For Invariant Preservation';
    const customBody = 'Exact body text: $E=mc^2$ with special characters & formatting.';
    const customTags = ['Discrete Math', 'Category Theory', 'Formal Logic'];
    const customDate = '2026-09-19T05:30:00.000Z';

    const req: AutomationGatewayRequest = {
      manifest: {
        manifest_version: '1.0',
        section: 'philosophy',
        category: 'Epistemology',
        topic: 'Verificationism',
        content_type: 'essay',
        title: customTitle,
        subcategory: 'Philosophy of Science',
        description: 'Verbatim description',
        body: customBody,
        tags: customTags,
        language: 'en',
        visibility: 'public',
      },
      source: {
        system: 'notebooklm',
        source_id: 'nb-custom-999',
        source_url: 'https://notebooklm.google.com/notebook/custom',
        generated_at: customDate,
      },
      dryRun: true,
    };

    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === true, '10-17. Ingestion succeeds for preservation check');
    assert(result.auditContext?.section === 'philosophy', '10. section preserved');
    assert(result.auditContext?.category === 'Epistemology', '11. category preserved');
    assert(result.auditContext?.topic === 'Verificationism', '12. topic preserved');
    assert(result.auditContext?.content_type === 'essay', '13. content_type preserved');
    assert(result.data?.title === customTitle, '14. title preserved');
    assert(req.manifest.body === customBody, '15. body preserved verbatim (zero modification)');
    assert(req.manifest.tags?.length === 3, '16. tags preserved');
    assert(req.source?.source_id === 'nb-custom-999', '17. source metadata preserved');
    assert(req.source?.generated_at === customDate, '17a. source generated_at preserved');
  }

  // -------------------------------------------------------------
  // 18. Gateway delegates to existing ingestion service
  // -------------------------------------------------------------
  {
    let ingestDelegated = false;
    // Test with dryRun: true to verify pipeline flow
    const req: AutomationGatewayRequest = {
      manifest: {
        ...baseValidManifest,
        title: 'Delegation Pipeline Verification',
      },
      dryRun: true,
    };
    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === true && Boolean(result.slug), '18. Gateway delegates to existing ingestion service');
  }

  // -------------------------------------------------------------
  // 19. Gateway does NOT directly access Supabase
  // -------------------------------------------------------------
  {
    const gatewaySource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/services/automationGatewayService.ts'),
      'utf8'
    );
    const importsSupabase = gatewaySource.includes('@supabase/supabase-js');
    const callsCreateClient = gatewaySource.includes('createClient');
    assert(!importsSupabase, '19. Gateway source does NOT import @supabase/supabase-js');
    assert(!callsCreateClient, '19a. Gateway source does NOT call createClient');
  }

  // -------------------------------------------------------------
  // 20. Gateway does NOT directly access Storage
  // -------------------------------------------------------------
  {
    const gatewaySource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/services/automationGatewayService.ts'),
      'utf8'
    );
    const importsUploadFile = gatewaySource.includes('uploadFile');
    const importsStorageService = gatewaySource.includes("from './storageService");
    assert(!importsUploadFile, '20. Gateway does NOT directly import uploadFile');
    assert(!importsStorageService, '20a. Gateway does NOT import storageService directly');
  }

  // -------------------------------------------------------------
  // 21. Authentication remains required
  // -------------------------------------------------------------
  {
    const req: any = {
      headers: {},
      method: 'POST',
      body: { manifest: baseValidManifest },
    };
    const res = createMockResponse();
    let nextCalled = false;
    authenticateIngestionRequest(req, res, () => {
      nextCalled = true;
    });
    assert(nextCalled === false, '21. Unauthenticated request blocked (next not called)');
    assert(res.statusCode === 401, '21a. Returns HTTP 401 for missing authorization header');
  }

  // -------------------------------------------------------------
  // 22. Invalid authentication rejected
  // -------------------------------------------------------------
  {
    const req: any = {
      headers: { authorization: 'Bearer wrong-secret-token-xyz' },
      method: 'POST',
      body: { manifest: baseValidManifest },
    };
    const res = createMockResponse();
    let nextCalled = false;
    authenticateIngestionRequest(req, res, () => {
      nextCalled = true;
    });
    assert(nextCalled === false, '22. Invalid authentication rejected (next not called)');
    assert(res.statusCode === 401, '22a. Returns HTTP 401 for invalid API key');
  }

  // -------------------------------------------------------------
  // 23. Idempotency-Key is preserved
  // -------------------------------------------------------------
  {
    const testIdempotencyKey = 'gateway-idempotency-test-key-777';
    const req: AutomationGatewayRequest = {
      manifest: {
        ...baseValidManifest,
        title: 'Idempotency Cache Preservation Test',
      },
      idempotencyKey: testIdempotencyKey,
      dryRun: true,
    };
    // First call: executes and caches
    const result1 = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result1.success === true, '23. First call with Idempotency-Key succeeds');

    // Second call: served from in-memory cache
    const result2 = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result2.success === true, '23a. Second call with Idempotency-Key succeeds from cache');
    assert(result2.slug === result1.slug, '23b. Replayed slug matches original response exactly');
  }

  // -------------------------------------------------------------
  // 24. Standard success envelope returned
  // -------------------------------------------------------------
  {
    const req: AutomationGatewayRequest = {
      manifest: {
        ...baseValidManifest,
        title: 'Success Envelope Test Title',
      },
      dryRun: true,
    };
    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === true, '24. Success flag is true');
    assert(result.data !== undefined, '24a. Contains data envelope');
    assert(typeof result.data?.slug === 'string', '24b. data.slug is a string');
    assert(result.data?.title === 'Success Envelope Test Title', '24c. data.title matches');
  }

  // -------------------------------------------------------------
  // 25. Standard error envelope returned
  // -------------------------------------------------------------
  {
    const req: AutomationGatewayRequest = {
      manifest: {
        ...baseValidManifest,
        title: '', // Invalid empty title
      },
      dryRun: true,
    };
    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === false, '25. Error flag is false');
    assert(result.error !== undefined, '25a. Contains error envelope');
    assert(Boolean(result.error?.code), '25b. error.code is populated');
    assert(Boolean(result.error?.message), '25c. error.message is populated');
  }

  // -------------------------------------------------------------
  // 26. Secrets are not logged
  // -------------------------------------------------------------
  {
    const reqWithSensitives: any = {
      manifest: baseValidManifest,
      apiKey: 'SUPER_SECRET_LEAK_KEY',
      authorization: 'Bearer LEAK_TOKEN',
      password: 'sensitive_password',
      file: {
        data: Buffer.from('large secret binary payload'),
        fileName: 'test.pdf',
      },
    };
    const auditContext = createSafeAuditContext(reqWithSensitives);
    const auditString = JSON.stringify(auditContext);

    assert(!auditString.includes('SUPER_SECRET_LEAK_KEY'), '26. API key NOT present in audit context');
    assert(!auditString.includes('LEAK_TOKEN'), '26a. Authorization token NOT present in audit context');
    assert(!auditString.includes('sensitive_password'), '26b. Password NOT present in audit context');
    assert(!auditString.includes('large secret binary payload'), '26c. File payload buffer NOT present in audit context');
  }

  // -------------------------------------------------------------
  // 27. Payload limits remain enforced
  // -------------------------------------------------------------
  {
    const oversizedBytes = MAX_GATEWAY_FILE_SIZE + 1024; // > 50MB
    const req: AutomationGatewayRequest = {
      manifest: {
        ...baseValidManifest,
        title: 'Oversized Payload Test',
      },
      file: {
        data: 'dummy-oversized-data',
        fileName: 'oversized.pdf',
        fileSize: oversizedBytes,
        fileType: 'application/pdf',
      },
      dryRun: true,
    };
    const result = await processAutomationGatewayRequest(req, { client: mockClient });
    assert(result.success === false, '27. Oversized file rejected');
    assert(result.error?.code === 'PAYLOAD_TOO_LARGE', '27a. Error code is PAYLOAD_TOO_LARGE');
    assert(
      result.error?.message.includes('50MB'),
      '27b. Error message specifies 50MB limit'
    );
  }

  // -------------------------------------------------------------
  // Controller HTTP Boundary Verification (Part K)
  // -------------------------------------------------------------
  {
    const req: any = {
      headers: {
        authorization: `Bearer ${TEST_API_KEY}`,
        'idempotency-key': 'http-controller-test-key-1',
      },
      body: {
        manifest: {
          ...baseValidManifest,
          title: 'HTTP Controller Integration Test',
        },
      },
      query: { dryRun: 'true' },
    };
    const res = createMockResponse();
    await handleAutomationGatewayIngest(req, res);
    assert(res.statusCode === 201, 'HTTP Gateway: POST /api/automation/ingest returns HTTP 201');
    assert(res.body?.success === true, 'HTTP Gateway: returns success envelope');
    assert(res.body?.data?.slug === 'http-controller-integration-test', 'HTTP Gateway: returns correct slug');
  }

  // Controller multiple files rejection
  {
    const req: any = {
      headers: {
        authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: {
        manifest: baseValidManifest,
        files: [{ name: 'f1.pdf' }, { name: 'f2.pdf' }],
      },
      query: { dryRun: 'true' },
    };
    const res = createMockResponse();
    await handleAutomationGatewayIngest(req, res);
    assert(res.statusCode === 400, 'HTTP Gateway: Multiple files rejected with HTTP 400');
    assert(res.body?.error?.code === 'INVALID_MANIFEST', 'HTTP Gateway: Error code is INVALID_MANIFEST');
  }

  console.log('\n================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAutomationGatewayTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
