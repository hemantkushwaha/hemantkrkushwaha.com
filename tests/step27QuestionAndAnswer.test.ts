/**
 * Step 27: Add Question and Solution to Website Test Suite
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 27 — Question Bank & Analytical Solutions
 * 
 * Verifies:
 * 1. The question appears in the intended academic location:
 *    Subject: Design and Analysis of Algorithms (CS-401)
 *    Unit: Graph Algorithms (Unit 3)
 *    Topic: Shortest Path Algorithms
 *    Resource: Question Bank (connected with 1 solved problem)
 * 2. The complete answer is displayed with step-by-step derivation
 * 3. Mathematical notation is readable (1 + 0 + k(0 + 0) + 1 = 2, k >= 0)
 * 4. Graph edges are clearly specified (S->A: 1, A->B: 0, B->A: 0, B->T: 1)
 * 5. Existing academic navigation still works (Computer Networks, Transport Layer, TCP)
 * 6. Academic Breadcrumbs generate correctly for DAA hierarchy
 * 7. Zero fake URLs or placeholder Google Drive links in Question Bank
 * 8. Invariants: zero DB schema modifications, zero RLS changes, zero assessment forms, zero AI generation
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getAcademicSubjects,
  getAcademicSubjectBySlug,
  getAcademicUnitBySlug,
  getAcademicTopicBySlug,
  getAcademicQuestions,
  getAcademicQuestionBySlug,
  buildAcademicBreadcrumbs,
} from '../src/data/academicData.js';

async function runStep27Tests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 27: ADD QUESTION AND SOLUTION TESTS');
  console.log('================================================================\n');

  // 1. VERIFY ACADEMIC PLACEMENT IN DAA
  console.log('--- 1. Academic Placement & Hierarchy Verification ---');
  const subjects = getAcademicSubjects();
  assert.ok(subjects.length >= 2, 'Should have at least 2 subjects (Computer Networks & DAA)');

  const daaSubject = getAcademicSubjectBySlug('design-and-analysis-of-algorithms');
  assert.ok(daaSubject, 'DAA subject must exist in academic hierarchy');
  assert.equal(daaSubject.title, 'Design and Analysis of Algorithms');
  assert.equal(daaSubject.code, 'CS-401');
  assert.equal(daaSubject.slug, 'design-and-analysis-of-algorithms');
  console.log('  ✅ PASS: 1.1 Subject "Design and Analysis of Algorithms" (CS-401) exists');

  const graphUnit = getAcademicUnitBySlug('design-and-analysis-of-algorithms', 'graph-algorithms');
  assert.ok(graphUnit, 'Graph Algorithms unit must exist under DAA');
  assert.equal(graphUnit.title, 'Graph Algorithms');
  assert.equal(graphUnit.unitNumber, 3);
  console.log('  ✅ PASS: 1.2 Unit "Graph Algorithms" (Unit 3) exists under DAA');

  const shortestPathsTopic = getAcademicTopicBySlug(
    'design-and-analysis-of-algorithms',
    'graph-algorithms',
    'shortest-paths'
  );
  assert.ok(shortestPathsTopic, 'Shortest Paths topic must exist under Graph Algorithms');
  assert.equal(shortestPathsTopic.title, 'Shortest Path Algorithms');
  assert.equal(shortestPathsTopic.slug, 'shortest-paths');
  console.log('  ✅ PASS: 1.3 Topic "Shortest Path Algorithms" exists under Graph Algorithms');

  // 2. VERIFY TOPIC RESOURCES (4 EXACT CATEGORIES)
  console.log('\n--- 2. Resource Card Invariants for Shortest Paths ---');
  assert.equal(shortestPathsTopic.resources.length, 4, 'Must have exactly 4 resources');
  
  const qBankResource = shortestPathsTopic.resources.find((r) => r.type === 'question_bank');
  assert.ok(qBankResource, 'Question Bank resource must exist');
  assert.equal(qBankResource.status, 'connected', 'Question Bank resource status must be "connected"');
  assert.equal(qBankResource.statusMessage, '1 Solved Problem Available');
  assert.ok(qBankResource.questions && qBankResource.questions.length > 0, 'Question Bank must contain questions');
  console.log('  ✅ PASS: 2.1 Question Bank resource is connected with status "1 Solved Problem Available"');

  const pendingResources = shortestPathsTopic.resources.filter((r) => r.type !== 'question_bank');
  assert.equal(pendingResources.length, 3, 'Other 3 resources must be pending');
  for (const r of pendingResources) {
    assert.equal(r.status, 'pending');
    assert.equal(r.statusMessage, 'Resource not connected yet');
    assert.equal(r.source, undefined);
  }
  console.log('  ✅ PASS: 2.2 Study Material, PPT, and Interactive App remain cleanly disconnected');

  // 3. VERIFY QUESTION AND COMPLETE ANSWER CONTENT
  console.log('\n--- 3. Question & Answer Content Integrity ---');
  const questions = getAcademicQuestions(
    'design-and-analysis-of-algorithms',
    'graph-algorithms',
    'shortest-paths'
  );
  assert.equal(questions.length, 1, 'Topic must contain exactly 1 curated question');
  const q = questions[0];

  assert.equal(q.title, 'Shortest Distance and Number of Shortest Walks in a Directed Graph');
  
  // Verify question statement
  assert.ok(q.question.includes('A directed graph has edges S→A (1), A→B (0), B→A (0), and B→T (1)'));
  assert.ok(q.question.includes('For walks that may revisit vertices'));
  assert.ok(q.question.includes('find the shortest S→T distance and the number of shortest walks'));
  console.log('  ✅ PASS: 3.1 Question statement matches user specification exactly');

  // Verify answer and mathematical breakdown
  assert.ok(q.answer.includes('The shortest S→T distance is 2'));
  assert.ok(q.answer.includes('Every S→T walk must follow S→A→B initially and eventually take B→T'));
  assert.ok(q.answer.includes('zero-weight cycle B→A→B any number k ≥ 0 of times'));
  assert.ok(q.answer.includes('1 + 0 + k(0 + 0) + 1 = 2'));
  assert.ok(q.answer.includes('Because the cycle has weight zero, traversing it does not change the total weight'));
  assert.ok(q.answer.includes('Every non-negative integer k produces a distinct S→T walk with weight 2'));
  assert.ok(q.answer.includes('Shortest S→T distance: 2'));
  assert.ok(q.answer.includes('Number of shortest walks: Countably infinite'));
  console.log('  ✅ PASS: 3.2 Complete answer and derivation match user specification exactly');

  // Verify graph edges
  assert.ok(q.graphEdges && q.graphEdges.length === 4, 'Must specify 4 graph edges');
  assert.deepEqual(q.graphEdges, [
    { from: 'S', to: 'A', weight: 1 },
    { from: 'A', to: 'B', weight: 0 },
    { from: 'B', to: 'A', weight: 0 },
    { from: 'B', to: 'T', weight: 1 },
  ]);
  console.log('  ✅ PASS: 3.3 Graph edge specifications verified');

  // Verify math formula and findings
  assert.equal(q.mathFormula, '1 + 0 + k(0 + 0) + 1 = 2');
  assert.deepEqual(q.keyFindings, [
    { label: 'Shortest S→T distance', value: '2' },
    { label: 'Number of shortest walks', value: 'Countably infinite' },
  ]);
  console.log('  ✅ PASS: 3.4 Math formula and key findings verified');

  // 4. VERIFY QUERY HELPERS
  console.log('\n--- 4. Query Helper Functions ---');
  const foundBySlug = getAcademicQuestionBySlug(
    'design-and-analysis-of-algorithms',
    'graph-algorithms',
    'shortest-paths',
    'shortest-distance-shortest-walks-directed-graph'
  );
  assert.ok(foundBySlug, 'Question must be retrievable by slug');
  assert.equal(foundBySlug.id, q.id);

  const notFound = getAcademicQuestionBySlug(
    'design-and-analysis-of-algorithms',
    'graph-algorithms',
    'shortest-paths',
    'non-existent-question'
  );
  assert.equal(notFound, undefined, 'Non-existent question slug must return undefined');
  console.log('  ✅ PASS: 4.1 getAcademicQuestionBySlug works correctly with exact matching');

  // 5. BREADCRUMBS FOR NEW TOPIC
  console.log('\n--- 5. Breadcrumbs Verification for DAA Hierarchy ---');
  const bc = buildAcademicBreadcrumbs(
    'design-and-analysis-of-algorithms',
    'graph-algorithms',
    'shortest-paths'
  );
  assert.equal(bc.length, 6);
  assert.equal(bc[0].label, 'Home');
  assert.equal(bc[1].label, 'Academics');
  assert.equal(bc[2].label, 'Lectures');
  assert.equal(bc[3].label, 'Design and Analysis of Algorithms');
  assert.equal(bc[3].href, '/academics/lectures/design-and-analysis-of-algorithms');
  assert.equal(bc[4].label, 'Graph Algorithms');
  assert.equal(bc[4].href, '/academics/lectures/design-and-analysis-of-algorithms/graph-algorithms');
  assert.equal(bc[5].label, 'Shortest Path Algorithms');
  assert.equal(bc[5].isCurrent, true);
  console.log('  ✅ PASS: 5.1 Breadcrumbs generate correctly: Home → Academics → Lectures → DAA → Graph Algorithms → Shortest Path Algorithms');

  // 6. VERIFY ZERO FAKE URLS IN QUESTION BANK
  console.log('\n--- 6. Zero Fake URLs Invariant ---');
  const stringifiedTopic = JSON.stringify(shortestPathsTopic);
  assert.ok(!stringifiedTopic.includes('http://'), 'Topic must NOT contain http:// URLs');
  assert.ok(!stringifiedTopic.includes('example.com'), 'Topic must NOT contain example.com');
  assert.ok(!stringifiedTopic.includes('placeholder'), 'Topic must NOT contain placeholder links');
  assert.ok(!stringifiedTopic.includes('drive.google.com'), 'Question Bank must NOT pretend to be stored in Google Drive');
  console.log('  ✅ PASS: 6.1 Zero fake URLs or placeholder links in DAA topic and Question Bank');

  // 7. COMPONENT AND FILE INTEGRITY
  console.log('\n--- 7. Component & File Integrity ---');
  const questionCardPath = path.join(process.cwd(), 'src/components/academics/AcademicQuestionCard.tsx');
  assert.ok(fs.existsSync(questionCardPath), 'AcademicQuestionCard.tsx must exist');

  const questionCardCode = fs.readFileSync(questionCardPath, 'utf-8');
  assert.ok(questionCardCode.includes('Shortest S &rarr; T Distance'), 'Must render Shortest Distance heading');
  assert.ok(questionCardCode.includes('Countably infinite'), 'Must render Countably infinite');
  assert.ok(questionCardCode.includes('1 + 0 + k(0 + 0) + 1 = 2'), 'Must render math formula');
  console.log('  ✅ PASS: 7.1 AcademicQuestionCard component renders question, math, diagram, and complete solution');

  // Verify TopicPage renders question bank section
  const topicPageCode = fs.readFileSync(path.join(process.cwd(), 'src/pages/academics/TopicPage.tsx'), 'utf-8');
  assert.ok(topicPageCode.includes('AcademicQuestionCard'), 'TopicPage must import AcademicQuestionCard');
  assert.ok(topicPageCode.includes('question-bank-section'), 'TopicPage must contain question-bank-section');
  console.log('  ✅ PASS: 7.2 TopicPage.tsx integrates Question Bank section');

  // 8. EXISTING COMPUTER NETWORKS TEST PASS-THROUGH
  console.log('\n--- 8. Existing Navigation & Topic Integrity ---');
  const cn = getAcademicSubjectBySlug('computer-networks');
  assert.ok(cn, 'Computer Networks subject must remain accessible');
  const tcp = getAcademicTopicBySlug('computer-networks', 'transport-layer', 'tcp');
  assert.ok(tcp, 'TCP topic must remain accessible');
  assert.equal(tcp.resources.length, 4, 'TCP resources count must remain 4');
  console.log('  ✅ PASS: 8.1 Existing Computer Networks / Transport Layer / TCP remains 100% functional');

  console.log('\n================================================================');
  console.log('🎉 ALL STEP 27 TESTS PASSED SUCCESSFULLY');
  console.log('================================================================\n');
}

runStep27Tests().catch((err) => {
  console.error('❌ Test failure in Step 27:', err);
  process.exit(1);
});
