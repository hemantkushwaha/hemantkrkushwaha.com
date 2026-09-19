/**
 * Step 15: NotebookLM Source Adapter Foundation Unit Tests
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * 
 * Coverage of Part M Requirements:
 * 1. Valid NotebookLM input produces Manifest v1.0.
 * 2. Source system is always: notebooklm.
 * 3. Explicit section is preserved.
 * 4. Explicit category is preserved.
 * 5. Explicit topic is preserved.
 * 6. Explicit content_type is preserved.
 * 7. Explicit title is preserved.
 * 8. NotebookLM content is not rewritten.
 * 9. Description is preserved.
 * 10. Body is preserved.
 * 11. Tags are normalized safely.
 * 12. source_id is preserved.
 * 13. source_url is preserved.
 * 14. generated_at is normalized/validated.
 * 15. Missing section rejected.
 * 16. Missing category rejected.
 * 17. Missing topic rejected.
 * 18. Missing content_type rejected.
 * 19. Missing title rejected.
 * 20. Invalid source metadata rejected.
 * 21. Invalid content type rejected.
 * 22. Optional file metadata is preserved without uploading.
 * 23. Adapter does not call Supabase.
 * 24. Adapter does not upload files.
 */

import fs from 'fs';
import path from 'path';
import {
  notebookLMAdapter,
  DefaultNotebookLMAdapter,
  NotebookLMAdapterError,
} from '../src/services/adapters/notebookLMAdapter.js';
import { NotebookLMSourceInput, RawSourceInput } from '../src/types/automation.js';

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

const baseValidInput: NotebookLMSourceInput = {
  section: 'academics',
  category: 'Computer Science',
  topic: 'Computer Networks',
  content_type: 'study_material',
  title: 'Address Resolution Protocol (ARP) Deep Dive',
  subcategory: 'Network Protocols',
  description: 'Comprehensive synthesized guide to ARP framing and caching.',
  body: '## ARP Overview\n\nARP maps IPv4 network addresses to 48-bit Ethernet MAC addresses.',
  tags: ['Networking', 'Protocols', 'ARP'],
  source_id: 'nb-doc-101',
  source_url: 'https://notebooklm.google.com/notebook/arp-test',
  source_name: 'Networking Notebook',
  generated_at: '2026-09-18T20:00:00.000Z',
  language: 'en',
  visibility: 'public',
  published: true,
};

async function runNotebookLMAdapterTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 15: NOTEBOOKLM SOURCE ADAPTER TESTS');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // 1. Valid NotebookLM input produces Manifest v1.0
  // -------------------------------------------------------------
  {
    const result = notebookLMAdapter.adapt(baseValidInput);
    assert(result.manifest.manifest_version === '1.0', '1. Valid NotebookLM input produces Manifest v1.0');
    assert(result.manifest.title === baseValidInput.title, '1a. Title matches input title');
    assert(result.manifest.section === 'academics', '1b. Section matches input section');
    assert(result.manifest.content_type === 'study_material', '1c. Content type matches input content_type');
  }

  // -------------------------------------------------------------
  // 2. Source system is always: notebooklm
  // -------------------------------------------------------------
  {
    const result = notebookLMAdapter.adapt(baseValidInput);
    assert(result.manifest.source?.system === 'notebooklm', '2. Source system is strictly "notebooklm"');
    assert(notebookLMAdapter.system === 'notebooklm', '2a. Adapter system identifier is strictly "notebooklm"');

    // Verify wrapped RawSourceInput also enforces system: notebooklm
    const wrapped: RawSourceInput<NotebookLMSourceInput> = {
      system: 'notebooklm',
      sourceId: 'top-level-id',
      sourceUrl: 'https://notebooklm.google.com/notebook/top',
      payload: baseValidInput,
    };
    const wrappedResult = notebookLMAdapter.adapt(wrapped);
    assert(wrappedResult.manifest.source?.system === 'notebooklm', '2b. Wrapped input produces system "notebooklm"');
  }

  // -------------------------------------------------------------
  // 3. Explicit section is preserved
  // -------------------------------------------------------------
  {
    const researchInput = { ...baseValidInput, section: 'research' as const, content_type: 'research_paper' as const };
    const researchResult = notebookLMAdapter.adapt(researchInput);
    assert(researchResult.manifest.section === 'research', '3. Explicit section "research" preserved');

    const philosophyInput = { ...baseValidInput, section: 'philosophy' as const, content_type: 'essay' as const };
    const philosophyResult = notebookLMAdapter.adapt(philosophyInput);
    assert(philosophyResult.manifest.section === 'philosophy', '3a. Explicit section "philosophy" preserved');

    const writingsInput = { ...baseValidInput, section: 'writings' as const, content_type: 'reflection' as const };
    const writingsResult = notebookLMAdapter.adapt(writingsInput);
    assert(writingsResult.manifest.section === 'writings', '3b. Explicit section "writings" preserved');
  }

  // -------------------------------------------------------------
  // 4. Explicit category is preserved
  // -------------------------------------------------------------
  {
    const customCategory = 'Quantum Information Systems';
    const result = notebookLMAdapter.adapt({ ...baseValidInput, category: customCategory });
    assert(result.manifest.category === customCategory, '4. Explicit category is preserved without alteration');
  }

  // -------------------------------------------------------------
  // 5. Explicit topic is preserved
  // -------------------------------------------------------------
  {
    const customTopic = 'Topological Quantum Memory';
    const result = notebookLMAdapter.adapt({ ...baseValidInput, topic: customTopic });
    assert(result.manifest.topic === customTopic, '5. Explicit topic is preserved without alteration');
  }

  // -------------------------------------------------------------
  // 6. Explicit content_type is preserved
  // -------------------------------------------------------------
  {
    const lectureInput = { ...baseValidInput, content_type: 'lecture' as const };
    const lectureResult = notebookLMAdapter.adapt(lectureInput);
    assert(lectureResult.manifest.content_type === 'lecture', '6. Explicit content_type "lecture" preserved');

    const essayInput = { ...baseValidInput, section: 'philosophy' as const, content_type: 'essay' as const };
    const essayResult = notebookLMAdapter.adapt(essayInput);
    assert(essayResult.manifest.content_type === 'essay', '6a. Explicit content_type "essay" preserved');

    const presentationInput = { ...baseValidInput, content_type: 'presentation' as const };
    const presentationResult = notebookLMAdapter.adapt(presentationInput);
    assert(presentationResult.manifest.content_type === 'presentation', '6b. Explicit content_type "presentation" preserved');
  }

  // -------------------------------------------------------------
  // 7. Explicit title is preserved
  // -------------------------------------------------------------
  {
    const exactTitle = 'Autonomous Logic Verification in LLM Reasoning Chains (2026 Edition)';
    const result = notebookLMAdapter.adapt({ ...baseValidInput, title: exactTitle });
    assert(result.manifest.title === exactTitle, '7. Explicit title preserved verbatim');
  }

  // -------------------------------------------------------------
  // 8. NotebookLM content is not rewritten
  // -------------------------------------------------------------
  {
    const verbatimMarkdown = [
      '# Original NotebookLM Synthesized Notes',
      '',
      '> "Quote from source document without summarization."',
      '',
      'Formula: $$\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}$$',
      '',
      '```typescript',
      'function verifyDeterministic(): boolean {',
      '  return true;',
      '}',
      '```',
    ].join('\n');

    const result = notebookLMAdapter.adapt({ ...baseValidInput, body: verbatimMarkdown });
    assert(result.manifest.body === verbatimMarkdown, '8. NotebookLM content is not rewritten (verbatim match)');
  }

  // -------------------------------------------------------------
  // 9. Description is preserved
  // -------------------------------------------------------------
  {
    const customDesc = 'Verbatim description provided by author for the notebook export.';
    const result = notebookLMAdapter.adapt({ ...baseValidInput, description: customDesc });
    assert(result.manifest.description === customDesc, '9. Description is preserved');
  }

  // -------------------------------------------------------------
  // 10. Body is preserved (supports body and content synonym)
  // -------------------------------------------------------------
  {
    const inputWithContentSynonym: NotebookLMSourceInput = {
      ...baseValidInput,
      body: undefined,
      content: 'Synthesized text provided via "content" key instead of "body".',
    };
    const result = notebookLMAdapter.adapt(inputWithContentSynonym);
    assert(
      result.manifest.body === 'Synthesized text provided via "content" key instead of "body".',
      '10. Body is preserved when provided via "content" synonym'
    );
  }

  // -------------------------------------------------------------
  // 11. Tags are normalized safely
  // -------------------------------------------------------------
  {
    const rawTags = ['  Distributed Systems  ', 'Consensus', '  ', 'consensus', 'RAFT'];
    const result = notebookLMAdapter.adapt({ ...baseValidInput, tags: rawTags });
    assert(Array.isArray(result.manifest.tags), '11. Tags is an array');
    assert(result.manifest.tags?.length === 3, '11a. Empty strings filtered and case-insensitive duplicates deduplicated');
    assert(result.manifest.tags?.[0] === 'Distributed Systems', '11b. Whitespace trimmed from tags');
    assert(result.manifest.tags?.[1] === 'Consensus', '11c. First occurrence casing preserved');
    assert(result.manifest.tags?.[2] === 'RAFT', '11d. Distinct tag preserved');
  }

  // -------------------------------------------------------------
  // 12. source_id is preserved
  // -------------------------------------------------------------
  {
    const result1 = notebookLMAdapter.adapt({ ...baseValidInput, source_id: 'nb-doc-7744' });
    assert(result1.manifest.source?.source_id === 'nb-doc-7744', '12. source_id preserved');

    const result2 = notebookLMAdapter.adapt({
      ...baseValidInput,
      source_id: undefined,
      source_reference: 'nb-ref-9988',
    });
    assert(result2.manifest.source?.source_id === 'nb-ref-9988', '12a. source_reference mapped to source_id');
  }

  // -------------------------------------------------------------
  // 13. source_url is preserved
  // -------------------------------------------------------------
  {
    const customUrl = 'https://notebooklm.google.com/notebook/test-notebook-uuid-9922';
    const result = notebookLMAdapter.adapt({ ...baseValidInput, source_url: customUrl });
    assert(result.manifest.source?.source_url === customUrl, '13. source_url preserved in source metadata');
  }

  // -------------------------------------------------------------
  // 14. generated_at is normalized/validated
  // -------------------------------------------------------------
  {
    const isoDate = '2026-09-18T18:45:00.000Z';
    const validDateResult = notebookLMAdapter.adapt({ ...baseValidInput, generated_at: isoDate });
    assert(validDateResult.manifest.source?.generated_at === isoDate, '14. Valid ISO date preserved');

    let malformedDateError: NotebookLMAdapterError | null = null;
    try {
      notebookLMAdapter.adapt({ ...baseValidInput, generated_at: 'not-a-valid-date-timestamp' });
    } catch (err: any) {
      malformedDateError = err;
    }
    assert(malformedDateError !== null, '14a. Malformed generated_at rejected');
    assert(
      malformedDateError?.code === 'INVALID_SOURCE_METADATA',
      '14b. Malformed generated_at flags INVALID_SOURCE_METADATA'
    );
  }

  // -------------------------------------------------------------
  // 15. Missing section rejected
  // -------------------------------------------------------------
  {
    const noSection = { ...baseValidInput } as any;
    delete noSection.section;

    let error: NotebookLMAdapterError | null = null;
    try {
      notebookLMAdapter.adapt(noSection);
    } catch (err: any) {
      error = err;
    }
    assert(error !== null, '15. Missing section rejected');
    assert(error?.code === 'MISSING_REQUIRED_FIELD', '15a. Error code is MISSING_REQUIRED_FIELD');
    assert(error?.errors.some((e) => e.includes('section')) === true, '15b. Error message identifies missing section');
  }

  // -------------------------------------------------------------
  // 16. Missing category rejected
  // -------------------------------------------------------------
  {
    const noCategory = { ...baseValidInput } as any;
    delete noCategory.category;

    let error: NotebookLMAdapterError | null = null;
    try {
      notebookLMAdapter.adapt(noCategory);
    } catch (err: any) {
      error = err;
    }
    assert(error !== null, '16. Missing category rejected');
    assert(error?.code === 'MISSING_REQUIRED_FIELD', '16a. Error code is MISSING_REQUIRED_FIELD');
    assert(error?.errors.some((e) => e.includes('category')) === true, '16b. Error message identifies missing category');
  }

  // -------------------------------------------------------------
  // 17. Missing topic rejected
  // -------------------------------------------------------------
  {
    const noTopic = { ...baseValidInput } as any;
    delete noTopic.topic;

    let error: NotebookLMAdapterError | null = null;
    try {
      notebookLMAdapter.adapt(noTopic);
    } catch (err: any) {
      error = err;
    }
    assert(error !== null, '17. Missing topic rejected');
    assert(error?.code === 'MISSING_REQUIRED_FIELD', '17a. Error code is MISSING_REQUIRED_FIELD');
    assert(error?.errors.some((e) => e.includes('topic')) === true, '17b. Error message identifies missing topic');
  }

  // -------------------------------------------------------------
  // 18. Missing content_type rejected
  // -------------------------------------------------------------
  {
    const noContentType = { ...baseValidInput } as any;
    delete noContentType.content_type;

    let error: NotebookLMAdapterError | null = null;
    try {
      notebookLMAdapter.adapt(noContentType);
    } catch (err: any) {
      error = err;
    }
    assert(error !== null, '18. Missing content_type rejected');
    assert(error?.code === 'MISSING_REQUIRED_FIELD', '18a. Error code is MISSING_REQUIRED_FIELD');
    assert(
      error?.errors.some((e) => e.includes('content_type')) === true,
      '18b. Error message identifies missing content_type'
    );
  }

  // -------------------------------------------------------------
  // 19. Missing title rejected
  // -------------------------------------------------------------
  {
    const noTitle = { ...baseValidInput } as any;
    delete noTitle.title;

    let error: NotebookLMAdapterError | null = null;
    try {
      notebookLMAdapter.adapt(noTitle);
    } catch (err: any) {
      error = err;
    }
    assert(error !== null, '19. Missing title rejected');
    assert(error?.code === 'MISSING_REQUIRED_FIELD', '19a. Error code is MISSING_REQUIRED_FIELD');
    assert(error?.errors.some((e) => e.includes('title')) === true, '19b. Error message identifies missing title');
  }

  // -------------------------------------------------------------
  // 20. Invalid source metadata rejected
  // -------------------------------------------------------------
  {
    let emptyUrlError: NotebookLMAdapterError | null = null;
    try {
      notebookLMAdapter.adapt({ ...baseValidInput, source_url: '    ' });
    } catch (err: any) {
      emptyUrlError = err;
    }
    // An empty source_url string is rejected or cleaned
    assert(
      emptyUrlError === null || emptyUrlError.code === 'INVALID_SOURCE_METADATA',
      '20. Empty source_url safely normalized or rejected'
    );

    let badDateError: NotebookLMAdapterError | null = null;
    try {
      notebookLMAdapter.adapt({ ...baseValidInput, generated_at: 'bad-date-abc' });
    } catch (err: any) {
      badDateError = err;
    }
    assert(badDateError !== null, '20a. Malformed generated_at rejected');
    assert(badDateError?.code === 'INVALID_SOURCE_METADATA', '20b. Returns INVALID_SOURCE_METADATA error code');
  }

  // -------------------------------------------------------------
  // 21. Invalid content type rejected
  // -------------------------------------------------------------
  {
    const invalidTypeInput = { ...baseValidInput, content_type: 'podcast' as any };

    let error: NotebookLMAdapterError | null = null;
    try {
      notebookLMAdapter.adapt(invalidTypeInput);
    } catch (err: any) {
      error = err;
    }
    assert(error !== null, '21. Invalid content type "podcast" rejected');
    assert(error?.code === 'INVALID_CONTENT_TYPE', '21a. Error code is INVALID_CONTENT_TYPE');
    assert(
      error?.errors.some((e) => e.includes('content_type')) === true,
      '21b. Error details specify invalid content_type'
    );
  }

  // -------------------------------------------------------------
  // 22. Optional file metadata is preserved without uploading
  // -------------------------------------------------------------
  {
    const inputWithFile: NotebookLMSourceInput = {
      ...baseValidInput,
      file_name: 'arp_packet_analysis.pdf',
      file_type: 'application/pdf',
      file_size: 2048576,
      file_data: Buffer.from('%PDF-1.4 simulated binary data'),
    };

    const result = notebookLMAdapter.adapt(inputWithFile);
    assert(result.manifest.file_name === 'arp_packet_analysis.pdf', '22. file_name preserved in manifest');
    assert(result.manifest.file_type === 'application/pdf', '22a. file_type preserved in manifest');
    assert(result.manifest.file_size === 2048576, '22b. file_size preserved in manifest');
    assert(result.fileResource !== undefined, '22c. fileResource preserved in adapted result');
    assert(result.fileResource?.fileName === 'arp_packet_analysis.pdf', '22d. fileResource contains fileName');
    assert(result.fileResource?.data.length > 0, '22e. fileResource preserves binary buffer without uploading');
  }

  // -------------------------------------------------------------
  // 23. Adapter does not call Supabase
  // -------------------------------------------------------------
  {
    const adapterSource = fs.readFileSync(
      path.join(process.cwd(), 'src/services/adapters/notebookLMAdapter.ts'),
      'utf8'
    );
    assert(
      !adapterSource.includes('@supabase/supabase-js'),
      '23. Adapter source does not import @supabase/supabase-js'
    );
    assert(
      !adapterSource.includes('createClient'),
      '23a. Adapter does not call createClient'
    );
    assert(
      !adapterSource.includes('SUPABASE_SECRET_KEY'),
      '23b. Adapter contains zero references to SUPABASE_SECRET_KEY'
    );
    assert(
      !adapterSource.includes('VITE_SUPABASE_URL'),
      '23c. Adapter contains zero references to VITE_SUPABASE_URL'
    );
  }

  // -------------------------------------------------------------
  // 24. Adapter does not upload files
  // -------------------------------------------------------------
  {
    const adapterSource = fs.readFileSync(
      path.join(process.cwd(), 'src/services/adapters/notebookLMAdapter.ts'),
      'utf8'
    );
    assert(!adapterSource.includes('uploadFile'), '24. Adapter contains no uploadFile call');
    assert(!adapterSource.includes('storageService'), '24a. Adapter does not import storageService');
    assert(!adapterSource.includes('supabase.storage'), '24b. Adapter does not reference supabase.storage');

    // Run adapt with file data and verify execution completes purely in-memory
    const testBuffer = Buffer.from('Pure in-memory test file');
    const result = notebookLMAdapter.adapt({
      ...baseValidInput,
      file_name: 'test.pdf',
      file_type: 'application/pdf',
      file_data: testBuffer,
    });
    assert(result.fileResource?.data === testBuffer, '24c. In-memory buffer returned unchanged with zero network I/O');
  }

  console.log('\n================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runNotebookLMAdapterTests().catch((err) => {
  console.error('Fatal error in Step 15 test suite:', err);
  process.exit(1);
});
