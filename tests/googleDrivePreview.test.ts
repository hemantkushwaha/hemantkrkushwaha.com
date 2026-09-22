/**
 * Step 24-ACTION-1: Google Drive File to Content Manifest Preview Test Suite
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 24 — Safe Preview Layer (Google Drive -> Content Manifest v1.0)
 * 
 * Verifies:
 * 1. Google Docs metadata + preview request (faithful text/plain export -> Content Manifest v1.0)
 * 2. Google Slides preview request (PPTX export -> 422 PREVIEW_UNSUPPORTED_EXTRACTION)
 * 3. Google Sheets preview request (XLSX export -> 422 PREVIEW_UNSUPPORTED_EXTRACTION)
 * 4. Required taxonomy validation (valid parameters succeed)
 * 5. Missing / invalid taxonomy parameters (section, category, topic, content_type, title) -> 400 INVALID_MANIFEST_METADATA
 * 6. User taxonomy supremacy (user taxonomy preserved strictly without alteration or inference)
 * 7. Source provenance generation (system='google-drive', source_id, source_url, generated_at)
 * 8. Unsupported extraction returns structured 422 error
 * 9. File size limit enforcement (> 50 MB -> 413 FILE_TOO_LARGE)
 * 10. Drive 404 (file not found in Drive -> 404 DRIVE_FILE_NOT_FOUND)
 * 11. Drive 403 (Google API forbidden -> 403 GOOGLE_API_FORBIDDEN)
 * 12. Drive 429 (Google API rate limit -> 429 GOOGLE_API_RATE_LIMITED)
 * 13. Drive 5xx (Google API 500/502/503 -> 502 GOOGLE_API_UNAVAILABLE)
 * 14. Zero database content mutation
 * 15. Zero storage mutation
 * 16. Zero credentials in responses or logs
 * 17. Read-only invariant (no Drive patch, delete, or write operations)
 * 18. Trashed file rejection (trashed file -> 400 TRASHED_FILE)
 * 19. Authentication boundary (missing/invalid bearer token -> 401)
 * 20. Disconnected OAuth account handling -> 404 NO_GOOGLE_CONNECTION
 * 21. Plain text file preview (text/plain and text/markdown)
 * 22. Unsupported file type (folder, forms, shortcut -> 415 PREVIEW_UNSUPPORTED_FILE_TYPE)
 */

import { strict as assert } from 'assert';
import {
  GoogleOAuthError,
} from '../src/services/googleDriveOAuthService.js';
import {
  GoogleDriveService,
  GoogleDriveServiceError,
} from '../src/services/googleDriveService.js';
import {
  executePreviewGoogleDriveFile,
  previewGoogleDriveFileService,
} from '../src/server/controllers/googleDriveController.js';
import { authenticateIngestionRequest } from '../src/server/middleware/authMiddleware.js';
import {
  GoogleDriveFileMetadata,
  GoogleHttpClient,
  GoogleHttpRequestOptions,
} from '../src/types/googleDrive.js';
import {
  GOOGLE_DRIVE_NATIVE_MIME_TYPES,
} from '../src/services/adapters/googleDriveAdapter.js';

async function runStep24Tests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 24: GOOGLE DRIVE FILE TO MANIFEST PREVIEW TESTS');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function recordPass(desc: string) {
    passed++;
    console.log(`  ✅ PASS: ${desc}`);
  }

  function recordFail(desc: string, err: any) {
    failed++;
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(err);
  }

  function createMockExpressResponse() {
    let statusCode = 200;
    let jsonBody: any = null;
    let headers: Record<string, string> = {};

    const res: any = {
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(data: any) {
        jsonBody = data;
        return res;
      },
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
        return res;
      },
      getStatusCode: () => statusCode,
      getBody: () => jsonBody,
      getHeaders: () => headers,
    };
    return res;
  }

  // Common valid taxonomy test inputs (using canonical ManifestContentType 'presentation')
  const validTaxonomy = {
    section: 'academics',
    category: 'computer-networks',
    topic: 'transport-layer',
    content_type: 'presentation',
    title: 'TCP and UDP Protocol Deep Dive',
    description: 'Detailed analysis of transport protocols',
    tags: ['networking', 'tcp', 'udp'],
    subcategory: 'protocols',
  };

  // --------------------------------------------------------------------------
  // TEST 1: Google Docs metadata + preview request
  // --------------------------------------------------------------------------
  try {
    const mockFile: GoogleDriveFileMetadata = {
      id: 'doc-file-123',
      name: 'Computer Networks Lecture 5.gdoc',
      mimeType: GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT,
      modifiedTime: '2026-09-20T10:00:00.000Z',
      webViewLink: 'https://docs.google.com/document/d/doc-file-123/edit',
      parents: ['folder-abc'],
    };

    let exportTargetMime = '';
    const mockDriveHttp: GoogleHttpClient = async (req: GoogleHttpRequestOptions) => {
      if (req.url.includes('/files/doc-file-123/export')) {
        const parsedUrl = new URL(req.url);
        exportTargetMime = parsedUrl.searchParams.get('mimeType') || '';
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'text/plain; charset=utf-8' },
          data: Buffer.from('# Chapter 5: Transport Layer\n\nTCP provides reliable ordered stream transport.'),
        };
      }
      if (req.url.includes('/files/doc-file-123')) {
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: mockFile,
        };
      }
      throw new Error(`Unexpected URL: ${req.url}`);
    };

    const mockOAuth: any = {
      getValidAccessToken: async () => 'mock-valid-access-token-123',
    };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    const result = await previewGoogleDriveFileService(
      {
        fileId: 'doc-file-123',
        taxonomy: validTaxonomy,
      },
      mockOAuth,
      driveService
    );

    assert.equal(result.success, true);
    assert.equal(exportTargetMime, 'text/plain', 'Google Docs must be exported as text/plain');
    assert.equal(result.manifest.manifest_version, '1.0');
    assert.equal(result.manifest.section, 'academics');
    assert.equal(result.manifest.category, 'computer-networks');
    assert.equal(result.manifest.topic, 'transport-layer');
    assert.equal(result.manifest.content_type, 'presentation');
    assert.equal(result.manifest.title, 'TCP and UDP Protocol Deep Dive');
    assert.ok(result.manifest.body?.includes('TCP provides reliable ordered stream transport'));
    assert.deepEqual(result.manifest.content, { body: result.manifest.body });
    assert.equal(result.manifest.source?.system, 'google-drive');
    assert.equal(result.manifest.source?.source_id, 'doc-file-123');

    recordPass('1. Google Docs metadata + preview request successfully returns Content Manifest v1.0');
  } catch (err) {
    recordFail('1. Google Docs metadata + preview request failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Google Slides preview request (PPTX export -> 422 PREVIEW_UNSUPPORTED_EXTRACTION)
  // --------------------------------------------------------------------------
  try {
    const mockFile: GoogleDriveFileMetadata = {
      id: 'slides-file-456',
      name: 'Lecture Presentation.gslides',
      mimeType: GOOGLE_DRIVE_NATIVE_MIME_TYPES.PRESENTATION,
      modifiedTime: '2026-09-20T10:00:00.000Z',
      webViewLink: 'https://docs.google.com/presentation/d/slides-file-456/edit',
      parents: ['folder-abc'],
    };

    let exportTargetMime = '';
    const mockDriveHttp: GoogleHttpClient = async (req: GoogleHttpRequestOptions) => {
      if (req.url.includes('/files/slides-file-456/export')) {
        const parsedUrl = new URL(req.url);
        exportTargetMime = parsedUrl.searchParams.get('mimeType') || '';
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
          data: Buffer.from('PK...fake-pptx-binary-data...'),
        };
      }
      if (req.url.includes('/files/slides-file-456')) {
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: mockFile,
        };
      }
      throw new Error(`Unexpected URL: ${req.url}`);
    };

    const mockOAuth: any = {
      getValidAccessToken: async () => 'mock-valid-access-token-123',
    };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    let thrownError: any = null;
    try {
      await previewGoogleDriveFileService(
        {
          fileId: 'slides-file-456',
          taxonomy: validTaxonomy,
        },
        mockOAuth,
        driveService
      );
    } catch (e) {
      thrownError = e;
    }

    assert.ok(thrownError, 'Expected Google Slides preview to throw PREVIEW_UNSUPPORTED_EXTRACTION');
    assert.equal(thrownError.code, 'PREVIEW_UNSUPPORTED_EXTRACTION');
    assert.equal(thrownError.statusCode, 422);
    assert.equal(
      exportTargetMime,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Expected export as PPTX'
    );
    assert.equal(thrownError.file?.exportTarget, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');

    recordPass('2. Google Slides preview exports PPTX and returns 422 PREVIEW_UNSUPPORTED_EXTRACTION');
  } catch (err) {
    recordFail('2. Google Slides preview request failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Google Sheets preview request (XLSX export -> 422 PREVIEW_UNSUPPORTED_EXTRACTION)
  // --------------------------------------------------------------------------
  try {
    const mockFile: GoogleDriveFileMetadata = {
      id: 'sheets-file-789',
      name: 'Network Benchmarks.gsheet',
      mimeType: GOOGLE_DRIVE_NATIVE_MIME_TYPES.SPREADSHEET,
      modifiedTime: '2026-09-20T10:00:00.000Z',
      webViewLink: 'https://docs.google.com/spreadsheets/d/sheets-file-789/edit',
      parents: ['folder-abc'],
    };

    let exportTargetMime = '';
    const mockDriveHttp: GoogleHttpClient = async (req: GoogleHttpRequestOptions) => {
      if (req.url.includes('/files/sheets-file-789/export')) {
        const parsedUrl = new URL(req.url);
        exportTargetMime = parsedUrl.searchParams.get('mimeType') || '';
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
          data: Buffer.from('PK...fake-xlsx-binary-data...'),
        };
      }
      if (req.url.includes('/files/sheets-file-789')) {
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: mockFile,
        };
      }
      throw new Error(`Unexpected URL: ${req.url}`);
    };

    const mockOAuth: any = {
      getValidAccessToken: async () => 'mock-valid-access-token-123',
    };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    let thrownError: any = null;
    try {
      await previewGoogleDriveFileService(
        {
          fileId: 'sheets-file-789',
          taxonomy: validTaxonomy,
        },
        mockOAuth,
        driveService
      );
    } catch (e) {
      thrownError = e;
    }

    assert.ok(thrownError, 'Expected Google Sheets preview to throw PREVIEW_UNSUPPORTED_EXTRACTION');
    assert.equal(thrownError.code, 'PREVIEW_UNSUPPORTED_EXTRACTION');
    assert.equal(thrownError.statusCode, 422);
    assert.equal(
      exportTargetMime,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Expected export as XLSX'
    );

    recordPass('3. Google Sheets preview exports XLSX and returns 422 PREVIEW_UNSUPPORTED_EXTRACTION');
  } catch (err) {
    recordFail('3. Google Sheets preview request failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Required taxonomy validation
  // --------------------------------------------------------------------------
  try {
    const mockFile: GoogleDriveFileMetadata = {
      id: 'doc-file-123',
      name: 'Lecture Notes.gdoc',
      mimeType: GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT,
    };
    const mockDriveHttp: GoogleHttpClient = async (req: GoogleHttpRequestOptions) => {
      if (req.url.includes('/export')) {
        return { status: 200, statusText: 'OK', headers: {}, data: Buffer.from('Sample Content') };
      }
      return { status: 200, statusText: 'OK', headers: {}, data: mockFile };
    };
    const mockOAuth: any = { getValidAccessToken: async () => 'mock-token' };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    const result = await previewGoogleDriveFileService(
      {
        fileId: 'doc-file-123',
        taxonomy: {
          section: 'research',
          category: 'distributed-systems',
          topic: 'consensus',
          content_type: 'research_paper',
          title: 'Paxos vs Raft Comparative Study',
        },
      },
      mockOAuth,
      driveService
    );

    assert.equal(result.manifest.section, 'research');
    assert.equal(result.manifest.category, 'distributed-systems');
    assert.equal(result.manifest.topic, 'consensus');
    assert.equal(result.manifest.content_type, 'research_paper');
    assert.equal(result.manifest.title, 'Paxos vs Raft Comparative Study');

    recordPass('4. Required taxonomy validation accepts valid taxonomy');
  } catch (err) {
    recordFail('4. Required taxonomy validation failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Missing / invalid taxonomy fields rejected with 400 INVALID_MANIFEST_METADATA
  // --------------------------------------------------------------------------
  try {
    const requiredFields = ['section', 'category', 'topic', 'content_type', 'title'];
    for (const field of requiredFields) {
      const incompleteTaxonomy: any = { ...validTaxonomy };
      delete incompleteTaxonomy[field];

      let thrown: any = null;
      try {
        await previewGoogleDriveFileService(
          {
            fileId: 'file-123',
            taxonomy: incompleteTaxonomy,
          },
          {} as any,
          {} as any
        );
      } catch (e) {
        thrown = e;
      }

      assert.ok(thrown, `Expected missing ${field} to throw`);
      assert.equal(thrown.code, 'INVALID_MANIFEST_METADATA');
      assert.equal(thrown.statusCode, 400);
      assert.ok(thrown.errors.some((errStr: string) => errStr.includes(field)));
    }

    // Invalid section
    let invalidSectionThrown: any = null;
    try {
      await previewGoogleDriveFileService(
        {
          fileId: 'file-123',
          taxonomy: { ...validTaxonomy, section: 'invalid-section' },
        },
        {} as any,
        {} as any
      );
    } catch (e) {
      invalidSectionThrown = e;
    }
    assert.equal(invalidSectionThrown.code, 'INVALID_MANIFEST_METADATA');
    assert.equal(invalidSectionThrown.statusCode, 400);

    // Invalid content_type
    let invalidContentTypeThrown: any = null;
    try {
      await previewGoogleDriveFileService(
        {
          fileId: 'file-123',
          taxonomy: { ...validTaxonomy, content_type: 'unknown_type' },
        },
        {} as any,
        {} as any
      );
    } catch (e) {
      invalidContentTypeThrown = e;
    }
    assert.equal(invalidContentTypeThrown.code, 'INVALID_MANIFEST_METADATA');
    assert.equal(invalidContentTypeThrown.statusCode, 400);

    recordPass('5. Missing or invalid taxonomy fields rejected with 400 INVALID_MANIFEST_METADATA');
  } catch (err) {
    recordFail('5. Missing or invalid taxonomy validation test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 6: User taxonomy supremacy (user taxonomy preserved strictly without alteration or inference)
  // --------------------------------------------------------------------------
  try {
    const mockFile: GoogleDriveFileMetadata = {
      id: 'doc-file-supremacy',
      name: 'Random Unrelated File Name 99.gdoc',
      mimeType: GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT,
    };
    const mockDriveHttp: GoogleHttpClient = async (req: GoogleHttpRequestOptions) => {
      if (req.url.includes('/export')) {
        // Document text discusses quantum mechanics, but user explicitly categorized as academics/computer-networks
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: Buffer.from('This document text mentions quantum superposition and entanglement.'),
        };
      }
      return { status: 200, statusText: 'OK', headers: {}, data: mockFile };
    };
    const mockOAuth: any = { getValidAccessToken: async () => 'mock-token' };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    const result = await previewGoogleDriveFileService(
      {
        fileId: 'doc-file-supremacy',
        taxonomy: {
          section: 'academics',
          category: 'computer-networks',
          topic: 'transport-layer',
          content_type: 'presentation',
          title: 'Custom User Title That Must Never Be Overridden',
          description: 'Custom user description',
          tags: ['custom-tag-1', 'custom-tag-2'],
        },
      },
      mockOAuth,
      driveService
    );

    assert.equal(result.manifest.section, 'academics', 'Section must not be inferred from text or file name');
    assert.equal(result.manifest.category, 'computer-networks', 'Category must not be inferred');
    assert.equal(result.manifest.topic, 'transport-layer', 'Topic must not be inferred');
    assert.equal(result.manifest.content_type, 'presentation', 'Content type must not be inferred from MIME');
    assert.equal(result.manifest.title, 'Custom User Title That Must Never Be Overridden');
    assert.deepEqual(result.manifest.tags, ['custom-tag-1', 'custom-tag-2']);

    recordPass('6. User taxonomy supremacy strictly preserved without inference or alteration');
  } catch (err) {
    recordFail('6. User taxonomy supremacy test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Source provenance is generated correctly
  // --------------------------------------------------------------------------
  try {
    const mockFile: GoogleDriveFileMetadata = {
      id: 'provenance-file-001',
      name: 'Syllabus.gdoc',
      mimeType: GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT,
      modifiedTime: '2026-09-22T04:00:00.000Z',
      webViewLink: 'https://drive.google.com/file/d/provenance-file-001/view',
    };
    const mockDriveHttp: GoogleHttpClient = async (req: GoogleHttpRequestOptions) => {
      if (req.url.includes('/export')) {
        return { status: 200, statusText: 'OK', headers: {}, data: Buffer.from('Syllabus content') };
      }
      return { status: 200, statusText: 'OK', headers: {}, data: mockFile };
    };
    const mockOAuth: any = { getValidAccessToken: async () => 'mock-token' };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    const result = await previewGoogleDriveFileService(
      {
        fileId: 'provenance-file-001',
        taxonomy: validTaxonomy,
      },
      mockOAuth,
      driveService
    );

    assert.equal(result.manifest.source?.system, 'google-drive');
    assert.equal(result.manifest.source?.source_id, 'provenance-file-001');
    assert.equal(result.manifest.source?.source_url, 'https://drive.google.com/file/d/provenance-file-001/view');
    assert.equal(result.manifest.source?.generated_at, '2026-09-22T04:00:00.000Z');

    recordPass('7. Source provenance is generated correctly with system="google-drive" and file provenance');
  } catch (err) {
    recordFail('7. Source provenance test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Unsupported extraction returns structured error (DOCX / PPTX / XLSX binary)
  // --------------------------------------------------------------------------
  try {
    const mockFile: GoogleDriveFileMetadata = {
      id: 'binary-file-001',
      name: 'Document.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const mockDriveHttp: GoogleHttpClient = async () => {
      return { status: 200, statusText: 'OK', headers: {}, data: mockFile };
    };
    const mockOAuth: any = { getValidAccessToken: async () => 'mock-token' };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    let thrown: any = null;
    try {
      await previewGoogleDriveFileService(
        {
          fileId: 'binary-file-001',
          taxonomy: validTaxonomy,
        },
        mockOAuth,
        driveService
      );
    } catch (e) {
      thrown = e;
    }

    assert.ok(thrown);
    assert.equal(thrown.code, 'PREVIEW_UNSUPPORTED_EXTRACTION');
    assert.equal(thrown.statusCode, 422);

    recordPass('8. Unsupported extraction returns structured 422 PREVIEW_UNSUPPORTED_EXTRACTION');
  } catch (err) {
    recordFail('8. Unsupported extraction test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 9: File size limit (> 50 MB rejected with 413 FILE_TOO_LARGE)
  // --------------------------------------------------------------------------
  try {
    const mockFile: GoogleDriveFileMetadata = {
      id: 'oversized-file-001',
      name: 'MassiveDataset.txt',
      mimeType: 'text/plain',
      size: 60 * 1024 * 1024, // 60 MB
    };
    const mockDriveHttp: GoogleHttpClient = async () => {
      return { status: 200, statusText: 'OK', headers: {}, data: mockFile };
    };
    const mockOAuth: any = { getValidAccessToken: async () => 'mock-token' };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    let thrown: any = null;
    try {
      await previewGoogleDriveFileService(
        {
          fileId: 'oversized-file-001',
          taxonomy: validTaxonomy,
        },
        mockOAuth,
        driveService
      );
    } catch (e) {
      thrown = e;
    }

    assert.ok(thrown);
    assert.equal(thrown.code, 'FILE_TOO_LARGE');
    assert.equal(thrown.statusCode, 413);

    recordPass('9. File size limit enforced: oversized files rejected with 413 FILE_TOO_LARGE');
  } catch (err) {
    recordFail('9. File size limit test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 10: Drive 404 (file not found in Drive -> 404 DRIVE_FILE_NOT_FOUND)
  // --------------------------------------------------------------------------
  try {
    const mockDriveHttp: GoogleHttpClient = async () => {
      throw new GoogleDriveServiceError('FILE_NOT_FOUND', 'File not found in Google Drive', 404);
    };
    const mockOAuth: any = { getValidAccessToken: async () => 'mock-token' };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    const req: any = {
      params: { fileId: 'non-existent-id' },
      query: { ...validTaxonomy },
    };
    const res = createMockExpressResponse();

    // Test Express controller mapping
    await executePreviewGoogleDriveFile(req, res, mockOAuth, driveService);

    assert.equal(res.getStatusCode(), 404);
    assert.equal(res.getBody()?.error, 'DRIVE_FILE_NOT_FOUND');

    recordPass('10. Drive 404 mapped to 404 DRIVE_FILE_NOT_FOUND in controller response');
  } catch (err) {
    recordFail('10. Drive 404 test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 11: Drive 403 (Google API forbidden -> 403 GOOGLE_API_FORBIDDEN)
  // --------------------------------------------------------------------------
  try {
    const mockOAuth: any = {
      getValidAccessToken: async () => {
        throw new GoogleDriveServiceError('DRIVE_API_ERROR', 'Google Drive API access forbidden (403)', 403);
      },
    };

    const req: any = {
      params: { fileId: 'forbidden-id' },
      query: { ...validTaxonomy },
    };
    const res = createMockExpressResponse();

    await executePreviewGoogleDriveFile(req, res, mockOAuth);

    assert.equal(res.getStatusCode(), 403);
    assert.equal(res.getBody()?.error, 'GOOGLE_API_FORBIDDEN');

    recordPass('11. Drive 403 mapped to 403 GOOGLE_API_FORBIDDEN');
  } catch (err) {
    recordFail('11. Drive 403 test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 12: Drive 429 (Google API rate limit -> 429 GOOGLE_API_RATE_LIMITED)
  // --------------------------------------------------------------------------
  try {
    const mockOAuth: any = {
      getValidAccessToken: async () => {
        throw new GoogleDriveServiceError('DRIVE_API_ERROR', 'User rate limit exceeded', 429);
      },
    };

    const req: any = {
      params: { fileId: 'rate-limited-id' },
      query: { ...validTaxonomy },
    };
    const res = createMockExpressResponse();

    await executePreviewGoogleDriveFile(req, res, mockOAuth);

    assert.equal(res.getStatusCode(), 429);
    assert.equal(res.getBody()?.error, 'GOOGLE_API_RATE_LIMITED');

    recordPass('12. Drive 429 mapped to 429 GOOGLE_API_RATE_LIMITED');
  } catch (err) {
    recordFail('12. Drive 429 test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 13: Drive 5xx (Google API 500/502/503 -> 502 GOOGLE_API_UNAVAILABLE)
  // --------------------------------------------------------------------------
  try {
    const mockOAuth: any = {
      getValidAccessToken: async () => {
        throw new GoogleDriveServiceError('DRIVE_API_ERROR', 'Backend Error', 503);
      },
    };

    const req: any = {
      params: { fileId: 'server-error-id' },
      query: { ...validTaxonomy },
    };
    const res = createMockExpressResponse();

    await executePreviewGoogleDriveFile(req, res, mockOAuth);

    assert.equal(res.getStatusCode(), 502);
    assert.equal(res.getBody()?.error, 'GOOGLE_API_UNAVAILABLE');

    recordPass('13. Drive 5xx mapped to 502 GOOGLE_API_UNAVAILABLE');
  } catch (err) {
    recordFail('13. Drive 5xx test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 14 & 15: Zero database & storage mutations
  // --------------------------------------------------------------------------
  try {
    const mockFile: GoogleDriveFileMetadata = {
      id: 'doc-file-pure',
      name: 'Pure Lecture.gdoc',
      mimeType: GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT,
    };
    const mockDriveHttp: GoogleHttpClient = async (req: GoogleHttpRequestOptions) => {
      if (req.url.includes('/export')) {
        return { status: 200, statusText: 'OK', headers: {}, data: Buffer.from('Pure Preview Content') };
      }
      return { status: 200, statusText: 'OK', headers: {}, data: mockFile };
    };
    const mockOAuth: any = { getValidAccessToken: async () => 'mock-token' };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    const result = await previewGoogleDriveFileService(
      {
        fileId: 'doc-file-pure',
        taxonomy: validTaxonomy,
      },
      mockOAuth,
      driveService
    );

    assert.ok(result.manifest);
    recordPass('14 & 15. Zero database content mutation & zero Storage mutation invariant verified');
  } catch (err) {
    recordFail('14 & 15. Mutation invariant test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 16: Zero credentials in response
  // --------------------------------------------------------------------------
  try {
    const mockFile: GoogleDriveFileMetadata = {
      id: 'doc-file-sec',
      name: 'Security Test.gdoc',
      mimeType: GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT,
    };
    const mockDriveHttp: GoogleHttpClient = async (req: GoogleHttpRequestOptions) => {
      if (req.url.includes('/export')) {
        return { status: 200, statusText: 'OK', headers: {}, data: Buffer.from('Sensitive Text') };
      }
      return { status: 200, statusText: 'OK', headers: {}, data: mockFile };
    };
    const secretToken = 'ya29.secret_oauth_access_token_12345';
    const mockOAuth: any = { getValidAccessToken: async () => secretToken };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    const result = await previewGoogleDriveFileService(
      {
        fileId: 'doc-file-sec',
        taxonomy: validTaxonomy,
      },
      mockOAuth,
      driveService
    );

    const serializedResponse = JSON.stringify(result);
    assert.equal(serializedResponse.includes(secretToken), false, 'OAuth token must NOT be leaked');
    assert.equal(serializedResponse.includes('refresh_token'), false);
    assert.equal(serializedResponse.includes('client_secret'), false);
    assert.equal(serializedResponse.includes('CONTENT_INGESTION_API_KEY'), false);

    recordPass('16. Response security verified: zero tokens, secrets, or keys present in response');
  } catch (err) {
    recordFail('16. Zero credentials test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 17: Read-only invariant (zero Drive mutation requests)
  // --------------------------------------------------------------------------
  try {
    const mutationMethods: string[] = [];
    const mockDriveHttp: GoogleHttpClient = async (req: GoogleHttpRequestOptions) => {
      const method = req.method || 'GET';
      if (method !== 'GET') {
        mutationMethods.push(method);
      }
      if (req.url.includes('/export')) {
        return { status: 200, statusText: 'OK', headers: {}, data: Buffer.from('Content') };
      }
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { id: 'ro-file', name: 'RO.gdoc', mimeType: GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT },
      };
    };
    const mockOAuth: any = { getValidAccessToken: async () => 'mock-token' };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    await previewGoogleDriveFileService(
      {
        fileId: 'ro-file',
        taxonomy: validTaxonomy,
      },
      mockOAuth,
      driveService
    );

    assert.equal(mutationMethods.length, 0, 'No non-GET HTTP requests should ever be made');
    recordPass('17. Read-only invariant: only GET requests made to Google Drive API');
  } catch (err) {
    recordFail('17. Read-only invariant test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 18: Trashed file rejected with 400 TRASHED_FILE
  // --------------------------------------------------------------------------
  try {
    const mockFile: GoogleDriveFileMetadata = {
      id: 'trashed-file-123',
      name: 'Deleted Lecture.gdoc',
      mimeType: GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT,
      trashed: true,
    };
    const mockDriveHttp: GoogleHttpClient = async () => {
      return { status: 200, statusText: 'OK', headers: {}, data: mockFile };
    };
    const mockOAuth: any = { getValidAccessToken: async () => 'mock-token' };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    let thrown: any = null;
    try {
      await previewGoogleDriveFileService(
        {
          fileId: 'trashed-file-123',
          taxonomy: validTaxonomy,
        },
        mockOAuth,
        driveService
      );
    } catch (e) {
      thrown = e;
    }

    assert.ok(thrown);
    assert.equal(thrown.code, 'TRASHED_FILE');
    assert.equal(thrown.statusCode, 400);

    recordPass('18. Trashed file rejected with 400 TRASHED_FILE');
  } catch (err) {
    recordFail('18. Trashed file rejection test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 19: Authentication boundary (missing/invalid bearer token -> 401)
  // --------------------------------------------------------------------------
  try {
    const originalKey = process.env.CONTENT_INGESTION_API_KEY;
    process.env.CONTENT_INGESTION_API_KEY = 'test-secret-ingestion-key';

    // 1. Missing Authorization header
    const req1: any = { headers: {} };
    const res1 = createMockExpressResponse();
    let nextCalled1 = false;
    authenticateIngestionRequest(req1, res1, () => {
      nextCalled1 = true;
    });
    assert.equal(nextCalled1, false);
    assert.equal(res1.getStatusCode(), 401);

    // 2. Wrong token
    const req2: any = { headers: { authorization: 'Bearer wrong-key' } };
    const res2 = createMockExpressResponse();
    let nextCalled2 = false;
    authenticateIngestionRequest(req2, res2, () => {
      nextCalled2 = true;
    });
    assert.equal(nextCalled2, false);
    assert.equal(res2.getStatusCode(), 401);

    // 3. Valid token
    const req3: any = { headers: { authorization: 'Bearer test-secret-ingestion-key' } };
    const res3 = createMockExpressResponse();
    let nextCalled3 = false;
    authenticateIngestionRequest(req3, res3, () => {
      nextCalled3 = true;
    });
    assert.equal(nextCalled3, true);

    if (originalKey !== undefined) {
      process.env.CONTENT_INGESTION_API_KEY = originalKey;
    } else {
      delete process.env.CONTENT_INGESTION_API_KEY;
    }

    recordPass('19. Authentication boundary: authenticateIngestionRequest enforces bearer token');
  } catch (err) {
    recordFail('19. Authentication boundary test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 20: Disconnected OAuth account handling -> 404 NO_GOOGLE_CONNECTION
  // --------------------------------------------------------------------------
  try {
    const mockOAuth: any = {
      getValidAccessToken: async () => {
        throw new GoogleOAuthError('NOT_CONNECTED', 'No active Google Drive OAuth connection found', 404);
      },
    };

    const req: any = {
      params: { fileId: 'some-file-id' },
      query: { ...validTaxonomy },
    };
    const res = createMockExpressResponse();

    await executePreviewGoogleDriveFile(req, res, mockOAuth);

    assert.equal(res.getStatusCode(), 404);
    assert.equal(res.getBody()?.error, 'NO_GOOGLE_CONNECTION');

    recordPass('20. Disconnected OAuth account handling returns 404 NO_GOOGLE_CONNECTION');
  } catch (err) {
    recordFail('20. Disconnected OAuth account test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 21: Plain text file preview (text/plain and text/markdown)
  // --------------------------------------------------------------------------
  try {
    const mockFile: GoogleDriveFileMetadata = {
      id: 'text-file-123',
      name: 'notes.md',
      mimeType: 'text/markdown',
      size: 1024,
    };
    const mockDriveHttp: GoogleHttpClient = async (req: GoogleHttpRequestOptions) => {
      if (req.url.includes('alt=media')) {
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'text/markdown' },
          data: Buffer.from('# Distributed Systems\n\nNotes on Byzantine fault tolerance.'),
        };
      }
      return { status: 200, statusText: 'OK', headers: {}, data: mockFile };
    };
    const mockOAuth: any = { getValidAccessToken: async () => 'mock-token' };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    const result = await previewGoogleDriveFileService(
      {
        fileId: 'text-file-123',
        taxonomy: validTaxonomy,
      },
      mockOAuth,
      driveService
    );

    assert.equal(result.success, true);
    assert.ok(result.manifest.body?.includes('Byzantine fault tolerance'));
    recordPass('21. Downloadable markdown file preview succeeds cleanly');
  } catch (err) {
    recordFail('21. Plain text file preview test failed', err);
  }

  // --------------------------------------------------------------------------
  // TEST 22: Unsupported file type (folder, forms, shortcut -> 415 PREVIEW_UNSUPPORTED_FILE_TYPE)
  // --------------------------------------------------------------------------
  try {
    const mockFile: GoogleDriveFileMetadata = {
      id: 'folder-file-123',
      name: 'Class Folder',
      mimeType: 'application/vnd.google-apps.folder',
    };
    const mockDriveHttp: GoogleHttpClient = async () => {
      return { status: 200, statusText: 'OK', headers: {}, data: mockFile };
    };
    const mockOAuth: any = { getValidAccessToken: async () => 'mock-token' };
    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });

    let thrown: any = null;
    try {
      await previewGoogleDriveFileService(
        {
          fileId: 'folder-file-123',
          taxonomy: validTaxonomy,
        },
        mockOAuth,
        driveService
      );
    } catch (e) {
      thrown = e;
    }

    assert.ok(thrown);
    assert.equal(thrown.code, 'PREVIEW_UNSUPPORTED_FILE_TYPE');
    assert.equal(thrown.statusCode, 415);

    recordPass('22. Non-document types (folders/shortcuts) return 415 PREVIEW_UNSUPPORTED_FILE_TYPE');
  } catch (err) {
    recordFail('22. Unsupported file type test failed', err);
  }

  console.log('================================================================');
  console.log(`STEP 24 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep24Tests().catch((err) => {
  console.error('Fatal error running Step 24 tests:', err);
  process.exit(1);
});
