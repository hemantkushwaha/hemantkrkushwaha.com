/**
 * Unit Tests for Central Content Ingestion Service (Step 9)
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * 
 * Tests:
 * A. Valid manifest
 * B. Missing title
 * C. Missing section
 * D. Missing category
 * E. Missing topic
 * F. Invalid section
 * G. Invalid content_type
 * H. Duplicate slug
 * I. Duplicate tags
 * J. Invalid relationship
 * K. Self relationship
 * L. Empty optional fields
 * 
 * IMPORTANT:
 * All tests execute against an in-memory mock database fixture.
 * ZERO queries or mutations touch the production Supabase database.
 */

import { ingestContent, generateDeterministicSlug } from '../src/services/contentIngestionService';
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
      let currentFilter: ((row: any) => boolean) = () => true;

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
          const matched = table.find(currentFilter);
          return { data: matched || null, error: null };
        },
        single: async () => {
          const matched = table.find(currentFilter);
          if (!matched) return { data: null, error: { message: 'Not found' } };
          return { data: matched, error: null };
        },
        insert: (payload: any) => {
          const records = Array.isArray(payload) ? payload : [payload];
          const inserted: any[] = [];
          for (const item of records) {
            const newRecord = {
              id: item.id || `mock-uuid-${Math.random().toString(36).substring(2, 9)}`,
              created_at: new Date().toISOString(),
              ...item,
            };
            table.push(newRecord);
            inserted.push(newRecord);
          }

          const insertBuilder: any = {
            select: (_cols?: string) => insertBuilder,
            single: async () => ({ data: inserted[0], error: null }),
            then: (resolve: any) => resolve({ data: inserted, error: null }),
          };
          return insertBuilder;
        },
      };

      return builder;
    },
  };
}

async function runStep9UnitTests() {
  console.log('=== RUNNING STEP 9 UNIT TESTS (A through L) ===\n');
  const results: Record<string, boolean> = {};

  // Test A: Valid manifest
  {
    const mockClient = createMockSupabaseClient();
    const manifest: ContentManifest = {
      section: 'academics',
      category: 'computer-networks',
      topic: 'arp',
      content_type: 'study_material',
      title: 'ARP – Address Resolution Protocol',
      description: 'Lecture notes on Address Resolution Protocol',
      tags: ['ARP', 'IPv4', 'Networking'],
      language: 'en',
      visibility: 'public',
      published: false,
    };
    const res = await ingestContent(manifest, { client: mockClient });
    const passed =
      res.success === true &&
      res.slug === 'arp-address-resolution-protocol' &&
      res.topic === 'arp' &&
      res.tagsCreated === 3 &&
      res.tagsAssociated === 3 &&
      res.content !== null &&
      mockClient._db.content.length === 1;
    results['A. Valid manifest'] = passed;
    console.log(`[Test A] Valid manifest: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Test B: Missing title
  {
    const mockClient = createMockSupabaseClient();
    const manifest = {
      section: 'academics',
      category: 'computer-networks',
      topic: 'arp',
      content_type: 'study_material',
      title: '   ',
    };
    const res = await ingestContent(manifest, { client: mockClient });
    const passed = res.success === false && res.errors.some((e) => e.includes('title'));
    results['B. Missing title'] = passed;
    console.log(`[Test B] Missing title: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Test C: Missing section
  {
    const mockClient = createMockSupabaseClient();
    const manifest = {
      category: 'computer-networks',
      topic: 'arp',
      content_type: 'study_material',
      title: 'Network Fundamentals',
    };
    const res = await ingestContent(manifest, { client: mockClient });
    const passed = res.success === false && res.errors.some((e) => e.includes('section'));
    results['C. Missing section'] = passed;
    console.log(`[Test C] Missing section: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Test D: Missing category
  {
    const mockClient = createMockSupabaseClient();
    const manifest = {
      section: 'academics',
      category: '  ',
      topic: 'arp',
      content_type: 'study_material',
      title: 'Network Fundamentals',
    };
    const res = await ingestContent(manifest, { client: mockClient });
    const passed = res.success === false && res.errors.some((e) => e.includes('category'));
    results['D. Missing category'] = passed;
    console.log(`[Test D] Missing category: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Test E: Missing topic
  {
    const mockClient = createMockSupabaseClient();
    const manifest = {
      section: 'academics',
      category: 'computer-networks',
      topic: '',
      content_type: 'study_material',
      title: 'Network Fundamentals',
    };
    const res = await ingestContent(manifest, { client: mockClient });
    const passed = res.success === false && res.errors.some((e) => e.includes('topic'));
    results['E. Missing topic'] = passed;
    console.log(`[Test E] Missing topic: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Test F: Invalid section
  {
    const mockClient = createMockSupabaseClient();
    const manifest = {
      section: 'unauthorized_section',
      category: 'computer-networks',
      topic: 'arp',
      content_type: 'study_material',
      title: 'Network Fundamentals',
    };
    const res = await ingestContent(manifest, { client: mockClient });
    const passed = res.success === false && res.errors.some((e) => e.includes('Invalid section'));
    results['F. Invalid section'] = passed;
    console.log(`[Test F] Invalid section: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Test G: Invalid content_type
  {
    const mockClient = createMockSupabaseClient();
    const manifest = {
      section: 'academics',
      category: 'computer-networks',
      topic: 'arp',
      content_type: 'invalid_custom_type',
      title: 'Network Fundamentals',
    };
    const res = await ingestContent(manifest, { client: mockClient });
    const passed = res.success === false && res.errors.some((e) => e.includes('Invalid content_type'));
    results['G. Invalid content_type'] = passed;
    console.log(`[Test G] Invalid content_type: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Test H: Duplicate slug (existing slug should NOT be overwritten)
  {
    const mockClient = createMockSupabaseClient();
    // Pre-seed mock DB with existing publication
    mockClient._db.content.push({
      id: 'existing-id-1',
      title: 'ARP – Address Resolution Protocol',
      slug: 'arp-address-resolution-protocol',
      section: 'academics',
      category: 'computer-networks',
      content_type: 'study_material',
    });

    const manifest: ContentManifest = {
      section: 'academics',
      category: 'computer-networks',
      topic: 'arp',
      content_type: 'study_material',
      title: 'ARP – Address Resolution Protocol', // Produces identical slug
    };
    const res = await ingestContent(manifest, { client: mockClient });
    const passed =
      res.success === false &&
      res.errors.some((e) => e.includes('Duplicate content error') && e.includes('already exists')) &&
      mockClient._db.content.length === 1; // Content count did not increase
    results['H. Duplicate slug'] = passed;
    console.log(`[Test H] Duplicate slug: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Test I: Duplicate tags (normalized, deduplicated safely)
  {
    const mockClient = createMockSupabaseClient();
    const manifest: ContentManifest = {
      section: 'academics',
      category: 'computer-networks',
      topic: 'arp',
      content_type: 'study_material',
      title: 'Network Packet Analysis',
      tags: ['Networking', ' networking ', 'NETWORKING', 'IPv4', 'ipv4 '],
    };
    const res = await ingestContent(manifest, { client: mockClient });
    const passed =
      res.success === true &&
      res.tagsCreated === 2 && // Only 2 unique tags created: 'Networking' and 'IPv4'
      res.tagsAssociated === 2 &&
      mockClient._db.tags.length === 2;
    results['I. Duplicate tags'] = passed;
    console.log(`[Test I] Duplicate tags: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Test J: Invalid relationship (unresolvable target content skipped to prevent broken link)
  {
    const mockClient = createMockSupabaseClient();
    const manifest: ContentManifest = {
      section: 'academics',
      category: 'computer-networks',
      topic: 'arp',
      content_type: 'study_material',
      title: 'Ethernet Framing Principles',
      related_content: ['nonexistent-target-slug-999'],
    };
    const res = await ingestContent(manifest, { client: mockClient });
    const passed =
      res.success === true &&
      res.relationshipsCreated === 0 &&
      mockClient._db.content_relationships.length === 0 &&
      res.warnings !== undefined &&
      res.warnings.some((w) => w.includes('could not be resolved'));
    results['J. Invalid relationship'] = passed;
    console.log(`[Test J] Invalid relationship: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Test K: Self relationship (prevent linking content to itself)
  {
    const mockClient = createMockSupabaseClient();
    const manifest: ContentManifest = {
      section: 'academics',
      category: 'computer-networks',
      topic: 'arp',
      content_type: 'study_material',
      title: 'Self Linking Treatise',
      related_content: ['self-linking-treatise'], // Identical to generated slug
    };
    const res = await ingestContent(manifest, { client: mockClient });
    const passed =
      mockClient._db.content_relationships.length === 0 &&
      res.errors.some((e) => e.includes('Self-relationship prevented'));
    results['K. Self relationship'] = passed;
    console.log(`[Test K] Self relationship: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Test L: Empty optional fields (normalized safely to null)
  {
    const mockClient = createMockSupabaseClient();
    const manifest: ContentManifest = {
      section: 'writings',
      category: 'Reflections',
      topic: 'contemplation',
      content_type: 'reflection',
      title: 'Quiet Observation',
      subcategory: '   ',
      description: '',
      external_url: '  ',
      source_url: '',
      file_name: '   ',
    };
    const res = await ingestContent(manifest, { client: mockClient });
    const createdItem = mockClient._db.content[0];
    const passed =
      res.success === true &&
      createdItem !== undefined &&
      createdItem.subcategory === null &&
      createdItem.description === null &&
      createdItem.external_url === null &&
      createdItem.file_url === null;
    results['L. Empty optional fields'] = passed;
    console.log(`[Test L] Empty optional fields: ${passed ? 'PASS' : 'FAIL'}`);
  }

  console.log('\n=== TEST RESULTS SUMMARY ===');
  let allPass = true;
  for (const [name, passed] of Object.entries(results)) {
    console.log(`${name}: ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) allPass = false;
  }

  if (!allPass) {
    console.error('\nOne or more tests failed.');
    process.exit(1);
  } else {
    console.log('\nALL UNIT TESTS (A through L) PASSED SUCCESSFULLY.');
  }
}

runStep9UnitTests().catch((err) => {
  console.error('Test execution exception:', err);
  process.exit(1);
});
