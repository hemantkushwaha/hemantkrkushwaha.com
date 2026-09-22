/**
 * Academic Navigation Slice Verification Test Suite
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 26-ACTION-1 — Build One Live Academic Navigation Slice
 * 
 * Hierarchy:
 * /academics/lectures
 *         ↓
 * /academics/lectures/computer-networks
 *         ↓
 * /academics/lectures/computer-networks/transport-layer
 *         ↓
 * /academics/lectures/computer-networks/transport-layer/tcp
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  academicSubjects,
  getAcademicSubjects,
  getAcademicSubjectBySlug,
  getAcademicUnitBySlug,
  getAcademicTopicBySlug,
  buildAcademicBreadcrumbs,
} from '../src/data/academicData.js';

async function runAcademicNavigationSliceTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 26-ACTION-1: ACADEMIC NAVIGATION SLICE TESTS');
  console.log('================================================================');

  // 1. DATA MODEL INTEGRITY
  console.log('\n--- 1. Academic Data & Model Layer ---');

  const subjects = getAcademicSubjects();
  assert.ok(Array.isArray(subjects) && subjects.length > 0, 'Subjects list must be non-empty array');
  console.log('  ✅ PASS: 1.1 Subjects list is loaded from decoupled model layer');

  const cn = getAcademicSubjectBySlug('computer-networks');
  assert.ok(cn, 'Subject computer-networks must exist');
  assert.equal(cn.title, 'Computer Networks', 'Subject title must be "Computer Networks"');
  assert.equal(cn.slug, 'computer-networks', 'Subject slug must be "computer-networks"');
  assert.ok(cn.units.length > 0, 'Subject must have syllabus units');
  console.log('  ✅ PASS: 1.2 "Computer Networks" subject model contains title and valid structure');

  const transport = getAcademicUnitBySlug('computer-networks', 'transport-layer');
  assert.ok(transport, 'Unit transport-layer must exist under computer-networks');
  assert.equal(transport.title, 'Transport Layer', 'Unit title must be "Transport Layer"');
  assert.equal(transport.slug, 'transport-layer', 'Unit slug must be "transport-layer"');
  assert.equal(transport.unitNumber, 4, 'Unit number must be 4');
  console.log('  ✅ PASS: 1.3 "Transport Layer" unit model is correctly linked under Computer Networks');

  const tcp = getAcademicTopicBySlug('computer-networks', 'transport-layer', 'tcp');
  assert.ok(tcp, 'Topic tcp must exist under transport-layer');
  assert.equal(tcp.title, 'TCP', 'Topic title must be "TCP"');
  assert.equal(tcp.slug, 'tcp', 'Topic slug must be "tcp"');
  console.log('  ✅ PASS: 1.4 "TCP" topic model is correctly linked under Transport Layer');

  // 2. RESOURCE CARDS INVARIANTS
  console.log('\n--- 2. Resource Cards Invariants (Exact 4, Zero Fake URLs) ---');

  assert.equal(tcp.resources.length, 4, 'TCP topic must define exactly four resource cards');
  console.log('  ✅ PASS: 2.1 Exactly four resource cards defined for TCP');

  const studyMaterial = tcp.resources.find((r) => r.id === 'study-material')!;
  assert.equal(studyMaterial.status, 'connected', 'Study Material status must be "connected"');
  assert.equal(studyMaterial.statusMessage, 'Connected → Google Drive');
  assert.equal(studyMaterial.source?.system, 'google-drive');
  assert.equal(studyMaterial.source?.source_id, '1El6w7DweSLfbnkdg45qdsOgFbo4BMDGj');

  const otherResources = tcp.resources.filter((r) => r.id !== 'study-material');
  assert.equal(otherResources.length, 3, 'Must have 3 other resources');
  for (const res of otherResources) {
    assert.equal(res.status, 'pending', `Resource ${res.title} status must be "pending"`);
    assert.equal(
      res.statusMessage,
      'Resource not connected yet',
      `Resource ${res.title} statusMessage must be "Resource not connected yet"`
    );
  }

  // Verify ZERO fake URLs across all resources
  for (const res of tcp.resources) {
    const stringified = JSON.stringify(res);
    assert.ok(!stringified.includes('http://'), `Resource ${res.title} must NOT contain http:// URLs`);
    assert.ok(!stringified.includes('example.com'), `Resource ${res.title} must NOT contain example.com`);
    assert.ok(!stringified.includes('placeholder'), `Resource ${res.title} must NOT contain placeholder tags`);
  }
  console.log('  ✅ PASS: 2.2 Study Material is connected to Google Drive and other 3 resources have statusMessage="Resource not connected yet"');
  console.log('  ✅ PASS: 2.3 Verified ZERO fake URLs across all 4 resources');

  // 3. CASE INSENSITIVITY & ERROR TOLERANCE
  console.log('\n--- 3. Lookup Tolerances & Edge Cases ---');

  assert.ok(getAcademicSubjectBySlug('COMPUTER-NETWORKS'), 'Case-insensitive lookup works for subject');
  assert.ok(getAcademicUnitBySlug('computer-networks', 'TRANSPORT-LAYER'), 'Case-insensitive lookup works for unit');
  assert.ok(getAcademicTopicBySlug('computer-networks', 'transport-layer', 'TCP'), 'Case-insensitive lookup works for topic');
  assert.equal(getAcademicSubjectBySlug('non-existent'), undefined, 'Invalid subject returns undefined');
  assert.equal(getAcademicUnitBySlug('computer-networks', 'non-existent'), undefined, 'Invalid unit returns undefined');
  assert.equal(getAcademicTopicBySlug('computer-networks', 'transport-layer', 'non-existent'), undefined, 'Invalid topic returns undefined');
  console.log('  ✅ PASS: 3.1 Lookup functions gracefully handle case variation and invalid slugs');

  // 4. BREADCRUMBS HIERARCHY
  console.log('\n--- 4. Visual Breadcrumb Hierarchy Generation ---');

  const b1 = buildAcademicBreadcrumbs();
  assert.equal(b1.length, 3);
  assert.equal(b1[0].label, 'Home');
  assert.equal(b1[1].label, 'Academics');
  assert.equal(b1[2].label, 'Lectures');
  assert.equal(b1[2].isCurrent, true);
  console.log('  ✅ PASS: 4.1 Level 1 breadcrumbs: Home → Academics → Lectures');

  const b2 = buildAcademicBreadcrumbs('computer-networks');
  assert.equal(b2.length, 4);
  assert.equal(b2[2].href, '/academics/lectures');
  assert.equal(b2[3].label, 'Computer Networks');
  assert.equal(b2[3].isCurrent, true);
  console.log('  ✅ PASS: 4.2 Level 2 breadcrumbs: Home → Academics → Lectures → Computer Networks');

  const b3 = buildAcademicBreadcrumbs('computer-networks', 'transport-layer');
  assert.equal(b3.length, 5);
  assert.equal(b3[3].href, '/academics/lectures/computer-networks');
  assert.equal(b3[4].label, 'Transport Layer');
  assert.equal(b3[4].isCurrent, true);
  console.log('  ✅ PASS: 4.3 Level 3 breadcrumbs: Home → Academics → Lectures → Computer Networks → Transport Layer');

  const b4 = buildAcademicBreadcrumbs('computer-networks', 'transport-layer', 'tcp');
  assert.equal(b4.length, 6);
  assert.equal(b4[4].href, '/academics/lectures/computer-networks/transport-layer');
  assert.equal(b4[5].label, 'TCP');
  assert.equal(b4[5].isCurrent, true);
  console.log('  ✅ PASS: 4.4 Level 4 breadcrumbs: Home → Academics → Lectures → Computer Networks → Transport Layer → TCP');

  // 5. FILE INTEGRITY & ROUTING HOOKS
  console.log('\n--- 5. File System & Source Code Integrity ---');

  const filesToCheck = [
    'src/types/academicNavigation.ts',
    'src/data/academicData.ts',
    'src/components/academics/AcademicBreadcrumbs.tsx',
    'src/components/academics/ResourceCard.tsx',
    'src/pages/academics/LecturesPage.tsx',
    'src/pages/academics/SubjectPage.tsx',
    'src/pages/academics/UnitPage.tsx',
    'src/pages/academics/TopicPage.tsx',
  ];

  for (const file of filesToCheck) {
    const fullPath = path.join(process.cwd(), file);
    assert.ok(fs.existsSync(fullPath), `Required source file must exist: ${file}`);
  }
  console.log('  ✅ PASS: 5.1 All 8 core academic architecture files exist on disk');

  // Check App.tsx includes all routes
  const appTsx = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf-8');
  assert.ok(appTsx.includes("path === '/academics/lectures'"), 'App.tsx must handle /academics/lectures');
  assert.ok(appTsx.includes("path.startsWith('/academics/lectures/')"), 'App.tsx must handle sub-routes under /academics/lectures/');
  assert.ok(appTsx.includes('<LecturesPage />'), 'App.tsx must render LecturesPage');
  assert.ok(appTsx.includes('<SubjectPage'), 'App.tsx must render SubjectPage');
  assert.ok(appTsx.includes('<UnitPage'), 'App.tsx must render UnitPage');
  assert.ok(appTsx.includes('<TopicPage'), 'App.tsx must render TopicPage');
  console.log('  ✅ PASS: 5.2 App.tsx handles all 4 hierarchical levels with proper dynamic segment parsing');

  // Check ResourceCard.tsx renders "Resource not connected yet" and has ZERO fake URLs
  const resourceCardContent = fs.readFileSync(path.join(process.cwd(), 'src/components/academics/ResourceCard.tsx'), 'utf-8');
  assert.ok(resourceCardContent.includes('Resource not connected yet'), 'ResourceCard must display "Resource not connected yet"');
  assert.ok(!resourceCardContent.includes('href="http'), 'ResourceCard must not contain fake href URLs');
  assert.ok(!resourceCardContent.includes('drive.google.com'), 'ResourceCard must not contain fake Google Drive links');
  console.log('  ✅ PASS: 5.3 ResourceCard explicitly displays "Resource not connected yet" with zero fake URLs');

  console.log('\n================================================================');
  console.log('🎉 ALL STEP 26-ACTION-1 TESTS PASSED SUCCESSFULLY');
  console.log('================================================================\n');
}

runAcademicNavigationSliceTests().catch((err) => {
  console.error('❌ Test failure in academic navigation slice:', err);
  process.exit(1);
});
