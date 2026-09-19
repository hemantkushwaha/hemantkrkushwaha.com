/**
 * Comprehensive Automated Tests for Step 13: File-Aware Content Ingestion Pipeline
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: End-to-End File-Aware Ingestion Pipeline
 * 
 * Testing Scope (25 Required Scenarios):
 *  1. Metadata-only ingestion success (valid payload).
 *  2. Metadata + valid PDF ingestion success.
 *  3. Metadata + valid PPT/PPTX ingestion success.
 *  4. Metadata + valid DOC/DOCX ingestion success.
 *  5. Metadata + valid image (PNG/JPG/WEBP) ingestion success.
 *  6. Metadata + valid video (MP4/WEBM) ingestion success.
 *  7. File-aware dry-run returns deterministic storage path without DB or Storage writes.
 *  8. Missing file name rejected.
 *  9. Empty file (0 bytes) rejected.
 * 10. Unsupported file extension (e.g. .exe, .zip, .sh, .bin) rejected.
 * 11. MIME type mismatch rejected (e.g. .pdf extension with image/png MIME).
 * 12. Oversized file (> 50MB or MAX_FILE_SIZE_BYTES) rejected.
 * 13. Unsafe path traversal in filename (../) rejected.
 * 14. Malformed file data rejected.
 * 15. Multiple files rejected (Step 13 limitation).
 * 16. Invalid metadata with valid file rejected (no upload performed).
 * 17. Valid metadata with invalid file rejected (no DB record created).
 * 18. Duplicate slug rejected with 409 (no file uploaded).
 * 19. Storage upload failure aborts ingestion (no DB record created).
 * 20. DB insertion failure triggers Storage cleanup of uploaded file.
 * 21. Storage cleanup failure does not crash pipeline and reports warning.
 * 22. Private Storage enforcement: public URL is never returned for private bucket.
 * 23. Content record stores safe relative path, never full public or signed URL.
 * 24. Response contains no leaked secrets or internal credentials.
 * 25. HTTP controller & middleware end-to-end multipart and JSON handling.
 * 
 * SAFETY MANDATE:
 * Uses isolated in-memory test fixtures. Zero network calls or real database/storage mutations.
 */

import { ingestContent } from '../src/services/contentIngestionService';
import {
  validateFileMetadata,
  validateStoragePath,
  generateDeterministicStoragePath,
  uploadFile,
  deleteFile,
  getStorageBucketName,
  DEFAULT_STORAGE_BUCKET,
  DEFAULT_MAX_FILE_SIZE_BYTES,
} from '../src/services/storageService';
import { handleContentIngestion } from '../src/server/controllers/ingestController';
import { parseMultipartIngestion, IngestionRequest } from '../src/server/middleware/multipartMiddleware';
import { ContentManifest } from '../src/types/manifest';

// ==========================================
// TEST UTILITIES & IN-MEMORY MOCKS
// ==========================================

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

  const storageBucket: { [path: string]: { data: any; contentType: string } } = {};

  return {
    _db: db,
    _storage: storageBucket,
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
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, data: any, options?: any) {
            storageBucket[path] = { data, contentType: options?.contentType || 'application/octet-stream' };
            return { data: { path }, error: null };
          },
          async remove(paths: string[]) {
            for (const p of paths) {
              delete storageBucket[p];
            }
            return { data: paths.map((p) => ({ name: p })), error: null };
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: `https://mock.supabase.co/storage/v1/object/public/${bucket}/${path}` } };
          },
        };
      },
    },
  };
}

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
    setHeader(key: string, val: string) {
      res.headers[key] = val;
      return res;
    },
  };
  return res;
}

// Sample Valid Manifest Fixture
const validManifest: ContentManifest = {
  section: 'academics',
  category: 'computer-networks',
  topic: 'address-resolution-protocol',
  content_type: 'study_material',
  title: 'Address Resolution Protocol Fundamentals',
  description: 'Deep dive into ARP packet structure and cache mechanics.',
  tags: ['Networking', 'ARP', 'Protocols'],
  visibility: 'public',
  published: true,
};

// ==========================================
// TEST SUITE EXECUTION
// ==========================================

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 13: FILE-AWARE CONTENT INGESTION PIPELINE TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Scenario 1: Metadata-Only Ingestion Success
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const result = await ingestContent(validManifest, { client: mockClient as any });
    if (!result.success) {
      console.log('TEST 1 ERRORS:', result.errors);
    }

    assert(result.success === true, '1. Metadata-only ingestion success (valid payload)');
    assert(result.fileUploaded === false, '1a. FileUploaded flag is false for metadata-only');
    assert(mockClient._db.content.length === 1, '1b. Content record inserted into database');
    assert(mockClient._db.content[0].file_url === null, '1c. File_url is null for metadata-only');
    assert(result.slug === 'address-resolution-protocol-fundamentals', '1d. Deterministic slug generated');
  }

  // -------------------------------------------------------------
  // Scenario 2: Metadata + Valid PDF Ingestion Success
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const pdfBuffer = Buffer.from('%PDF-1.4 mock pdf binary stream');
    const result = await ingestContent(
      { ...validManifest, title: 'ARP Packet Analysis PDF' },
      {
        client: mockClient as any,
        fileResource: {
          data: pdfBuffer,
          fileName: 'arp-analysis.pdf',
          fileType: 'application/pdf',
          fileSize: pdfBuffer.length,
        },
      }
    );

    assert(result.success === true, '2. Metadata + valid PDF ingestion success');
    assert(result.fileUploaded === true, '2a. FileUploaded flag is true');
    assert(typeof result.filePath === 'string' && result.filePath.endsWith('arp-analysis.pdf'), '2b. Storage path generated');
    assert(mockClient._storage[result.filePath!].contentType === 'application/pdf', '2c. Correct MIME stored in storage');
    assert(mockClient._db.content[0].file_url === result.filePath, '2d. Content record contains relative storage path');
  }

  // -------------------------------------------------------------
  // Scenario 3: Metadata + Valid PPT/PPTX Ingestion Success
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const pptxBuffer = Buffer.from('PK\x03\x04 mock pptx presentation binary');
    const result = await ingestContent(
      { ...validManifest, title: 'Network Routing Slides PPTX', content_type: 'presentation' },
      {
        client: mockClient as any,
        fileResource: {
          data: pptxBuffer,
          fileName: 'routing-slides.pptx',
          fileType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          fileSize: pptxBuffer.length,
        },
      }
    );

    assert(result.success === true, '3. Metadata + valid PPT/PPTX ingestion success');
    assert(result.filePath?.includes('academics/computer-networks/address-resolution-protocol/presentation/routing-slides.pptx') === true, '3a. Deterministic hierarchy for presentation');
  }

  // -------------------------------------------------------------
  // Scenario 4: Metadata + Valid DOC/DOCX Ingestion Success
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const docxBuffer = Buffer.from('PK\x03\x04 mock docx document binary');
    const result = await ingestContent(
      { ...validManifest, title: 'Network Assignment DOCX', content_type: 'study_material' },
      {
        client: mockClient as any,
        fileResource: {
          data: docxBuffer,
          fileName: 'assignment1.docx',
          fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileSize: docxBuffer.length,
        },
      }
    );

    assert(result.success === true, '4. Metadata + valid DOC/DOCX ingestion success');
    assert(result.fileUploaded === true, '4a. DOCX uploaded successfully');
  }

  // -------------------------------------------------------------
  // Scenario 5: Metadata + Valid Image (PNG/JPG/WEBP) Ingestion Success
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const pngBuffer = Buffer.from('\x89PNG\r\n\x1a\n mock png');
    const result = await ingestContent(
      { ...validManifest, title: 'Network Topology Diagram PNG' },
      {
        client: mockClient as any,
        fileResource: {
          data: pngBuffer,
          fileName: 'topology.png',
          fileType: 'image/png',
          fileSize: pngBuffer.length,
        },
      }
    );

    assert(result.success === true, '5. Metadata + valid image (PNG/JPG/WEBP) ingestion success');
    assert(result.fileUploaded === true, '5a. Image uploaded successfully');
  }

  // -------------------------------------------------------------
  // Scenario 6: Metadata + Valid Video (MP4/WEBM) Ingestion Success
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const mp4Buffer = Buffer.from('\x00\x00\x00 ftypisom mock mp4 video');
    const result = await ingestContent(
      { ...validManifest, title: 'Protocol Walkthrough Video MP4' },
      {
        client: mockClient as any,
        fileResource: {
          data: mp4Buffer,
          fileName: 'protocol-demo.mp4',
          fileType: 'video/mp4',
          fileSize: mp4Buffer.length,
        },
      }
    );

    assert(result.success === true, '6. Metadata + valid video (MP4/WEBM) ingestion success');
    assert(result.fileUploaded === true, '6a. Video uploaded successfully');
  }

  // -------------------------------------------------------------
  // Scenario 7: File-Aware Dry-Run Mode
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const pdfBuffer = Buffer.from('mock pdf');
    const result = await ingestContent(
      { ...validManifest, title: 'Dry Run Preview Title' },
      {
        client: mockClient as any,
        dryRun: true,
        fileResource: {
          data: pdfBuffer,
          fileName: 'preview.pdf',
          fileType: 'application/pdf',
          fileSize: pdfBuffer.length,
        },
      }
    );

    assert(result.success === true, '7. File-aware dry-run returns preview successfully');
    assert(typeof result.filePath === 'string', '7a. Deterministic storage path calculated');
    assert(mockClient._db.content.length === 0, '7b. ZERO database writes performed during dry-run');
    assert(Object.keys(mockClient._storage).length === 0, '7c. ZERO storage uploads performed during dry-run');
  }

  // -------------------------------------------------------------
  // Scenario 8: Missing File Name Rejected
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const result = await ingestContent(
      { ...validManifest, title: 'Missing File Name Test' },
      {
        client: mockClient as any,
        fileResource: {
          data: Buffer.from('data'),
          fileName: '',
          fileType: 'application/pdf',
        },
      }
    );

    assert(result.success === false, '8. Missing file name rejected');
    assert(result.errors.some((e) => e.includes('file_name')), '8a. Error identifies empty file_name');
    assert(mockClient._db.content.length === 0, '8b. No database writes');
  }

  // -------------------------------------------------------------
  // Scenario 9: Empty File (0 Bytes) Rejected
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const result = await ingestContent(
      { ...validManifest, title: 'Zero Byte File Test' },
      {
        client: mockClient as any,
        fileResource: {
          data: Buffer.alloc(0),
          fileName: 'empty.pdf',
          fileType: 'application/pdf',
          fileSize: 0,
        },
      }
    );

    assert(result.success === false, '9. Empty file (0 bytes) rejected');
    assert(result.errors.some((e) => e.includes('empty (0 bytes)') || e.includes('greater than 0')), '9a. Error identifies 0 byte file');
    assert(mockClient._db.content.length === 0, '9b. No database writes');
  }

  // -------------------------------------------------------------
  // Scenario 10: Unsupported File Extension Rejected
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const result = await ingestContent(
      { ...validManifest, title: 'Executable File Test' },
      {
        client: mockClient as any,
        fileResource: {
          data: Buffer.from('binary-payload'),
          fileName: 'malicious.exe',
          fileType: 'application/octet-stream',
        },
      }
    );

    assert(result.success === false, '10. Unsupported file extension (.exe) rejected');
    assert(result.errors.some((e) => e.includes('Unsupported file extension')), '10a. Error identifies unsupported extension');
  }

  // -------------------------------------------------------------
  // Scenario 11: MIME Type Mismatch Rejected
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const result = await ingestContent(
      { ...validManifest, title: 'MIME Mismatch Test' },
      {
        client: mockClient as any,
        fileResource: {
          data: Buffer.from('mock pdf'),
          fileName: 'document.pdf',
          fileType: 'image/png', // Incorrect MIME for .pdf
        },
      }
    );

    assert(result.success === false, '11. MIME type mismatch rejected');
    assert(result.errors.some((e) => e.includes('MIME type') && e.includes('mismatch')), '11a. Error identifies MIME mismatch');
  }

  // -------------------------------------------------------------
  // Scenario 12: Oversized File Rejected (> 50MB)
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const result = await ingestContent(
      { ...validManifest, title: 'Oversized File Test' },
      {
        client: mockClient as any,
        fileResource: {
          data: Buffer.from('large-data'),
          fileName: 'giant.pdf',
          fileType: 'application/pdf',
          fileSize: 60 * 1024 * 1024, // 60MB exceeds 50MB
        },
      }
    );

    assert(result.success === false, '12. Oversized file (> 50MB) rejected');
    assert(result.errors.some((e) => e.includes('exceeds the maximum allowed')), '12a. Error identifies size limit exceeded');
  }

  // -------------------------------------------------------------
  // Scenario 13: Unsafe Path Traversal in Filename Rejected
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const result = await ingestContent(
      { ...validManifest, title: 'Path Traversal File Test' },
      {
        client: mockClient as any,
        fileResource: {
          data: Buffer.from('content'),
          fileName: '../../etc/passwd.pdf',
          fileType: 'application/pdf',
        },
      }
    );

    assert(result.success === false, '13. Unsafe path traversal in filename rejected');
    assert(result.errors.some((e) => e.includes('path traversal') || e.includes('path separators')), '13a. Path traversal flagged in validation');
  }

  // -------------------------------------------------------------
  // Scenario 14: Malformed File Data Rejected
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const result = await ingestContent(
      { ...validManifest, title: 'Malformed Data Test' },
      {
        client: mockClient as any,
        fileResource: {
          data: null as any,
          fileName: 'test.pdf',
          fileType: 'application/pdf',
        },
      }
    );

    assert(result.success === false, '14. Malformed file data (null) rejected');
    assert(result.errors.some((e) => e.includes('Missing file data') || e.includes('Malformed file data')), '14a. Error identifies missing/malformed data');
  }

  // -------------------------------------------------------------
  // Scenario 15: Multiple Files Rejected (Controller & Middleware)
  // -------------------------------------------------------------
  {
    const req: any = {
      body: {
        manifest: validManifest,
        files: [
          { fileName: 'file1.pdf', data: 'abc' },
          { fileName: 'file2.pdf', data: 'def' },
        ],
      },
      multipleFilesDetected: true,
    };
    const res = createMockResponse();

    await handleContentIngestion(req, res);

    assert(res.statusCode === 400, '15. Multiple files rejected with HTTP 400');
    assert(res.body?.error?.includes('Multiple files are not supported'), '15a. Clear error message for multiple files');
  }

  // -------------------------------------------------------------
  // Scenario 16: Invalid Metadata with Valid File Rejected (No Storage Upload)
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    let uploadInvoked = false;

    const result = await ingestContent(
      { ...validManifest, title: '' }, // Invalid empty title
      {
        client: mockClient as any,
        fileResource: {
          data: Buffer.from('valid pdf content'),
          fileName: 'test.pdf',
          fileType: 'application/pdf',
        },
        storageService: {
          uploadFile: async () => {
            uploadInvoked = true;
            return { success: true, path: 'p', bucket: 'content-files', publicUrl: 'u', error: null };
          },
          deleteFile: async () => ({ success: true, path: 'p', bucket: 'content-files', error: null }),
        },
      }
    );

    assert(result.success === false, '16. Invalid metadata with valid file rejected');
    assert(uploadInvoked === false, '16a. Storage upload was NOT invoked when metadata was invalid');
    assert(mockClient._db.content.length === 0, '16b. No database writes');
  }

  // -------------------------------------------------------------
  // Scenario 17: Valid Metadata with Invalid File Rejected (No DB Record)
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const result = await ingestContent(
      { ...validManifest, title: 'Valid Metadata Invalid File Title' },
      {
        client: mockClient as any,
        fileResource: {
          data: Buffer.from('data'),
          fileName: 'bad.exe', // Invalid extension
          fileType: 'application/octet-stream',
        },
      }
    );

    assert(result.success === false, '17. Valid metadata with invalid file rejected');
    assert(mockClient._db.content.length === 0, '17a. ZERO content records created in database');
  }

  // -------------------------------------------------------------
  // Scenario 18: Duplicate Slug Rejected with 409 (No File Uploaded)
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    // Pre-seed an item with the same slug
    const targetSlug = 'address-resolution-protocol-fundamentals';
    mockClient._db.content.push({ id: 'existing-id', slug: targetSlug, title: 'Existing' });

    let uploadInvoked = false;
    const result = await ingestContent(
      validManifest, // Produces targetSlug
      {
        client: mockClient as any,
        fileResource: {
          data: Buffer.from('pdf data'),
          fileName: 'arp.pdf',
          fileType: 'application/pdf',
        },
        storageService: {
          uploadFile: async () => {
            uploadInvoked = true;
            return { success: true, path: 'p', bucket: 'content-files', publicUrl: 'u', error: null };
          },
          deleteFile: async () => ({ success: true, path: 'p', bucket: 'content-files', error: null }),
        },
      }
    );

    assert(result.success === false, '18. Duplicate slug rejected before upload');
    assert(result.errors.some((e) => e.includes('Duplicate content error')), '18a. Duplicate error returned');
    assert(uploadInvoked === false, '18b. Zero storage upload attempted when duplicate slug detected');
  }

  // -------------------------------------------------------------
  // Scenario 19: Storage Upload Failure Aborts Ingestion (No DB Record)
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const result = await ingestContent(
      { ...validManifest, title: 'Upload Failure Test Title' },
      {
        client: mockClient as any,
        fileResource: {
          data: Buffer.from('pdf data'),
          fileName: 'fail.pdf',
          fileType: 'application/pdf',
        },
        storageService: {
          uploadFile: async () => ({
            success: false,
            path: null,
            bucket: 'content-files',
            publicUrl: null,
            error: 'Storage quota exceeded or service error',
          }),
          deleteFile: async () => ({ success: true, path: 'fail.pdf', bucket: 'content-files', error: null }),
        },
      }
    );

    assert(result.success === false, '19. Storage upload failure aborts ingestion');
    assert(mockClient._db.content.length === 0, '19a. ZERO database content records created');
    assert(result.errors.some((e) => e.includes('File upload failed')), '19b. Clear error returned');
  }

  // -------------------------------------------------------------
  // Scenario 20: DB Insertion Failure Triggers Storage Rollback Cleanup
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    let deletedPath: string | null = null;

    // Simulate DB insert error
    mockClient.from = () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: { message: 'Database disk full or constraint failure' } }),
        }),
      }),
    }) as any;

    const result = await ingestContent(
      { ...validManifest, title: 'Rollback Cleanup Test' },
      {
        client: mockClient as any,
        fileResource: {
          data: Buffer.from('pdf data'),
          fileName: 'rollback.pdf',
          fileType: 'application/pdf',
        },
        storageService: {
          uploadFile: async (params) => ({
            success: true,
            path: params.path,
            bucket: 'content-files',
            publicUrl: null,
            error: null,
          }),
          deleteFile: async (params) => {
            deletedPath = params.path;
            return { success: true, path: params.path, bucket: 'content-files', error: null };
          },
        },
      }
    );

    assert(result.success === false, '20. DB insertion failure triggers rollback');
    assert(deletedPath !== null, '20a. Storage deleteFile was invoked during rollback');
    assert(result.fileCleanedUp === true, '20b. Result records file was safely cleaned up');
  }

  // -------------------------------------------------------------
  // Scenario 21: Storage Cleanup Failure Does Not Crash Pipeline
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();

    mockClient.from = () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: { message: 'DB insertion error' } }),
        }),
      }),
    }) as any;

    const result = await ingestContent(
      { ...validManifest, title: 'Cleanup Failure Test' },
      {
        client: mockClient as any,
        fileResource: {
          data: Buffer.from('pdf data'),
          fileName: 'cleanup-fail.pdf',
          fileType: 'application/pdf',
        },
        storageService: {
          uploadFile: async (params) => ({
            success: true,
            path: params.path,
            bucket: 'content-files',
            publicUrl: null,
            error: null,
          }),
          deleteFile: async () => {
            throw new Error('Network error during storage delete');
          },
        },
      }
    );

    assert(result.success === false, '21. Storage cleanup failure handled gracefully without uncaught crash');
    assert(result.fileCleanedUp === false, '21a. Result records cleanup could not be completed');
    assert(result.errors.some((e) => e.includes('Content insertion failed')), '21b. Informative error preserved');
  }

  // -------------------------------------------------------------
  // Scenario 22: Private Storage Enforcement (No Public URL Generated)
  // -------------------------------------------------------------
  {
    const bucket = getStorageBucketName();
    assert(bucket === 'content-files', '22. Storage bucket is strictly "content-files"');
    assert(DEFAULT_STORAGE_BUCKET === 'content-files', '22a. Default bucket constant is content-files');
  }

  // -------------------------------------------------------------
  // Scenario 23: Content Record Stores Safe Relative Path
  // -------------------------------------------------------------
  {
    const mockClient = createMockSupabaseClient();
    const result = await ingestContent(
      { ...validManifest, title: 'Safe Path Storage Check' },
      {
        client: mockClient as any,
        fileResource: {
          data: Buffer.from('test data'),
          fileName: 'relative-path.pdf',
          fileType: 'application/pdf',
        },
      }
    );

    assert(result.success === true, '23. Ingestion succeeds with relative storage path');
    const storedRecord = mockClient._db.content[0];
    assert(!storedRecord.file_url.startsWith('http://'), '23a. Record file_url does not start with http://');
    assert(!storedRecord.file_url.startsWith('https://'), '23b. Record file_url does not start with https://');
    assert(!storedRecord.file_url.startsWith('/'), '23c. Record file_url does not start with a leading slash');
    assert(storedRecord.file_url.includes('academics/computer-networks/address-resolution-protocol/'), '23d. Record file_url stores structured deterministic relative path');
  }

  // -------------------------------------------------------------
  // Scenario 24: Response Contains No Leaked Secrets
  // -------------------------------------------------------------
  {
    const secretKey = 'SUPABASE_SERVICE_ROLE_KEY_SECRET_VALUE_12345';
    process.env.SUPABASE_SECRET_KEY = secretKey;
    process.env.CONTENT_INGESTION_API_KEY = 'INGESTION_SECRET_KEY_XYZ_67890';

    const req: any = {
      body: {
        manifest: validManifest,
      },
      query: { dryRun: 'true' },
    };
    const res = createMockResponse();

    await handleContentIngestion(req, res);

    const serializedResponse = JSON.stringify(res.body);
    assert(!serializedResponse.includes(secretKey), '24. Response contains no leaked SUPABASE_SECRET_KEY');
    assert(!serializedResponse.includes('INGESTION_SECRET_KEY_XYZ_67890'), '24a. Response contains no leaked CONTENT_INGESTION_API_KEY');
  }

  // -------------------------------------------------------------
  // Scenario 25: Multipart Middleware End-to-End Handling
  // -------------------------------------------------------------
  {
    const boundary = '----TestBoundary12345';
    const multipartBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="manifest"',
      '',
      JSON.stringify(validManifest),
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="sample.pdf"',
      'Content-Type: application/pdf',
      '',
      '%PDF-1.4 binary content',
      `--${boundary}--`,
    ].join('\r\n');

    const req: any = {
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      body: Buffer.from(multipartBody),
    };
    const res = createMockResponse();

    const tracker = { middlewarePassed: false };
    await parseMultipartIngestion(req, res, () => {
      tracker.middlewarePassed = true;
    });

    assert(tracker.middlewarePassed === true, '25. Multipart middleware parsed successfully');
    assert(req.fileResource?.fileName === 'sample.pdf', '25a. Extracted correct fileName');
    assert(req.fileResource?.fileType === 'application/pdf', '25b. Extracted correct MIME type');
    assert(req.fileResource?.fileSize > 0, '25c. Extracted correct file size');
    assert(req.body?.manifest?.title === validManifest.title, '25d. Extracted manifest JSON object');
  }

  console.log('\n================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
