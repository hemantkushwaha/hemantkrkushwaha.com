/**
 * Step 21: Google Drive Source Adapter Foundation Unit Tests
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 21 — Google Drive Source Adapter Foundation
 * 
 * Test Coverage:
 * 1. Valid binary-file input
 * 2. Valid Google Docs metadata
 * 3. Valid Google Sheets metadata
 * 4. Valid Google Slides metadata
 * 5. Missing section
 * 6. Missing category
 * 7. Missing topic
 * 8. Missing content_type
 * 9. Missing title
 * 10. Invalid section
 * 11. Invalid content_type
 * 12. Source system equals google-drive
 * 13. Source ID preservation
 * 14. Source URL preservation
 * 15. Generated timestamp validation
 * 16. Description preservation
 * 17. Body/content preservation
 * 18. Tag normalization
 * 19. File metadata preservation
 * 20. 50 MB limit
 * 21. Unsupported file type rejection
 * 22. No taxonomy inference
 * 23. No network calls
 * 24. No Google API imports
 * 25. No OAuth implementation
 * 26. No secrets in output
 * 27. Existing adapter interface compatibility
 */

import fs from 'fs';
import path from 'path';
import {
  googleDriveAdapter,
  DefaultGoogleDriveAdapter,
  GoogleDriveAdapterError,
  isGoogleNativeDocument,
  classifyGoogleDriveItem,
  GOOGLE_DRIVE_NATIVE_MIME_TYPES,
  GOOGLE_DRIVE_BINARY_MIME_TYPES,
  GOOGLE_NATIVE_EXPORT_TARGETS,
} from '../src/services/adapters/googleDriveAdapter.js';
import { GoogleDriveSourceInput, RawSourceInput } from '../src/types/automation.js';

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

const baseTaxonomy: GoogleDriveSourceInput = {
  section: 'academics',
  category: 'Computer Science',
  topic: 'Computer Networks',
  content_type: 'study_material',
  title: 'OSPF Routing Protocol Deep Dive',
  subcategory: 'Routing Protocols',
  description: 'Comprehensive analysis of link-state advertisement and Dijkstra SPF algorithm.',
  language: 'en',
  visibility: 'public',
  published: true,
};

async function runGoogleDriveAdapterTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 21: GOOGLE DRIVE SOURCE ADAPTER TESTS');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // 1. Valid binary-file input
  // -------------------------------------------------------------
  {
    const binaryInput: GoogleDriveSourceInput = {
      ...baseTaxonomy,
      file_id: 'drive-binary-file-101',
      name: 'ospf_routing_spec.pdf',
      file_name: 'ospf_routing_spec.pdf',
      file_type: 'application/pdf',
      file_size: 1048576, // 1 MB
      web_view_link: 'https://drive.google.com/file/d/drive-binary-file-101/view',
      file_data: Buffer.from('%PDF-1.4 simulated binary stream'),
      modified_time: '2026-09-20T12:00:00.000Z',
    };

    const result = googleDriveAdapter.adapt(binaryInput);
    assert(result.manifest.manifest_version === '1.0', '1. Valid binary-file input produces Manifest v1.0');
    assert(result.manifest.file_name === 'ospf_routing_spec.pdf', '1a. File name preserved in manifest');
    assert(result.manifest.file_type === 'application/pdf', '1b. File type preserved in manifest');
    assert(result.manifest.file_size === 1048576, '1c. File size preserved in manifest');
    assert(result.fileResource !== undefined, '1d. FileResource attached to adapted result');
    assert(result.fileResource?.data.length > 0, '1e. Binary data preserved in memory');
  }

  // -------------------------------------------------------------
  // 2. Valid Google Docs metadata
  // -------------------------------------------------------------
  {
    const docInput: GoogleDriveSourceInput = {
      ...baseTaxonomy,
      title: 'BGP Peering Architecture Notes',
      file_id: '1aB2c3D4e5F6g7H8i9J0',
      name: 'BGP Peering Architecture Notes',
      mime_type: 'application/vnd.google-apps.document',
      web_view_link: 'https://docs.google.com/document/d/1aB2c3D4e5F6g7H8i9J0/edit',
      body: '## BGP Autonomous Systems\n\nExterior gateway routing fundamentals.',
      modified_time: '2026-09-20T14:30:00.000Z',
    };

    const result = googleDriveAdapter.adapt(docInput);
    assert(result.manifest.manifest_version === '1.0', '2. Valid Google Docs metadata produces Manifest v1.0');
    assert(result.manifest.source?.system === 'google-drive', '2a. Source system is google-drive');
    assert(result.manifest.source?.source_id === '1aB2c3D4e5F6g7H8i9J0', '2b. Google Docs file_id preserved as source_id');
    assert(result.manifest.source?.source_name === 'BGP Peering Architecture Notes', '2c. Document name preserved as source_name');
    assert(result.manifest.source_url === 'https://docs.google.com/document/d/1aB2c3D4e5F6g7H8i9J0/edit', '2d. web_view_link preserved as source_url');
    assert(result.manifest.body?.includes('BGP Autonomous Systems') === true, '2e. Body text preserved verbatim');
    assert(result.manifest.file_name === undefined, '2f. Google Docs does not set invalid binary file_name');
  }

  // -------------------------------------------------------------
  // 3. Valid Google Sheets metadata
  // -------------------------------------------------------------
  {
    const sheetInput: GoogleDriveSourceInput = {
      ...baseTaxonomy,
      title: 'Network Interface Latency Benchmark Matrix',
      file_id: 'sheet-benchmark-999',
      name: 'Network Interface Latency Benchmark Matrix',
      mime_type: 'application/vnd.google-apps.spreadsheet',
      web_view_link: 'https://docs.google.com/spreadsheets/d/sheet-benchmark-999/edit',
      body: '| Interface | MTU | Round-trip (ms) |\n| eth0 | 1500 | 0.24 |',
      modified_time: '2026-09-20T15:00:00.000Z',
    };

    const result = googleDriveAdapter.adapt(sheetInput);
    assert(result.manifest.manifest_version === '1.0', '3. Valid Google Sheets metadata produces Manifest v1.0');
    assert(result.manifest.source?.source_id === 'sheet-benchmark-999', '3a. Google Sheets file_id preserved');
    assert(result.manifest.source?.source_name === 'Network Interface Latency Benchmark Matrix', '3b. Spreadsheet name preserved');
    assert(result.manifest.source_url === 'https://docs.google.com/spreadsheets/d/sheet-benchmark-999/edit', '3c. Spreadsheet web_view_link preserved');
    assert(result.manifest.file_name === undefined, '3d. Google Sheets does not set invalid binary file_name');
  }

  // -------------------------------------------------------------
  // 4. Valid Google Slides metadata
  // -------------------------------------------------------------
  {
    const slideInput: GoogleDriveSourceInput = {
      ...baseTaxonomy,
      title: 'TCP Congestion Control Algorithms Presentation',
      file_id: 'presentation-tcp-777',
      name: 'TCP Congestion Control Algorithms Presentation',
      mime_type: 'application/vnd.google-apps.presentation',
      web_view_link: 'https://docs.google.com/presentation/d/presentation-tcp-777/edit',
      body: '## Slide 1: Introduction to Reno, Cubic, and BBR\n\nComparative analysis of congestion window growth.',
      modified_time: '2026-09-20T16:00:00.000Z',
    };

    const result = googleDriveAdapter.adapt(slideInput);
    assert(result.manifest.manifest_version === '1.0', '4. Valid Google Slides metadata produces Manifest v1.0');
    assert(result.manifest.source?.source_id === 'presentation-tcp-777', '4a. Google Slides file_id preserved');
    assert(result.manifest.source?.source_name === 'TCP Congestion Control Algorithms Presentation', '4b. Presentation name preserved');
    assert(result.manifest.source_url === 'https://docs.google.com/presentation/d/presentation-tcp-777/edit', '4c. Presentation web_view_link preserved');
    assert(result.manifest.file_name === undefined, '4d. Google Slides does not set invalid binary file_name');
  }

  // -------------------------------------------------------------
  // 5. Missing section
  // -------------------------------------------------------------
  {
    const invalid = { ...baseTaxonomy };
    delete (invalid as any).section;
    try {
      googleDriveAdapter.adapt(invalid);
      assert(false, '5. Missing section must throw GoogleDriveAdapterError');
    } catch (err: any) {
      assert(err instanceof GoogleDriveAdapterError, '5. Error is instance of GoogleDriveAdapterError');
      assert(err.errors.some((e: string) => e.includes('section')), '5a. Error identifies missing section');
      assert(err.code === 'MISSING_REQUIRED_FIELD' || err.code === 'INVALID_SECTION', '5b. Error code is specific');
    }
  }

  // -------------------------------------------------------------
  // 6. Missing category
  // -------------------------------------------------------------
  {
    const invalid = { ...baseTaxonomy };
    delete (invalid as any).category;
    try {
      googleDriveAdapter.adapt(invalid);
      assert(false, '6. Missing category must throw GoogleDriveAdapterError');
    } catch (err: any) {
      assert(err instanceof GoogleDriveAdapterError, '6. Error is instance of GoogleDriveAdapterError');
      assert(err.errors.some((e: string) => e.includes('category')), '6a. Error identifies missing category');
    }
  }

  // -------------------------------------------------------------
  // 7. Missing topic
  // -------------------------------------------------------------
  {
    const invalid = { ...baseTaxonomy };
    delete (invalid as any).topic;
    try {
      googleDriveAdapter.adapt(invalid);
      assert(false, '7. Missing topic must throw GoogleDriveAdapterError');
    } catch (err: any) {
      assert(err instanceof GoogleDriveAdapterError, '7. Error is instance of GoogleDriveAdapterError');
      assert(err.errors.some((e: string) => e.includes('topic')), '7a. Error identifies missing topic');
    }
  }

  // -------------------------------------------------------------
  // 8. Missing content_type
  // -------------------------------------------------------------
  {
    const invalid = { ...baseTaxonomy };
    delete (invalid as any).content_type;
    try {
      googleDriveAdapter.adapt(invalid);
      assert(false, '8. Missing content_type must throw GoogleDriveAdapterError');
    } catch (err: any) {
      assert(err instanceof GoogleDriveAdapterError, '8. Error is instance of GoogleDriveAdapterError');
      assert(err.errors.some((e: string) => e.includes('content_type')), '8a. Error identifies missing content_type');
    }
  }

  // -------------------------------------------------------------
  // 9. Missing title
  // -------------------------------------------------------------
  {
    const invalid = { ...baseTaxonomy };
    delete (invalid as any).title;
    try {
      googleDriveAdapter.adapt(invalid);
      assert(false, '9. Missing title must throw GoogleDriveAdapterError');
    } catch (err: any) {
      assert(err instanceof GoogleDriveAdapterError, '9. Error is instance of GoogleDriveAdapterError');
      assert(err.errors.some((e: string) => e.includes('title')), '9a. Error identifies missing title');
    }
  }

  // -------------------------------------------------------------
  // 10. Invalid section
  // -------------------------------------------------------------
  {
    const invalid = { ...baseTaxonomy, section: 'unauthorized_section_name' };
    try {
      googleDriveAdapter.adapt(invalid);
      assert(false, '10. Invalid section must throw GoogleDriveAdapterError');
    } catch (err: any) {
      assert(err instanceof GoogleDriveAdapterError, '10. Error is instance of GoogleDriveAdapterError');
      assert(err.errors.some((e: string) => e.includes('section')), '10a. Error identifies invalid section');
    }
  }

  // -------------------------------------------------------------
  // 11. Invalid content_type
  // -------------------------------------------------------------
  {
    const invalid = { ...baseTaxonomy, content_type: 'custom_blog_blast' };
    try {
      googleDriveAdapter.adapt(invalid);
      assert(false, '11. Invalid content_type must throw GoogleDriveAdapterError');
    } catch (err: any) {
      assert(err instanceof GoogleDriveAdapterError, '11. Error is instance of GoogleDriveAdapterError');
      assert(err.errors.some((e: string) => e.includes('content_type')), '11a. Error identifies invalid content_type');
    }
  }

  // -------------------------------------------------------------
  // 12. Source system equals google-drive
  // -------------------------------------------------------------
  {
    const result = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      file_id: 'drive-sys-test',
    });
    assert(result.manifest.source?.system === 'google-drive', '12. Manifest source system is strictly "google-drive"');
    assert(googleDriveAdapter.system === 'google-drive', '12a. Adapter instance system identifier is strictly "google-drive"');

    // Wrapped input
    const wrapped: RawSourceInput<GoogleDriveSourceInput> = {
      system: 'google-drive',
      payload: { ...baseTaxonomy, file_id: 'drive-wrapped-sys' },
    };
    const wrappedResult = googleDriveAdapter.adapt(wrapped);
    assert(wrappedResult.manifest.source?.system === 'google-drive', '12b. Wrapped RawSourceInput enforces system "google-drive"');
  }

  // -------------------------------------------------------------
  // 13. Source ID preservation
  // -------------------------------------------------------------
  {
    const result1 = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      file_id: 'drive-file-id-abc123xyz',
    });
    assert(result1.manifest.source?.source_id === 'drive-file-id-abc123xyz', '13. file_id preserved as source_id');

    // Also supports Drive API v3 standard "id" field
    const result2 = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      id: 'drive-v3-id-98765',
    });
    assert(result2.manifest.source?.source_id === 'drive-v3-id-98765', '13a. Drive API v3 "id" field mapped to source_id');
  }

  // -------------------------------------------------------------
  // 14. Source URL preservation
  // -------------------------------------------------------------
  {
    const result1 = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      web_view_link: 'https://drive.google.com/file/d/test-url-1/view?usp=sharing',
    });
    assert(
      result1.manifest.source?.source_url === 'https://drive.google.com/file/d/test-url-1/view?usp=sharing',
      '14. web_view_link preserved in source.source_url'
    );
    assert(
      result1.manifest.source_url === 'https://drive.google.com/file/d/test-url-1/view?usp=sharing',
      '14a. web_view_link preserved in manifest.source_url'
    );

    // Also supports Drive API v3 "webViewLink" camelCase
    const result2 = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      webViewLink: 'https://docs.google.com/document/d/camelCaseLink/edit',
    });
    assert(
      result2.manifest.source?.source_url === 'https://docs.google.com/document/d/camelCaseLink/edit',
      '14b. Drive API v3 webViewLink preserved'
    );
  }

  // -------------------------------------------------------------
  // 15. Generated timestamp validation
  // -------------------------------------------------------------
  {
    const isoDate = '2026-09-20T08:15:30.000Z';
    const result1 = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      generated_at: isoDate,
    });
    assert(result1.manifest.source?.generated_at === isoDate, '15. Explicit generated_at preserved as ISO string');

    // Falls back to modified_time if generated_at not provided
    const result2 = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      modified_time: '2026-09-20T09:00:00.000Z',
    });
    assert(result2.manifest.source?.generated_at === '2026-09-20T09:00:00.000Z', '15a. modified_time normalized to generated_at');

    // Falls back to Drive v3 modifiedTime
    const result3 = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      modifiedTime: '2026-09-20T10:00:00.000Z',
    });
    assert(result3.manifest.source?.generated_at === '2026-09-20T10:00:00.000Z', '15b. modifiedTime normalized to generated_at');

    // Rejects invalid date format via canonical validation
    try {
      googleDriveAdapter.adapt({
        ...baseTaxonomy,
        generated_at: 'not-a-real-date',
      });
      assert(false, '15c. Invalid date string must be rejected');
    } catch (err: any) {
      assert(err instanceof GoogleDriveAdapterError, '15c. Invalid date string correctly rejected');
    }
  }

  // -------------------------------------------------------------
  // 16. Description preservation
  // -------------------------------------------------------------
  {
    const desc = 'A detailed reference for CIDR subnets, VLSM calculations, and supernetting.';
    const result = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      description: desc,
    });
    assert(result.manifest.description === desc, '16. Description preserved verbatim');
  }

  // -------------------------------------------------------------
  // 17. Body/content preservation
  // -------------------------------------------------------------
  {
    const richBody = `
# IP Subnetting & Supernetting
- Point 1: Classless Inter-Domain Routing (CIDR)
- Point 2: Subnet masks (/24, /27, /30)

\`\`\`python
def calculate_broadcast(ip_cidr):
    return "Calculated"
\`\`\`

LaTeX equation: $2^{32 - n} - 2$ usable hosts.

Link: https://hemantkrkushwaha.com/academics/computer-networks
`;

    // Test with "body"
    const resultBody = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      body: richBody,
    });
    assert(resultBody.manifest.body === richBody, '17. Body preserved verbatim with Markdown, code, LaTeX, and URLs');

    // Test with "content" synonym
    const resultContent = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      content: richBody,
    });
    assert(resultContent.manifest.body === richBody, '17a. Content synonym preserved verbatim');
  }

  // -------------------------------------------------------------
  // 18. Tag normalization
  // -------------------------------------------------------------
  {
    const result = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      tags: ['  Networking  ', 'BGP', 'bgp', '  ', 'TCP/IP', 'Networking'],
    });
    // Expected: ['Networking', 'BGP', 'TCP/IP']
    assert(result.manifest.tags !== undefined, '18. Tags array populated');
    assert(result.manifest.tags?.length === 3, '18a. Duplicate and empty tags removed');
    assert(result.manifest.tags?.[0] === 'Networking', '18b. First tag trimmed and original casing preserved');
    assert(result.manifest.tags?.[1] === 'BGP', '18c. Second tag deduplicated case-insensitively');
    assert(result.manifest.tags?.[2] === 'TCP/IP', '18d. Third tag trimmed');
  }

  // -------------------------------------------------------------
  // 19. File metadata preservation
  // -------------------------------------------------------------
  {
    const result = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      file_name: 'bgp_routing_architecture.pptx',
      file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      file_size: 2048576,
    });
    assert(result.manifest.file_name === 'bgp_routing_architecture.pptx', '19. Binary file_name preserved');
    assert(result.manifest.file_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '19a. PPTX file_type preserved');
    assert(result.manifest.file_size === 2048576, '19b. file_size preserved');
  }

  // -------------------------------------------------------------
  // 20. 50 MB limit
  // -------------------------------------------------------------
  {
    const oversizedBytes = 50 * 1024 * 1024 + 1; // 52,428,801 bytes
    try {
      googleDriveAdapter.adapt({
        ...baseTaxonomy,
        file_name: 'large_dataset.pdf',
        file_type: 'application/pdf',
        file_size: oversizedBytes,
      });
      assert(false, '20. File exceeding 50 MB must throw GoogleDriveAdapterError');
    } catch (err: any) {
      assert(err instanceof GoogleDriveAdapterError, '20. Oversized file correctly rejected');
      assert(err.code === 'PAYLOAD_TOO_LARGE' || err.errors.some((e: string) => e.includes('50 MB') || e.includes('exceeds')), '20a. Error identifies size limit violation');
    }

    // Also rejects via attached buffer
    try {
      googleDriveAdapter.adapt({
        ...baseTaxonomy,
        file_name: 'large_buffer.pdf',
        file_type: 'application/pdf',
        size: oversizedBytes,
      });
      assert(false, '20b. Size field exceeding 50 MB must throw');
    } catch (err: any) {
      assert(err instanceof GoogleDriveAdapterError, '20b. Size exceeding 50MB rejected');
    }
  }

  // -------------------------------------------------------------
  // 21. Unsupported file type rejection
  // -------------------------------------------------------------
  {
    try {
      googleDriveAdapter.adapt({
        ...baseTaxonomy,
        file_name: 'suspicious_payload.exe',
        file_type: 'application/x-msdownload',
      });
      assert(false, '21. Unsupported file extension .exe must throw');
    } catch (err: any) {
      assert(err instanceof GoogleDriveAdapterError, '21. Unsupported extension .exe rejected');
      assert(err.errors.some((e: string) => e.includes('exe') || e.includes('supported')), '21a. Error mentions unsupported type');
    }

    try {
      googleDriveAdapter.adapt({
        ...baseTaxonomy,
        file_name: 'backup_archive.zip',
        file_type: 'application/zip',
      });
      assert(false, '21b. Unsupported file extension .zip must throw');
    } catch (err: any) {
      assert(err instanceof GoogleDriveAdapterError, '21b. Unsupported extension .zip rejected');
    }
  }

  // -------------------------------------------------------------
  // 22. No taxonomy inference
  // -------------------------------------------------------------
  {
    // Folder name, filename, and MIME type must NEVER be used to guess missing taxonomy
    const inferredAttempt = {
      parent_folder_id: 'academics/computer-networks',
      name: 'ARP Protocol Reference.pdf',
      file_name: 'ARP Protocol Reference.pdf',
      file_type: 'application/pdf',
      // Explicitly omit section and category
      topic: 'arp',
      content_type: 'study_material',
      title: 'ARP Protocol Reference',
    };

    try {
      googleDriveAdapter.adapt(inferredAttempt as any);
      assert(false, '22. Adapter must NEVER infer section from folder name or file name');
    } catch (err: any) {
      assert(err instanceof GoogleDriveAdapterError, '22. Safely rejected missing section instead of inferring');
      assert(err.errors.some((e: string) => e.includes('section')), '22a. Missing section reported explicitly');
    }
  }

  // -------------------------------------------------------------
  // 23. No network calls
  // -------------------------------------------------------------
  {
    const adapterSource = fs.readFileSync(
      path.join(process.cwd(), 'src/services/adapters/googleDriveAdapter.ts'),
      'utf8'
    );
    assert(!adapterSource.includes('fetch('), '23. Adapter contains zero fetch calls');
    assert(
      !/import.*from\s+['"]axios['"]/i.test(adapterSource) && !/require\(['"]axios['"]\)/.test(adapterSource),
      '23a. Adapter does not import or call axios'
    );
    assert(!adapterSource.includes("from 'http'"), '23b. Adapter does not import http');
    assert(!adapterSource.includes("from 'https'"), '23c. Adapter does not import https');
    assert(!adapterSource.includes("from 'net'"), '23d. Adapter does not import net');
  }

  // -------------------------------------------------------------
  // 24. No Google API imports
  // -------------------------------------------------------------
  {
    const adapterSource = fs.readFileSync(
      path.join(process.cwd(), 'src/services/adapters/googleDriveAdapter.ts'),
      'utf8'
    );
    assert(
      !/import.*from\s+['"]googleapis['"]/i.test(adapterSource) && !/require\(['"]googleapis['"]\)/.test(adapterSource),
      '24. Adapter does not import googleapis'
    );
    assert(!adapterSource.includes('@google-cloud'), '24a. Adapter does not import @google-cloud');
    assert(!adapterSource.includes('drive_v3'), '24b. Adapter does not reference drive_v3');
    assert(!adapterSource.includes('google.drive'), '24c. Adapter does not instantiate google.drive');
  }

  // -------------------------------------------------------------
  // 25. No OAuth implementation
  // -------------------------------------------------------------
  {
    const adapterSource = fs.readFileSync(
      path.join(process.cwd(), 'src/services/adapters/googleDriveAdapter.ts'),
      'utf8'
    );
    assert(!adapterSource.includes('OAuth2Client'), '25. Adapter does not use OAuth2Client');
    assert(!adapterSource.includes('refresh_token'), '25a. Adapter does not handle refresh_token');
    assert(!adapterSource.includes('access_token'), '25b. Adapter does not handle access_token');
    assert(!/process\.env\.GOOGLE_CLIENT_ID/.test(adapterSource), '25c. Adapter does not access GOOGLE_CLIENT_ID');
    assert(!/process\.env\.GOOGLE_CLIENT_SECRET/.test(adapterSource), '25d. Adapter does not access GOOGLE_CLIENT_SECRET');
  }

  // -------------------------------------------------------------
  // 26. No secrets in output
  // -------------------------------------------------------------
  {
    const result = googleDriveAdapter.adapt({
      ...baseTaxonomy,
      file_id: 'test-secret-check',
      web_view_link: 'https://drive.google.com/file/d/test-secret-check/view',
    });
    const serialized = JSON.stringify(result);
    assert(!serialized.includes('service_role'), '26. Output contains zero service_role references');
    assert(!serialized.includes('SUPABASE_SECRET_KEY'), '26a. Output contains zero secret key references');
    assert(!serialized.includes('bearer'), '26b. Output contains zero bearer tokens');
    assert(!serialized.includes('client_secret'), '26c. Output contains zero client_secret references');
  }

  // -------------------------------------------------------------
  // 27. Existing adapter interface compatibility
  // -------------------------------------------------------------
  {
    assert(typeof googleDriveAdapter.adapt === 'function', '27. googleDriveAdapter exposes adapt()');
    assert(typeof googleDriveAdapter.tryAdapt === 'function', '27a. googleDriveAdapter exposes tryAdapt()');
    assert(googleDriveAdapter.system === 'google-drive', '27b. googleDriveAdapter defines system: google-drive');

    // Test tryAdapt non-throwing success
    const trySuccess = googleDriveAdapter.tryAdapt(baseTaxonomy);
    assert(trySuccess.success === true, '27c. tryAdapt returns success: true for valid input');
    if (trySuccess.success) {
      assert(trySuccess.result.manifest.title === baseTaxonomy.title, '27d. tryAdapt returns valid adapted manifest');
    }

    // Test tryAdapt non-throwing failure
    const tryFail = googleDriveAdapter.tryAdapt({ ...baseTaxonomy, section: 'invalid_sec' });
    assert(tryFail.success === false, '27e. tryAdapt returns success: false for invalid input');
    if (!tryFail.success) {
      assert(tryFail.errors.length > 0, '27f. tryAdapt returns error list without throwing uncaught exceptions');
    }
  }

  // -------------------------------------------------------------
  // 28. Google Native MIME Type and Classifier Helpers
  // -------------------------------------------------------------
  {
    assert(isGoogleNativeDocument(GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT), '28. Google Docs recognized as native doc');
    assert(isGoogleNativeDocument(GOOGLE_DRIVE_NATIVE_MIME_TYPES.SPREADSHEET), '28a. Google Sheets recognized as native doc');
    assert(isGoogleNativeDocument(GOOGLE_DRIVE_NATIVE_MIME_TYPES.PRESENTATION), '28b. Google Slides recognized as native doc');
    assert(!isGoogleNativeDocument(GOOGLE_DRIVE_BINARY_MIME_TYPES.PDF), '28c. PDF is NOT recognized as native doc');

    assert(classifyGoogleDriveItem(GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT) === 'google-native', '28d. Classify Google Docs as google-native');
    assert(classifyGoogleDriveItem(GOOGLE_DRIVE_BINARY_MIME_TYPES.PDF) === 'binary', '28e. Classify PDF as binary');
    assert(classifyGoogleDriveItem(GOOGLE_DRIVE_BINARY_MIME_TYPES.DOCX) === 'binary', '28f. Classify DOCX as binary');
    assert(classifyGoogleDriveItem('unknown/mime') === 'unknown', '28g. Classify unrecognized MIME as unknown');

    assert(GOOGLE_NATIVE_EXPORT_TARGETS[GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT].includes('application/pdf'), '28h. Google Docs export targets include PDF');
  }

  console.log('\n================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runGoogleDriveAdapterTests().catch((err) => {
  console.error('Fatal error in Step 21 test suite:', err);
  process.exit(1);
});
