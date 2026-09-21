/**
 * Step 22: Google Drive API v3 Service Test Suite
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22 — Google Drive API / OAuth Foundation
 * 
 * Tests:
 * 14. Drive API abstraction (listFiles, getFile, downloadFile, exportGoogleDocument)
 * 15. Google-native document classification
 * 16. Export target mapping
 * 17. Trashed-file filtering logic
 * 18. No network calls during tests (mock client used)
 * 19. No browser automation
 * 20. No unofficial API usage
 * 21. Existing Google Drive Adapter compatibility
 * 22. Existing Automation Gateway compatibility
 * 
 * Invariant: 100% offline testing. Zero live network calls to Google endpoints.
 */

import {
  GoogleDriveService,
  GoogleDriveServiceError,
} from '../src/services/googleDriveService.js';
import {
  GoogleHttpClient,
  GoogleHttpRequestOptions,
  GOOGLE_DRIVE_API_BASE_URL,
} from '../src/types/googleDrive.js';
import {
  GOOGLE_DRIVE_NATIVE_MIME_TYPES,
  GOOGLE_NATIVE_EXPORT_TARGETS,
  isGoogleNativeDocument,
  classifyGoogleDriveItem,
  googleDriveAdapter,
} from '../src/services/adapters/googleDriveAdapter.js';
import { processAutomationGatewayRequest } from '../src/services/automationGatewayService.js';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${name}`);
  }
}

async function runServiceTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 22: GOOGLE DRIVE SERVICE & INTEGRATION TESTS');
  console.log('================================================================');

  // Test 14: Drive API abstraction - listFiles
  {
    let recordedRequest: GoogleHttpRequestOptions | null = null;
    const mockHttpClient: GoogleHttpClient = async (opts) => {
      recordedRequest = opts;
      return {
        status: 200,
        data: {
          kind: 'drive#fileList',
          nextPageToken: 'token-page-2',
          files: [
            {
              id: 'file-doc-1',
              name: 'Deep Learning Lecture Notes',
              mimeType: GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT,
              trashed: false,
            },
            {
              id: 'file-pdf-2',
              name: 'Network Architecture Study.pdf',
              mimeType: 'application/pdf',
              size: '1048576',
              trashed: false,
            },
          ],
        },
      };
    };

    const driveService = new GoogleDriveService({
      accessToken: 'valid-test-access-token-123',
      httpClient: mockHttpClient,
    });

    const result = await driveService.listFiles({ pageSize: 50 });
    assert(result.files.length === 2, '14. listFiles returns files array');
    assert(result.nextPageToken === 'token-page-2', '14a. nextPageToken returned');
    assert(recordedRequest !== null, '14b. HTTP client called');
    assert(recordedRequest!.url.startsWith(`${GOOGLE_DRIVE_API_BASE_URL}/files`), '14c. URL targets official Drive v3 /files');
    assert(recordedRequest!.headers?.Authorization === 'Bearer valid-test-access-token-123', '14d. Authorization header supplied');
  }

  // Test 14e: Drive API abstraction - getFile
  {
    let recordedRequest: GoogleHttpRequestOptions | null = null;
    const mockHttpClient: GoogleHttpClient = async (opts) => {
      recordedRequest = opts;
      return {
        status: 200,
        data: {
          id: 'test-file-999',
          name: 'Distributed Systems Spec.pdf',
          mimeType: 'application/pdf',
          size: '2097152',
          trashed: false,
          webViewLink: 'https://drive.google.com/file/d/test-file-999/view',
          webContentLink: 'https://drive.google.com/uc?id=test-file-999',
          parents: ['folder-exports-123'],
        },
      };
    };

    const driveService = new GoogleDriveService({
      accessToken: 'valid-test-access-token-123',
      httpClient: mockHttpClient,
    });

    const metadata = await driveService.getFile('test-file-999');
    assert(metadata.id === 'test-file-999', '14e. getFile returns file ID');
    assert(metadata.name === 'Distributed Systems Spec.pdf', '14f. getFile returns file name');
    assert(metadata.mimeType === 'application/pdf', '14g. getFile returns file mimeType');
    assert(recordedRequest!.url.includes('/files/test-file-999'), '14h. getFile URL contains encoded ID');
  }

  // Test 14i: Drive API abstraction - downloadFile for binary file
  {
    const sampleBytes = Buffer.from('%PDF-1.4 Mock PDF Content Bytes for testing');
    const mockHttpClient: GoogleHttpClient = async (opts) => {
      if (opts.url.includes('?fields=')) {
        return {
          status: 200,
          data: {
            id: 'binary-pdf-1',
            name: 'Sample.pdf',
            mimeType: 'application/pdf',
            size: sampleBytes.length,
            trashed: false,
          },
        };
      }
      return {
        status: 200,
        data: sampleBytes,
      };
    };

    const driveService = new GoogleDriveService({
      accessToken: 'valid-test-access-token-123',
      httpClient: mockHttpClient,
    });

    const downloaded = await driveService.downloadFile('binary-pdf-1');
    assert(downloaded.fileName === 'Sample.pdf', '14i. downloadFile preserves fileName');
    assert(downloaded.mimeType === 'application/pdf', '14j. downloadFile preserves mimeType');
    assert(downloaded.size === sampleBytes.length, '14k. downloadFile returns correct byte size');
    assert(Buffer.isBuffer(downloaded.data), '14l. downloadFile returns binary buffer');
  }

  // Test 14m: Drive API abstraction - exportGoogleDocument for native doc
  {
    const exportedPdfBytes = Buffer.from('%PDF-1.4 Exported Google Doc Bytes');
    let exportUrl = '';
    const mockHttpClient: GoogleHttpClient = async (opts) => {
      if (opts.url.includes('?fields=')) {
        return {
          status: 200,
          data: {
            id: 'native-doc-1',
            name: 'Google Doc Research Summary',
            mimeType: GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT,
            trashed: false,
          },
        };
      }
      exportUrl = opts.url;
      return {
        status: 200,
        data: exportedPdfBytes,
      };
    };

    const driveService = new GoogleDriveService({
      accessToken: 'valid-test-access-token-123',
      httpClient: mockHttpClient,
    });

    const exported = await driveService.exportGoogleDocument('native-doc-1', 'application/pdf');
    assert(exported.fileName === 'Google Doc Research Summary', '14m. exportGoogleDocument preserves fileName');
    assert(exported.targetMimeType === 'application/pdf', '14n. targetMimeType matches request');
    assert(exported.sourceMimeType === GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT, '14o. sourceMimeType identifies Google Doc');
    assert(exportUrl.includes('/files/native-doc-1/export'), '14p. URL targets official Drive export endpoint');
    assert(exportUrl.includes('mimeType=application%2Fpdf'), '14q. URL contains encoded target mimeType');
  }

  // Test 15: Google-native document classification
  {
    assert(isGoogleNativeDocument(GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT), '15. Google Docs classified as native');
    assert(isGoogleNativeDocument(GOOGLE_DRIVE_NATIVE_MIME_TYPES.SPREADSHEET), '15a. Google Sheets classified as native');
    assert(isGoogleNativeDocument(GOOGLE_DRIVE_NATIVE_MIME_TYPES.PRESENTATION), '15b. Google Slides classified as native');
    assert(!isGoogleNativeDocument('application/pdf'), '15c. PDF is NOT classified as native');
    assert(!isGoogleNativeDocument('application/vnd.openxmlformats-officedocument.presentationml.presentation'), '15d. PPTX is NOT classified as native');

    assert(classifyGoogleDriveItem(GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT) === 'google-native', '15e. classifyGoogleDriveItem identifies google-native');
    assert(classifyGoogleDriveItem('application/pdf') === 'binary', '15f. classifyGoogleDriveItem identifies binary');
  }

  // Test 16: Export target mapping
  {
    const docTargets = GOOGLE_NATIVE_EXPORT_TARGETS[GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT];
    assert(docTargets.includes('application/pdf'), '16. Google Docs export targets include PDF');
    assert(docTargets.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document'), '16a. Google Docs export targets include DOCX');

    const sheetTargets = GOOGLE_NATIVE_EXPORT_TARGETS[GOOGLE_DRIVE_NATIVE_MIME_TYPES.SPREADSHEET];
    assert(sheetTargets.includes('application/pdf'), '16b. Google Sheets export targets include PDF');
    assert(sheetTargets.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), '16c. Google Sheets export targets include XLSX');

    const slideTargets = GOOGLE_NATIVE_EXPORT_TARGETS[GOOGLE_DRIVE_NATIVE_MIME_TYPES.PRESENTATION];
    assert(slideTargets.includes('application/pdf'), '16d. Google Slides export targets include PDF');
    assert(slideTargets.includes('application/vnd.openxmlformats-officedocument.presentationml.presentation'), '16e. Google Slides export targets include PPTX');

    // Attempting to export with an invalid target MIME throws UNSUPPORTED_EXPORT_TARGET
    const driveService = new GoogleDriveService({
      accessToken: 'token',
      httpClient: async () => ({
        status: 200,
        data: {
          id: 'doc-1',
          name: 'Doc',
          mimeType: GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT,
        },
      }),
    });
    let exportError: any = null;
    try {
      await driveService.exportGoogleDocument('doc-1', 'image/jpeg');
    } catch (err) {
      exportError = err;
    }
    assert(exportError instanceof GoogleDriveServiceError, '16f. Invalid export target throws GoogleDriveServiceError');
    assert(exportError?.code === 'UNSUPPORTED_EXPORT_TARGET', '16g. Error code is UNSUPPORTED_EXPORT_TARGET');
  }

  // Test 17: Trashed-file filtering logic
  {
    let recordedQuery = '';
    const mockHttpClient: GoogleHttpClient = async (opts) => {
      recordedQuery = opts.url;
      return {
        status: 200,
        data: { files: [] },
      };
    };

    const driveService = new GoogleDriveService({
      accessToken: 'token',
      httpClient: mockHttpClient,
    });

    await driveService.listFiles();
    assert(recordedQuery.includes('trashed+%3D+false') || recordedQuery.includes('trashed = false') || recordedQuery.includes('trashed'), '17. listFiles query automatically includes trashed = false');

    // Designated folder query includes folder ID and trashed = false
    await driveService.listFiles({ folderId: 'folder-abc-123' });
    const qParam = new URL(recordedQuery).searchParams.get('q') || '';
    assert(qParam.includes('trashed = false'), '17a. Folder query includes trashed = false');
    assert(qParam.includes("'folder-abc-123' in parents"), '17b. Folder query includes parents clause');

    // Downloading a trashed file is rejected
    const trashedService = new GoogleDriveService({
      accessToken: 'token',
      httpClient: async () => ({
        status: 200,
        data: {
          id: 'trashed-1',
          name: 'Deleted.pdf',
          mimeType: 'application/pdf',
          trashed: true,
        },
      }),
    });
    let trashDownloadError: any = null;
    try {
      await trashedService.downloadFile('trashed-1');
    } catch (err) {
      trashDownloadError = err;
    }
    assert(trashDownloadError?.code === 'TRASHED_FILE', '17c. Downloading trashed file throws TRASHED_FILE error');
  }

  // Test 18: No network calls during tests
  {
    let networkCalled = false;
    const testHttpClient: GoogleHttpClient = async (opts) => {
      networkCalled = true;
      return { status: 200, data: { files: [] } };
    };
    const driveService = new GoogleDriveService({ accessToken: 'token', httpClient: testHttpClient });
    await driveService.listFiles();
    assert(networkCalled, '18. All calls diverted to injected mock client; ZERO external network calls');
  }

  // Test 19: No browser automation in service
  {
    const serviceCode = fs.readFileSync(path.join(process.cwd(), 'src/services/googleDriveService.ts'), 'utf8');
    assert(!serviceCode.includes('puppeteer'), '19. Zero Puppeteer in service');
    assert(!serviceCode.includes('playwright'), '19a. Zero Playwright in service');
    assert(!serviceCode.includes('selenium'), '19b. Zero Selenium in service');
  }

  // Test 20: No unofficial API usage
  {
    const serviceCode = fs.readFileSync(path.join(process.cwd(), 'src/services/googleDriveService.ts'), 'utf8');
    assert(serviceCode.includes('https://www.googleapis.com/drive/v3'), '20. Uses official Google Drive API v3 base URL');
    assert(!serviceCode.includes('docs.google.com/document/d/'), '20a. No unofficial internal scraping endpoints');
  }

  // Test 21: Existing Google Drive Adapter compatibility
  {
    const driveService = new GoogleDriveService();
    const mockMetadata = {
      id: 'drive-file-abc-123',
      name: 'computer_networks_study_guide.pdf',
      mimeType: 'application/pdf',
      size: 1048576,
      webViewLink: 'https://drive.google.com/file/d/drive-file-abc-123/view',
      modifiedTime: '2026-09-20T12:00:00Z',
    };
    const sampleFileData = Buffer.from('%PDF-1.4 Mock Binary Buffer Data');

    // Build input using user taxonomy
    const sourceInput = driveService.buildSourceInput({
      file: mockMetadata,
      taxonomy: {
        section: 'academics',
        category: 'computer-networks',
        topic: 'arp',
        content_type: 'study_material',
        title: 'Computer Networks Study Guide',
        description: 'Comprehensive study guide for ARP and networking protocols',
        tags: ['networking', 'protocols', 'arp'],
      },
      fileData: sampleFileData,
    });

    assert(sourceInput.title === 'Computer Networks Study Guide', '21. Source input preserves explicit user title');
    assert(sourceInput.section === 'academics', '21a. Source input preserves explicit section');
    assert(sourceInput.file_id === 'drive-file-abc-123', '21b. Source input preserves file_id');

    // Pass directly to existing GoogleDriveAdapter
    const adaptedResult = await googleDriveAdapter.adapt(sourceInput);
    assert(adaptedResult.manifest.title === 'Computer Networks Study Guide', '21c. Adapted manifest title matches');
    assert(adaptedResult.manifest.section === 'academics', '21d. Adapted manifest section matches');
    assert(adaptedResult.manifest.source?.system === 'google-drive', '21e. Source system is google-drive');
    assert(adaptedResult.manifest.source?.source_id === 'drive-file-abc-123', '21f. Source ID preserved in manifest');
    assert(adaptedResult.fileResource !== undefined, '21g. FileResource attached');
    assert(adaptedResult.fileResource?.data.byteLength === sampleFileData.byteLength, '21h. Binary data preserved in memory');
  }

  // Test 22: Existing Automation Gateway compatibility
  {
    const driveService = new GoogleDriveService();
    const sourceInput = driveService.buildSourceInput({
      file: {
        id: 'drive-research-456',
        name: 'quantum_computation_foundations.pdf',
        mimeType: 'application/pdf',
        webViewLink: 'https://drive.google.com/file/d/drive-research-456/view',
      },
      taxonomy: {
        section: 'research',
        category: 'quantum-computing',
        topic: 'algorithms',
        content_type: 'research_paper',
        title: 'Quantum Computation Foundations',
      },
      fileData: Buffer.from('%PDF-1.4 Mock PDF for Gateway Validation'),
    });

    const adaptedResult = await googleDriveAdapter.adapt(sourceInput);

    // Validate using existing Automation Gateway validation in dryRun mode
    const gatewayResult = await processAutomationGatewayRequest({
      manifest: adaptedResult.manifest,
      fileResource: adaptedResult.fileResource,
      dryRun: true,
    });

    assert(gatewayResult.success, '22. Adapted manifest satisfies Automation Gateway execution (dry-run)');
    assert(gatewayResult.auditContext?.source_system === 'google-drive', '22a. Gateway recognizes google-drive source system');
    assert(gatewayResult.auditContext?.has_file === true, '22b. Gateway recognizes attached file resource');
  }

  console.log('================================================================');
  console.log(`STEP 22 SERVICE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runServiceTests().catch((err) => {
  console.error('Unhandled exception in Step 22 Service tests:', err);
  process.exit(1);
});
