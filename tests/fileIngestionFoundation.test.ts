/**
 * Comprehensive Automated Tests for Step 11: File Ingestion Foundation
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Unified Content Model & Storage Abstraction
 * 
 * Tests Covered:
 * 1. Valid PDF metadata.
 * 2. Valid PPTX metadata.
 * 3. Unsupported extension (e.g., .exe, .sh, .bin).
 * 4. Invalid MIME type (mismatch between extension and declared MIME).
 * 5. Missing file name.
 * 6. Unsafe file path (traversal attempts like ../ or leading slashes).
 * 7. Invalid manifest with file metadata.
 * 8. File upload failure (ensures content record is NOT created).
 * 9. Database insertion failure (triggers safe rollback cleanup).
 * 10. Cleanup behavior (uploaded file removed on DB failure, no unrelated files deleted).
 * 11. Public/private visibility handling (only published + public exposes public URLs).
 * 12. Draft content protection (draft content files are NOT publicly accessible).
 * 
 * SAFETY MANDATE:
 * Uses isolated in-memory test mocks. Zero network calls or production mutations.
 */

import {
  validateFileMetadata,
  validateStoragePath,
  generateDeterministicStoragePath,
  sanitizeFileName,
  getFileUrl,
  uploadFile,
  deleteFile,
  getStorageBucketName,
  getMaxFileSizeBytes,
  DEFAULT_STORAGE_BUCKET,
} from '../src/services/storageService';
import { ingestContent } from '../src/services/contentIngestionService';
import { validateContentManifest } from '../src/services/manifestService';
import { ContentManifest } from '../src/types/manifest';

// In-memory mock database fixture
function createMockSupabaseClient() {
  const db: {
    content: any[];
    tags: any[];
    content_tags: any[];
    content_relationships: any[];
  } = {
    content: [],
    tags: [],
    content_tags: [],
    content_relationships: [],
  };

  return {
    _db: db,
    from(tableName: 'content' | 'tags' | 'content_tags' | 'content_relationships') {
      const table = db[tableName];
      let currentFilter: (row: any) => boolean = () => true;

      const builder: any = {
        select: (_cols?: string) => builder,
        eq: (field: string, val: any) => {
          const prev = currentFilter;
          currentFilter = (r: any) => prev(r) && r[field] === val;
          return builder;
        },
        ilike: (field: string, val: any) => {
          const prev = currentFilter;
          currentFilter = (r: any) => prev(r) && String(r[field]).toLowerCase() === String(val).toLowerCase();
          return builder;
        },
        maybeSingle: async () => {
          const matching = table.filter(currentFilter);
          return { data: matching[0] || null, error: null };
        },
        single: async () => {
          const matching = table.filter(currentFilter);
          if (matching.length === 0) {
            return { data: null, error: { message: 'Not found', code: 'PGRST116' } };
          }
          return { data: matching[0], error: null };
        },
        insert: (payload: any) => {
          return {
            select: () => ({
              single: async () => {
                const record = {
                  id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...payload,
                };
                table.push(record);
                return { data: record, error: null };
              },
            }),
            then: (resolve: any) => {
              const records = Array.isArray(payload) ? payload : [payload];
              for (const r of records) {
                table.push({
                  id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...r,
                });
              }
              resolve({ data: records, error: null });
            },
          };
        },
      };

      return builder;
    },
  };
}

async function runStep11Tests() {
  console.log('=== RUNNING STEP 11 FILE INGESTION FOUNDATION TESTS ===\n');
  const results: Record<string, boolean> = {};

  // --------------------------------------------------------------------------
  // TEST 1: Valid PDF metadata
  // --------------------------------------------------------------------------
  try {
    const res = validateFileMetadata({
      file_name: 'arp-lecture-notes.pdf',
      file_type: 'application/pdf',
      file_size: 1024 * 100, // 100 KB
    });

    results['1. Valid PDF metadata'] =
      res.valid === true &&
      res.errors.length === 0 &&
      res.detectedExtension === 'pdf' &&
      res.sanitizedFileName === 'arp-lecture-notes.pdf';
  } catch {
    results['1. Valid PDF metadata'] = false;
  }

  // --------------------------------------------------------------------------
  // TEST 2: Valid PPTX metadata
  // --------------------------------------------------------------------------
  try {
    const res = validateFileMetadata({
      file_name: 'computer_networks_ch2_presentation.pptx',
      file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      file_size: 1024 * 1024 * 5, // 5 MB
    });

    results['2. Valid PPTX metadata'] =
      res.valid === true &&
      res.errors.length === 0 &&
      res.detectedExtension === 'pptx' &&
      res.sanitizedFileName === 'computer_networks_ch2_presentation.pptx';
  } catch {
    results['2. Valid PPTX metadata'] = false;
  }

  // --------------------------------------------------------------------------
  // TEST 3: Unsupported extension (.exe, .sh, etc.)
  // --------------------------------------------------------------------------
  try {
    const resExe = validateFileMetadata({
      file_name: 'malicious-payload.exe',
      file_type: 'application/x-msdownload',
    });

    const resSh = validateFileMetadata({
      file_name: 'deploy_script.sh',
    });

    results['3. Unsupported extension'] =
      resExe.valid === false &&
      resExe.errors.some((e) => e.includes('Unsupported file extension ".exe"')) &&
      resSh.valid === false &&
      resSh.errors.some((e) => e.includes('Unsupported file extension ".sh"'));
  } catch {
    results['3. Unsupported extension'] = false;
  }

  // --------------------------------------------------------------------------
  // TEST 4: Invalid MIME type (extension / MIME mismatch)
  // --------------------------------------------------------------------------
  try {
    const res = validateFileMetadata({
      file_name: 'lecture-notes.pdf',
      file_type: 'image/jpeg', // Mismatched MIME type for a PDF
    });

    results['4. Invalid MIME type'] =
      res.valid === false &&
      res.errors.some((e) => e.includes('Invalid MIME type "image/jpeg" for file extension ".pdf"'));
  } catch {
    results['4. Invalid MIME type'] = false;
  }

  // --------------------------------------------------------------------------
  // TEST 5: Missing file name
  // --------------------------------------------------------------------------
  try {
    const resMissing = validateFileMetadata({
      file_type: 'application/pdf',
      file_size: 500,
    });

    const resEmpty = validateFileMetadata({
      file_name: '   ',
      file_type: 'application/pdf',
    });

    results['5. Missing file name'] =
      resMissing.valid === false &&
      resMissing.errors.some((e) => e.includes('Missing required field: "file_name"')) &&
      resEmpty.valid === false &&
      resEmpty.errors.some((e) => e.includes('cannot be empty'));
  } catch {
    results['5. Missing file name'] = false;
  }

  // --------------------------------------------------------------------------
  // TEST 6: Unsafe file path (traversal attempts & root escapes)
  // --------------------------------------------------------------------------
  try {
    const traversalCheck1 = validateStoragePath('../etc/passwd');
    const traversalCheck2 = validateStoragePath('/academics/notes.pdf');
    const traversalCheck3 = validateStoragePath('academics/../../passwords.pdf');
    const traversalCheck4 = validateStoragePath('academics/arp/notes.pdf');

    const sanitized1 = sanitizeFileName('../../secret/notes.pdf');
    const sanitized2 = sanitizeFileName('path\\to\\file.pdf');

    results['6. Unsafe file path'] =
      traversalCheck1.valid === false &&
      traversalCheck2.valid === false &&
      traversalCheck3.valid === false &&
      traversalCheck4.valid === true &&
      sanitized1 === 'notes.pdf' &&
      sanitized2 === 'file.pdf';
  } catch {
    results['6. Unsafe file path'] = false;
  }

  // --------------------------------------------------------------------------
  // TEST 7: Invalid manifest with file metadata
  // --------------------------------------------------------------------------
  try {
    const invalidManifest: any = {
      section: 'academics',
      category: 'computer-networks',
      // Missing title and topic
      content_type: 'study_material',
      file_name: 'unsupported.bin',
    };

    const val = validateContentManifest(invalidManifest);

    results['7. Invalid manifest'] =
      val.valid === false &&
      val.errors.some((e) => e.includes('title')) &&
      val.errors.some((e) => e.includes('topic')) &&
      val.errors.some((e) => e.includes('Unsupported file extension ".bin"'));
  } catch {
    results['7. Invalid manifest'] = false;
  }

  // --------------------------------------------------------------------------
  // TEST 8: File upload failure (ensures content record is NOT created)
  // --------------------------------------------------------------------------
  try {
    const mockClient = createMockSupabaseClient();
    const manifest: ContentManifest = {
      section: 'academics',
      category: 'computer-networks',
      topic: 'arp',
      content_type: 'study_material',
      title: 'ARP Frame Format Guide',
      file_name: 'arp-guide.pdf',
    };

    // Storage mock where upload fails
    const mockFailingStorage = {
      uploadFile: async () => ({
        success: false,
        path: null,
        bucket: 'content-files',
        publicUrl: null,
        error: 'Simulated storage network timeout',
      }),
      deleteFile: async () => ({
        success: true,
        path: 'dummy',
        bucket: 'content-files',
      }),
    };

    const res = await ingestContent(manifest, {
      client: mockClient,
      fileResource: {
        data: Buffer.from('mock pdf binary content'),
        fileName: 'arp-guide.pdf',
        fileType: 'application/pdf',
      },
      storageService: mockFailingStorage,
    });

    results['8. File upload failure'] =
      res.success === false &&
      res.fileUploaded === false &&
      res.errors.some((e) => e.includes('Content record was not created')) &&
      mockClient._db.content.length === 0; // Verified: Database remains clean!
  } catch {
    results['8. File upload failure'] = false;
  }

  // --------------------------------------------------------------------------
  // TEST 9: Database insertion failure (triggers safe rollback cleanup)
  // --------------------------------------------------------------------------
  try {
    const mockClient = createMockSupabaseClient();
    // Force DB failure by overriding content.insert to throw an error
    mockClient.from = (tableName: any) => {
      if (tableName === 'content') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: null,
                error: { message: 'Database disk full or constraint violation', code: '54000' },
              }),
            }),
          }),
        };
      }
      return createMockSupabaseClient().from(tableName);
    };

    let cleanedUpPath: string | null = null;
    const mockStorage = {
      uploadFile: async (params: any) => ({
        success: true,
        path: params.path,
        bucket: 'content-files',
        publicUrl: `https://mock-storage.supabase.co/${params.path}`,
      }),
      deleteFile: async (params: any) => {
        cleanedUpPath = params.path;
        return {
          success: true,
          path: params.path,
          bucket: 'content-files',
        };
      },
    };

    const manifest: ContentManifest = {
      section: 'academics',
      category: 'computer-networks',
      topic: 'arp',
      content_type: 'study_material',
      title: 'ARP Troubleshooting Reference',
      file_name: 'arp-ref.pdf',
    };

    const res = await ingestContent(manifest, {
      client: mockClient,
      fileResource: {
        data: Buffer.from('mock pdf binary content'),
        fileName: 'arp-ref.pdf',
        fileType: 'application/pdf',
      },
      storageService: mockStorage,
    });

    results['9. Database insertion failure'] =
      res.success === false &&
      res.fileCleanedUp === true &&
      cleanedUpPath !== null &&
      cleanedUpPath.includes('arp-ref.pdf') &&
      res.errors.some((e) => e.includes('Content insertion failed'));
  } catch {
    results['9. Database insertion failure'] = false;
  }

  // --------------------------------------------------------------------------
  // TEST 10: Cleanup behavior (only deletes the uploaded file, not unrelated files)
  // --------------------------------------------------------------------------
  try {
    const deletedFiles: string[] = [];
    const storageFiles = new Set(['unrelated-existing-book.pdf', 'system-logo.png']);

    const mockStorage = {
      uploadFile: async (params: any) => {
        storageFiles.add(params.path);
        return {
          success: true,
          path: params.path,
          bucket: 'content-files',
          publicUrl: `https://mock.storage/${params.path}`,
        };
      },
      deleteFile: async (params: any) => {
        deletedFiles.push(params.path);
        storageFiles.delete(params.path);
        return { success: true, path: params.path, bucket: 'content-files' };
      },
    };

    // Client that fails on DB insert
    const failingDbClient = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { message: 'Write failed' } }),
          }),
        }),
      }),
    };

    const manifest: ContentManifest = {
      section: 'academics',
      category: 'computer-networks',
      topic: 'arp',
      content_type: 'study_material',
      title: 'ARP Header Deep Dive',
      file_name: 'arp-header.pdf',
    };

    await ingestContent(manifest, {
      client: failingDbClient,
      fileResource: {
        data: Buffer.from('data'),
        fileName: 'arp-header.pdf',
        fileType: 'application/pdf',
      },
      storageService: mockStorage,
    });

    results['10. Cleanup behavior'] =
      deletedFiles.length === 1 &&
      deletedFiles[0].includes('arp-header.pdf') &&
      storageFiles.has('unrelated-existing-book.pdf') &&
      storageFiles.has('system-logo.png');
  } catch {
    results['10. Cleanup behavior'] = false;
  }

  // --------------------------------------------------------------------------
  // TEST 11: Public/private visibility handling
  // --------------------------------------------------------------------------
  try {
    const mockStorageClient = {
      storage: {
        from: (bucket: string) => ({
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/${bucket}/${path}` },
          }),
        }),
      },
    };

    // 1. Published + Public → Accessible
    const publicUrlRes = getFileUrl(
      'academics/computer-networks/arp/study-material/notes.pdf',
      { status: 'published', visibility: 'public' },
      mockStorageClient
    );

    // 2. Published + Registered (Private) → Access Denied
    const registeredRes = getFileUrl(
      'academics/computer-networks/arp/study-material/notes.pdf',
      { status: 'published', visibility: 'registered' },
      mockStorageClient
    );

    // 3. Published + Premium (Private) → Access Denied
    const premiumRes = getFileUrl(
      'academics/computer-networks/arp/study-material/notes.pdf',
      { status: 'published', visibility: 'premium' },
      mockStorageClient
    );

    results['11. Public/private visibility handling'] =
      publicUrlRes.isAccessible === true &&
      typeof publicUrlRes.url === 'string' &&
      registeredRes.isAccessible === false &&
      registeredRes.url === null &&
      registeredRes.reason?.includes('visibility is "registered"') === true &&
      premiumRes.isAccessible === false &&
      premiumRes.url === null &&
      premiumRes.reason?.includes('visibility is "premium"') === true;
  } catch {
    results['11. Public/private visibility handling'] = false;
  }

  // --------------------------------------------------------------------------
  // TEST 12: Draft content protection
  // --------------------------------------------------------------------------
  try {
    const mockStorageClient = {
      storage: {
        from: (bucket: string) => ({
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/${bucket}/${path}` },
          }),
        }),
      },
    };

    // Draft + Public → Protected (not published yet)
    const draftRes = getFileUrl(
      'academics/computer-networks/arp/study-material/draft-notes.pdf',
      { status: 'draft', visibility: 'public' },
      mockStorageClient
    );

    // Archived + Public → Protected
    const archivedRes = getFileUrl(
      'academics/computer-networks/arp/study-material/archived-notes.pdf',
      { status: 'archived', visibility: 'public' },
      mockStorageClient
    );

    results['12. Draft content protection'] =
      draftRes.isAccessible === false &&
      draftRes.url === null &&
      draftRes.reason?.includes('Content is in "draft" status') === true &&
      archivedRes.isAccessible === false &&
      archivedRes.url === null &&
      archivedRes.reason?.includes('Content is in "archived" status') === true;
  } catch {
    results['12. Draft content protection'] = false;
  }

  // --------------------------------------------------------------------------
  // Summary & Evaluation
  // --------------------------------------------------------------------------
  console.log('Results:');
  let allPass = true;
  for (const [name, passed] of Object.entries(results)) {
    console.log(`  ${passed ? '✓ PASS' : '✗ FAIL'}: ${name}`);
    if (!passed) allPass = false;
  }

  console.log(`\nOverall: ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  if (!allPass) {
    process.exit(1);
  }
}

runStep11Tests();
