/**
 * Unit & Integration Test Suite: Step 17 — NotebookLM Export Package & Automation Workflow
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 17 — NotebookLM Export Package Foundation
 * 
 * Verifies:
 * 1. Valid package accepted
 * 2. package_version validated
 * 3. NotebookLM source validated
 * 4. section preserved
 * 5. category preserved
 * 6. topic preserved
 * 7. content_type preserved
 * 8. title preserved
 * 9. description preserved
 * 10. tags preserved
 * 11. body preserved
 * 12. Markdown preserved
 * 13. code blocks preserved
 * 14. tables preserved
 * 15. links preserved
 * 16. source_id preserved
 * 17. source_url preserved
 * 18. generated_at validated
 * 19. Missing section rejected
 * 20. Missing category rejected
 * 21. Missing topic rejected
 * 22. Missing content_type rejected
 * 23. Missing title rejected
 * 24. Invalid source rejected
 * 25. Invalid package version rejected
 * 26. Invalid content rejected
 * 27. Oversized file rejected
 * 28. Invalid file type rejected
 * 29. File metadata preserved
 * 30. Binary data never uploaded
 * 31. No Supabase import
 * 32. No Storage import
 * 33. No external network call
 * 34. Converted manifest is valid Manifest v1.0
 * 35. Converted manifest preserves taxonomy
 * 36. Converted manifest preserves content
 * 37. Existing NotebookLM adapter is reused
 * 38. Existing manifest validation is reused
 */

import fs from 'fs';
import path from 'path';
import {
  validateNotebookLMExportPackage,
  parseNotebookLMExportPackage,
  tryParseNotebookLMExportPackage,
  convertNotebookLMExportPackageToManifest,
  NotebookLMExportPackageError,
  MAX_PACKAGE_FILE_SIZE_BYTES,
} from '../src/services/notebookLMExportPackageService.js';
import { NotebookLMExportPackage } from '../src/types/notebookLMExportPackage.js';
import { notebookLMAdapter } from '../src/services/adapters/notebookLMAdapter.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

// Sample rich Markdown body containing headers, math, code blocks, tables, and links
const sampleRichBody = `# Address Resolution Protocol (ARP)

## 1. Protocol Architecture
The Address Resolution Protocol operates between the Network and Data Link layers.

### Mathematical Representation
$$\\text{Ethernet Payload} = 1500 \\text{ bytes}$$
$$E = mc^2$$

### Protocol Header Structure
| Field | Bytes | Notes |
| :--- | :--- | :--- |
| HTYPE | 2 | Hardware Type: Ethernet (1) |
| PTYPE | 2 | Protocol Type: IPv4 (0x0800) |
| HLEN | 1 | Hardware Length: 6 |
| PLEN | 1 | Protocol Length: 4 |

### Implementation Snippet
\`\`\`python
def build_arp_frame(source_mac, target_ip):
    # Construct raw Ethernet frame
    return f"ARP:{source_mac}->{target_ip}"
\`\`\`

- Bullet item 1
- Bullet item 2

For additional technical details, see the official specification at [RFC 826](https://tools.ietf.org/html/rfc826).
`;

const baseValidPackage: NotebookLMExportPackage = {
  package_version: '1.0',
  source: {
    system: 'notebooklm',
    source_id: 'nb-12345',
    source_url: 'https://notebooklm.google.com/notebook/nb-12345',
    source_name: 'Computer Networks Research Lab',
    generated_at: '2026-09-19T00:00:00.000Z',
  },
  metadata: {
    section: 'academics',
    category: 'computer-networks',
    topic: 'arp',
    content_type: 'study_material',
    title: 'ARP Protocol Architecture and Packet Analysis',
    description: 'Comprehensive study guide on Address Resolution Protocol.',
    tags: ['networking', 'protocols', 'arp', 'ipv4'],
  },
  content: {
    body: sampleRichBody,
  },
};

export async function runStep17Tests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 17: NOTEBOOKLM EXPORT PACKAGE TESTS');
  console.log('================================================================');

  // -------------------------------------------------------------
  // 1. Valid package accepted
  // -------------------------------------------------------------
  {
    const validation = validateNotebookLMExportPackage(baseValidPackage);
    assert(validation.valid === true, '1. Valid package accepted');
    assert(validation.errors.length === 0, '1a. Valid package has zero validation errors');

    const parsed = parseNotebookLMExportPackage(baseValidPackage);
    assert(parsed !== null && typeof parsed === 'object', '1b. Successfully parsed valid package');
  }

  // -------------------------------------------------------------
  // 2. package_version validated
  // -------------------------------------------------------------
  {
    const validResult = validateNotebookLMExportPackage({
      ...baseValidPackage,
      package_version: '1.0',
    });
    assert(validResult.valid === true, '2. package_version validated');

    const missingVersionResult = validateNotebookLMExportPackage({
      ...baseValidPackage,
      package_version: undefined as any,
    });
    assert(missingVersionResult.valid === false, '2a. Missing package_version rejected');
    assert(
      missingVersionResult.errorCode === 'MISSING_MANIFEST_VERSION',
      '2b. Returns MISSING_MANIFEST_VERSION error code'
    );
  }

  // -------------------------------------------------------------
  // 3. NotebookLM source validated
  // -------------------------------------------------------------
  {
    const validSourceResult = validateNotebookLMExportPackage(baseValidPackage);
    assert(validSourceResult.valid === true, '3. NotebookLM source validated');

    const nonNotebookSourceResult = validateNotebookLMExportPackage({
      ...baseValidPackage,
      source: {
        system: 'external-provider' as any,
      },
    });
    assert(nonNotebookSourceResult.valid === false, '3a. Non-notebooklm source system rejected');
    assert(
      nonNotebookSourceResult.errorCode === 'INVALID_SOURCE_METADATA',
      '3b. Returns INVALID_SOURCE_METADATA error code'
    );
  }

  // -------------------------------------------------------------
  // 4-8. User Taxonomy Preservation (section, category, topic, content_type, title)
  // -------------------------------------------------------------
  {
    const converted = convertNotebookLMExportPackageToManifest(baseValidPackage);
    assert(converted.success === true, '4-8. Package converts to manifest successfully');
    assert(converted.manifest?.section === 'academics', '4. section preserved');
    assert(converted.manifest?.category === 'computer-networks', '5. category preserved');
    assert(converted.manifest?.topic === 'arp', '6. topic preserved');
    assert(converted.manifest?.content_type === 'study_material', '7. content_type preserved');
    assert(
      converted.manifest?.title === 'ARP Protocol Architecture and Packet Analysis',
      '8. title preserved'
    );
  }

  // -------------------------------------------------------------
  // 9-10. Optional metadata (description, tags) preserved
  // -------------------------------------------------------------
  {
    const converted = convertNotebookLMExportPackageToManifest(baseValidPackage);
    assert(
      converted.manifest?.description === 'Comprehensive study guide on Address Resolution Protocol.',
      '9. description preserved'
    );
    assert(
      Array.isArray(converted.manifest?.tags) && converted.manifest.tags.includes('networking'),
      '10. tags preserved'
    );
  }

  // -------------------------------------------------------------
  // 11-15. Content Integrity & Verbatim Preservation
  // -------------------------------------------------------------
  {
    const converted = convertNotebookLMExportPackageToManifest(baseValidPackage);
    const body = converted.manifest?.body || '';

    assert(body === sampleRichBody, '11. body preserved verbatim');
    assert(body.includes('## 1. Protocol Architecture'), '12. Markdown preserved');
    assert(body.includes('```python') && body.includes('def build_arp_frame'), '13. code blocks preserved');
    assert(body.includes('| Field | Bytes | Notes |'), '14. tables preserved');
    assert(body.includes('[RFC 826](https://tools.ietf.org/html/rfc826)'), '15. links preserved');
    assert(body.includes('$$\\text{Ethernet Payload} = 1500 \\text{ bytes}$$'), '15a. mathematical notation preserved');
  }

  // -------------------------------------------------------------
  // 16-18. Source provenance metadata preserved
  // -------------------------------------------------------------
  {
    const converted = convertNotebookLMExportPackageToManifest(baseValidPackage);
    const source = converted.manifest?.source;

    assert(source?.source_id === 'nb-12345', '16. source_id preserved');
    assert(source?.source_url === 'https://notebooklm.google.com/notebook/nb-12345', '17. source_url preserved');
    assert(source?.generated_at === '2026-09-19T00:00:00.000Z', '18. generated_at validated');
  }

  // -------------------------------------------------------------
  // 19. Missing section rejected
  // -------------------------------------------------------------
  {
    const invalidPkg = {
      ...baseValidPackage,
      metadata: { ...baseValidPackage.metadata, section: undefined as any },
    };
    const val = validateNotebookLMExportPackage(invalidPkg);
    assert(val.valid === false, '19. Missing section rejected');
    assert(val.errorCode === 'MISSING_REQUIRED_FIELD', '19a. Missing section returns MISSING_REQUIRED_FIELD');
  }

  // -------------------------------------------------------------
  // 20. Missing category rejected
  // -------------------------------------------------------------
  {
    const invalidPkg = {
      ...baseValidPackage,
      metadata: { ...baseValidPackage.metadata, category: '' },
    };
    const val = validateNotebookLMExportPackage(invalidPkg);
    assert(val.valid === false, '20. Missing category rejected');
    assert(val.errorCode === 'MISSING_REQUIRED_FIELD', '20a. Missing category returns MISSING_REQUIRED_FIELD');
  }

  // -------------------------------------------------------------
  // 21. Missing topic rejected
  // -------------------------------------------------------------
  {
    const invalidPkg = {
      ...baseValidPackage,
      metadata: { ...baseValidPackage.metadata, topic: '   ' },
    };
    const val = validateNotebookLMExportPackage(invalidPkg);
    assert(val.valid === false, '21. Missing topic rejected');
    assert(val.errorCode === 'MISSING_REQUIRED_FIELD', '21a. Missing topic returns MISSING_REQUIRED_FIELD');
  }

  // -------------------------------------------------------------
  // 22. Missing content_type rejected
  // -------------------------------------------------------------
  {
    const invalidPkg = {
      ...baseValidPackage,
      metadata: { ...baseValidPackage.metadata, content_type: undefined as any },
    };
    const val = validateNotebookLMExportPackage(invalidPkg);
    assert(val.valid === false, '22. Missing content_type rejected');
    assert(val.errorCode === 'MISSING_REQUIRED_FIELD', '22a. Missing content_type returns MISSING_REQUIRED_FIELD');
  }

  // -------------------------------------------------------------
  // 23. Missing title rejected
  // -------------------------------------------------------------
  {
    const invalidPkg = {
      ...baseValidPackage,
      metadata: { ...baseValidPackage.metadata, title: '' },
    };
    const val = validateNotebookLMExportPackage(invalidPkg);
    assert(val.valid === false, '23. Missing title rejected');
    assert(val.errorCode === 'MISSING_REQUIRED_FIELD', '23a. Missing title returns MISSING_REQUIRED_FIELD');
  }

  // -------------------------------------------------------------
  // 24. Invalid source rejected
  // -------------------------------------------------------------
  {
    const invalidPkg = {
      ...baseValidPackage,
      source: {
        system: 'not-notebooklm' as any,
      },
    };
    const val = validateNotebookLMExportPackage(invalidPkg);
    assert(val.valid === false, '24. Invalid source rejected');
    assert(val.errorCode === 'INVALID_SOURCE_METADATA', '24a. Invalid source system returns INVALID_SOURCE_METADATA');
  }

  // -------------------------------------------------------------
  // 25. Invalid package version rejected
  // -------------------------------------------------------------
  {
    const invalidPkg = {
      ...baseValidPackage,
      package_version: '2.0',
    };
    const val = validateNotebookLMExportPackage(invalidPkg);
    assert(val.valid === false, '25. Invalid package version rejected');
    assert(val.errorCode === 'UNSUPPORTED_MANIFEST_VERSION', '25a. Unsupported version returns UNSUPPORTED_MANIFEST_VERSION');
  }

  // -------------------------------------------------------------
  // 26. Invalid content rejected
  // -------------------------------------------------------------
  {
    const invalidPkgEmptyBody = {
      ...baseValidPackage,
      content: { body: '' },
    };
    const val = validateNotebookLMExportPackage(invalidPkgEmptyBody);
    assert(val.valid === false, '26. Invalid content (empty body) rejected');

    const invalidPkgMissingContent = {
      ...baseValidPackage,
      content: undefined as any,
    };
    const valMissing = validateNotebookLMExportPackage(invalidPkgMissingContent);
    assert(valMissing.valid === false, '26a. Missing content block rejected');
    assert(valMissing.errorCode === 'MISSING_REQUIRED_FIELD', '26b. Returns MISSING_REQUIRED_FIELD');
  }

  // -------------------------------------------------------------
  // 27. Oversized file rejected (> 50MB)
  // -------------------------------------------------------------
  {
    const oversizedPkg: NotebookLMExportPackage = {
      ...baseValidPackage,
      file: {
        file_name: 'huge_document.pdf',
        file_type: 'application/pdf',
        file_size: MAX_PACKAGE_FILE_SIZE_BYTES + 1024,
      },
    };
    const val = validateNotebookLMExportPackage(oversizedPkg);
    assert(val.valid === false, '27. Oversized file rejected');
    assert(val.errorCode === 'PAYLOAD_TOO_LARGE', '27a. Returns PAYLOAD_TOO_LARGE error code');
  }

  // -------------------------------------------------------------
  // 28. Invalid file type rejected
  // -------------------------------------------------------------
  {
    const invalidFilePkg: NotebookLMExportPackage = {
      ...baseValidPackage,
      file: {
        file_name: 'script.exe',
        file_type: 'application/x-msdownload',
      },
    };
    const val = validateNotebookLMExportPackage(invalidFilePkg);
    assert(val.valid === false, '28. Invalid file type rejected');
    assert(val.errorCode === 'UNSUPPORTED_MEDIA_TYPE', '28a. Returns UNSUPPORTED_MEDIA_TYPE error code');
  }

  // -------------------------------------------------------------
  // 29. File metadata preserved
  // -------------------------------------------------------------
  {
    const pkgWithFile: NotebookLMExportPackage = {
      ...baseValidPackage,
      file: {
        file_name: 'lecture_notes.pdf',
        file_type: 'application/pdf',
        file_size: 1048576,
      },
    };
    const converted = convertNotebookLMExportPackageToManifest(pkgWithFile);
    assert(converted.success === true, '29. File metadata preserved');
    assert(converted.manifest?.file_name === 'lecture_notes.pdf', '29a. file_name preserved in manifest');
    assert(converted.manifest?.file_type === 'application/pdf', '29b. file_type preserved in manifest');
    assert(converted.manifest?.file_size === 1048576, '29c. file_size preserved in manifest');
  }

  // -------------------------------------------------------------
  // 30. Binary data never uploaded
  // -------------------------------------------------------------
  {
    const testBuffer = Buffer.from('%PDF-1.4 simulated binary document for pure in-memory test');
    const pkgWithBuffer: NotebookLMExportPackage = {
      ...baseValidPackage,
      file: {
        file_name: 'test_doc.pdf',
        file_type: 'application/pdf',
        file_size: testBuffer.byteLength,
        file_data: testBuffer,
      },
    };
    const converted = convertNotebookLMExportPackageToManifest(pkgWithBuffer);
    assert(converted.success === true, '30. Package with binary buffer processed successfully');
    assert(converted.fileResource !== undefined, '30a. fileResource created in memory');
    assert(converted.fileResource?.data === testBuffer, '30b. In-memory buffer preserved without network upload');
  }

  // -------------------------------------------------------------
  // 31. No Supabase import in service
  // -------------------------------------------------------------
  {
    const serviceSource = fs.readFileSync(
      path.join(process.cwd(), 'src/services/notebookLMExportPackageService.ts'),
      'utf8'
    );
    assert(!serviceSource.includes('@supabase/supabase-js'), '31. No Supabase import');
    assert(!serviceSource.includes('createClient'), '31a. No createClient call');
  }

  // -------------------------------------------------------------
  // 32. No Storage import in service
  // -------------------------------------------------------------
  {
    const serviceSource = fs.readFileSync(
      path.join(process.cwd(), 'src/services/notebookLMExportPackageService.ts'),
      'utf8'
    );
    assert(!serviceSource.includes('storageService'), '32. No Storage import');
    assert(!serviceSource.includes('supabase.storage'), '32a. No supabase.storage reference');
    assert(!serviceSource.includes('uploadFile'), '32b. No uploadFile call');
  }

  // -------------------------------------------------------------
  // 33. No external network call
  // -------------------------------------------------------------
  {
    const serviceSource = fs.readFileSync(
      path.join(process.cwd(), 'src/services/notebookLMExportPackageService.ts'),
      'utf8'
    );
    assert(!serviceSource.includes('fetch('), '33. No external fetch call');
    assert(!serviceSource.includes('axios'), '33a. No axios import or call');
  }

  // -------------------------------------------------------------
  // 34. Converted manifest is valid Manifest v1.0
  // -------------------------------------------------------------
  {
    const converted = convertNotebookLMExportPackageToManifest(baseValidPackage);
    assert(converted.success === true, '34. Converted manifest is valid Manifest v1.0');
    assert(converted.manifest?.manifest_version === '1.0', '34a. manifest_version is 1.0');
  }

  // -------------------------------------------------------------
  // 35. Converted manifest preserves taxonomy
  // -------------------------------------------------------------
  {
    const customTaxonomyPkg: NotebookLMExportPackage = {
      ...baseValidPackage,
      metadata: {
        section: 'philosophy',
        category: 'epistemology',
        topic: 'truth',
        content_type: 'essay',
        title: 'On the Nature of Truth and Verification',
      },
    };
    const converted = convertNotebookLMExportPackageToManifest(customTaxonomyPkg);
    assert(converted.success === true, '35. Converted manifest preserves taxonomy');
    assert(converted.manifest?.section === 'philosophy', '35a. Section philosophy preserved');
    assert(converted.manifest?.category === 'epistemology', '35b. Category epistemology preserved');
    assert(converted.manifest?.topic === 'truth', '35c. Topic truth preserved');
    assert(converted.manifest?.content_type === 'essay', '35d. Content type essay preserved');
    assert(converted.manifest?.title === 'On the Nature of Truth and Verification', '35e. Title preserved');
  }

  // -------------------------------------------------------------
  // 36. Converted manifest preserves content
  // -------------------------------------------------------------
  {
    const customContentPkg: NotebookLMExportPackage = {
      ...baseValidPackage,
      content: {
        body: 'Verbatim content test: preserving exact formatting and math: $\\alpha + \\beta = \\gamma$.',
      },
    };
    const converted = convertNotebookLMExportPackageToManifest(customContentPkg);
    assert(
      converted.manifest?.body ===
        'Verbatim content test: preserving exact formatting and math: $\\alpha + \\beta = \\gamma$.',
      '36. Converted manifest preserves content'
    );
  }

  // -------------------------------------------------------------
  // 37. Existing NotebookLM adapter is reused
  // -------------------------------------------------------------
  {
    // Spy on tryAdapt to confirm delegation
    const spy = { adapterCalled: false };
    const originalTryAdapt = notebookLMAdapter.tryAdapt.bind(notebookLMAdapter);
    notebookLMAdapter.tryAdapt = (input: any) => {
      spy.adapterCalled = true;
      return originalTryAdapt(input);
    };

    convertNotebookLMExportPackageToManifest(baseValidPackage);
    assert(spy.adapterCalled === true, '37. Existing NotebookLM adapter is reused');

    // Restore adapter
    notebookLMAdapter.tryAdapt = originalTryAdapt;
  }

  // -------------------------------------------------------------
  // 38. Existing manifest validation is reused
  // -------------------------------------------------------------
  {
    // Test that invalid section through adapter fails with existing validation message
    const invalidSectionPkg: NotebookLMExportPackage = {
      ...baseValidPackage,
      metadata: {
        ...baseValidPackage.metadata,
        section: 'invalid-section-xyz' as any,
      },
    };
    const converted = convertNotebookLMExportPackageToManifest(invalidSectionPkg);
    assert(converted.success === false, '38. Existing manifest validation is reused');
    assert(converted.errorCode === 'INVALID_SECTION', '38a. Invalid section flagged with INVALID_SECTION');
  }

  console.log('\n================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run when directly executed
runStep17Tests();
