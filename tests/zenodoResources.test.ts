/**
 * Automated Verification Suite for Zenodo Educational Resources Integration
 * 
 * Tests:
 * 1. Zenodo metadata and DOI accuracy against official Zenodo records
 * 2. Academic section placement and "Study Material" category assignment
 * 3. Dynamic route resolution via /content/:slug
 * 4. Content service query integration and deduplication
 * 5. Tags and direct PDF download link validity
 */

import assert from 'node:assert';
import {
  zenodoResourceRecords,
  getZenodoContentItems,
  getZenodoContentItemBySlug,
  getZenodoMetadata,
} from '../src/data/zenodoResources.js';
import {
  getContentBySection,
  getContentByCategory,
  getContentBySlug,
  getContentTags,
} from '../src/services/contentService.js';

async function runTests() {
  console.log('🧪 RUNNING ZENODO EDUCATIONAL RESOURCES INTEGRATION TESTS');

  // --- 1. Authentic Zenodo Metadata & Record Count ---
  console.log('\n--- 1. Authentic Zenodo Metadata & Record Count ---');
  assert.strictEqual(
    zenodoResourceRecords.length,
    3,
    'Must have exactly 3 verified Zenodo educational records'
  );

  const [rec1, rec2, rec3] = zenodoResourceRecords;

  // Record 1: Computability of Algorithms
  assert.strictEqual(rec1.meta.zenodoId, '18995207');
  assert.strictEqual(rec1.meta.doi, '10.5281/zenodo.18995207');
  assert.strictEqual(rec1.item.title, 'Computability of Algorithms');
  assert.strictEqual(rec1.item.slug, 'computability-of-algorithms');
  assert.strictEqual(rec1.meta.publicationDate, '2026-03-13');
  assert.strictEqual(rec1.meta.resourceType, 'Lesson');
  assert.strictEqual(rec1.meta.license, 'CC-BY-4.0');
  assert.strictEqual(rec1.meta.pdfFileName, 'Computability Of Algorithms.pdf');
  assert.ok(
    rec1.item.file_url?.includes('18995207/files/Computability%20Of%20Algorithms.pdf/content'),
    'Record 1 file_url must point to authentic Zenodo PDF stream'
  );
  assert.ok(
    rec1.item.external_url?.includes('zenodo.org/records/18995207'),
    'Record 1 external_url must point to Zenodo record'
  );
  console.log('  ✅ PASS: 1.1 Record 18995207 (Computability of Algorithms) verified');

  // Record 2: Drone Applications and UAV Systems
  assert.strictEqual(rec2.meta.zenodoId, '18788942');
  assert.strictEqual(rec2.meta.doi, '10.5281/zenodo.18788942');
  assert.strictEqual(
    rec2.item.title,
    'Drone Applications and UAV Systems: Comprehensive Lecture Notes on Aerodynamics, Communication, and Autonomous Navigation'
  );
  assert.strictEqual(rec2.item.slug, 'drone-applications-and-uav-systems-lecture-notes');
  assert.strictEqual(rec2.meta.publicationDate, '2026-02-26');
  assert.strictEqual(rec2.meta.resourceType, 'Lesson');
  assert.strictEqual(rec2.meta.license, 'CC-BY-4.0');
  assert.strictEqual(rec2.meta.pdfFileName, 'DocScanner 26 Feb 2026 12-05 pm.pdf');
  assert.ok(
    rec2.item.file_url?.includes('18788942/files/DocScanner%2026%20Feb%202026%2012-05%E2%80%AFpm.pdf/content'),
    'Record 2 file_url must point to authentic Zenodo PDF stream'
  );
  assert.ok(
    rec2.item.external_url?.includes('zenodo.org/records/18788942'),
    'Record 2 external_url must point to Zenodo record'
  );
  console.log('  ✅ PASS: 1.2 Record 18788942 (Drone Applications and UAV Systems) verified');

  // Record 3: Design and Analysis of Algorithms
  assert.strictEqual(rec3.meta.zenodoId, '18725469');
  assert.strictEqual(rec3.meta.doi, '10.5281/zenodo.18725469');
  assert.strictEqual(
    rec3.item.title,
    'Design and Analysis of Algorithms (DAA) – Handwritten Lecture Notes | Unit 1 & Unit 2 | Computer Science Engineering'
  );
  assert.strictEqual(
    rec3.item.slug,
    'design-and-analysis-of-algorithms-handwritten-lecture-notes-unit-1-2'
  );
  assert.strictEqual(rec3.meta.publicationDate, '2026-02-21');
  assert.strictEqual(rec3.meta.resourceType, 'Lesson');
  assert.strictEqual(rec3.meta.license, 'CC-BY-4.0');
  assert.strictEqual(rec3.meta.pdfFileName, 'Unit 1 & Unit 2 Lecture Notes (1).pdf');
  assert.ok(
    rec3.item.file_url?.includes('18725469/files/Unit%201%20&%20Unit%202%20Lecture%20Notes%20(1).pdf/content'),
    'Record 3 file_url must point to authentic Zenodo PDF stream'
  );
  assert.ok(
    rec3.item.external_url?.includes('zenodo.org/records/18725469'),
    'Record 3 external_url must point to Zenodo record'
  );
  console.log('  ✅ PASS: 1.3 Record 18725469 (DAA Handwritten Notes) verified');

  // --- 2. Taxonomy Placement & Section Assignment ---
  console.log('\n--- 2. Taxonomy Placement & Section Assignment ---');
  for (const record of zenodoResourceRecords) {
    assert.strictEqual(
      record.item.section,
      'academics',
      `Item "${record.item.title}" must be placed in 'academics' section`
    );
    assert.strictEqual(
      record.item.category,
      'Study Material',
      `Item "${record.item.title}" must have category 'Study Material'`
    );
    assert.strictEqual(
      record.item.content_type,
      'study_material',
      `Item "${record.item.title}" must have content_type 'study_material'`
    );
    assert.strictEqual(
      record.item.status,
      'published',
      `Item "${record.item.title}" must have status 'published'`
    );
    assert.strictEqual(
      record.item.visibility,
      'public',
      `Item "${record.item.title}" must have visibility 'public'`
    );
  }
  console.log('  ✅ PASS: 2.1 All 3 resources strictly categorized as Academics > Study Material');

  // --- 3. Content Service Queries & Deduplication ---
  console.log('\n--- 3. Content Service Queries & Deduplication ---');
  const academicsContent = await getContentBySection('academics');
  assert.ok(academicsContent.length >= 3, 'Must return at least 3 academics resources');

  const studyMaterialContent = await getContentByCategory('academics', 'Study Material');
  assert.ok(studyMaterialContent.length >= 3, 'Must return at least 3 Study Material resources');

  // Check no duplicates in academicsContent
  const slugCounts = new Map<string, number>();
  for (const item of academicsContent) {
    slugCounts.set(item.slug, (slugCounts.get(item.slug) || 0) + 1);
  }
  for (const [slug, count] of slugCounts.entries()) {
    assert.strictEqual(count, 1, `Slug "${slug}" must not have duplicates in feed (found ${count})`);
  }
  console.log('  ✅ PASS: 3.1 ContentService returns all items deduplicated');

  // --- 4. Slug Lookups & Route Targets ---
  console.log('\n--- 4. Slug Lookups & Route Targets ---');
  const slug1 = await getContentBySlug('computability-of-algorithms');
  assert.ok(slug1, 'Must find computability-of-algorithms by slug');
  assert.strictEqual(slug1?.title, 'Computability of Algorithms');

  const slug2 = await getContentBySlug('drone-applications-and-uav-systems-lecture-notes');
  assert.ok(slug2, 'Must find drone lecture notes by slug');
  assert.ok(slug2?.title.includes('Drone Applications'));

  const slug3 = await getContentBySlug('design-and-analysis-of-algorithms-handwritten-lecture-notes-unit-1-2');
  assert.ok(slug3, 'Must find DAA lecture notes by slug');
  assert.ok(slug3?.title.includes('Design and Analysis of Algorithms'));
  console.log('  ✅ PASS: 4.1 All 3 items resolve via /content/:slug');

  // --- 5. Zenodo Metadata & Tag Junctions ---
  console.log('\n--- 5. Zenodo Metadata & Tag Junctions ---');
  const meta1 = getZenodoMetadata('computability-of-algorithms');
  assert.ok(meta1, 'Must resolve Zenodo metadata by slug');
  assert.strictEqual(meta1?.doi, '10.5281/zenodo.18995207');

  const tags1 = await getContentTags(rec1.item.id);
  assert.ok(tags1.length > 0, 'Computability item must have associated tags');
  const tagNames1 = tags1.map((t) => t.name);
  assert.ok(tagNames1.includes('Computability'), 'Must include Computability tag');
  assert.ok(tagNames1.includes('Halting Problem'), 'Must include Halting Problem tag');
  console.log('  ✅ PASS: 5.1 Tags and DOI metadata query successfully verified');

  console.log('\n================================================================');
  console.log('🎉 ALL ZENODO EDUCATIONAL RESOURCES INTEGRATION TESTS PASSED');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
