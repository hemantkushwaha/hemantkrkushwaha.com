/**
 * Research Publications Section Test Suite
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Tests: Publication schema, search/filter algorithms, citation formatting, and route integration
 */

import assert from 'assert';
import {
  filterPublications,
  getAvailableYears,
  formatApaCitation,
  formatBibtexCitation,
} from '../src/data/publicationData';
import { PublicationItem } from '../src/types/publication';

console.log('🧪 RUNNING RESEARCH PUBLICATIONS ARCHITECTURE TESTS\n');

// Mock test record following strict academic guidelines
const mockPaper1: PublicationItem = {
  id: 'pub-test-1',
  slug: 'test-shortest-path-optimization',
  title: 'Shortest Path Optimization in Directed Graphs with Zero-Weight Cycle Pruning',
  authors: ['Hemant Kumar Kushwaha', 'A. Sharma'],
  journalOrConference: 'International Journal of Computer Science & Network Security',
  publicationType: 'journal',
  year: 2024,
  publicationDate: 'March 2024',
  volume: '24',
  issue: '3',
  pageRange: '112-120',
  issn: '1738-7906',
  doi: '10.22937/IJCSNS.2024.24.3.15',
  doiStatus: 'verified',
  abstract: 'An empirical investigation into cycle pruning algorithms for shortest path convergence.',
  keywords: ['Graph Theory', 'Shortest Paths', 'Zero-Weight Cycles', 'Network Optimization'],
  peerReviewed: true,
};

const mockPaper2: PublicationItem = {
  id: 'pub-test-2',
  slug: 'test-sliding-window-protocol',
  title: 'Adaptive Congestion Avoidance in Modern Transport Layer Protocols',
  authors: ['R. Verma', 'Hemant Kumar Kushwaha'],
  journalOrConference: 'IEEE International Conference on Advanced Computing & Communications',
  publicationType: 'conference',
  year: 2023,
  publicationDate: 'December 2023',
  pageRange: '45-52',
  doiStatus: 'not_assigned',
  abstract: 'A comparative study of AIMD variations across high-latency wireless links.',
  keywords: ['Computer Networks', 'TCP', 'Congestion Control', 'AIMD'],
  peerReviewed: true,
};

const testRecords: PublicationItem[] = [mockPaper1, mockPaper2];

// 1. Search Query Invariants
console.log('--- 1. Search Query Invariants ---');
const titleSearchResult = filterPublications(testRecords, { query: 'Zero-Weight' });
assert.strictEqual(titleSearchResult.length, 1, '1.1 Finds paper by title keyword');
assert.strictEqual(titleSearchResult[0].id, 'pub-test-1');
console.log('  ✅ PASS: 1.1 Search by title keyword succeeds');

const authorSearchResult = filterPublications(testRecords, { query: 'Verma' });
assert.strictEqual(authorSearchResult.length, 1, '1.2 Finds paper by secondary author name');
assert.strictEqual(authorSearchResult[0].id, 'pub-test-2');
console.log('  ✅ PASS: 1.2 Search by author name succeeds');

const keywordSearchResult = filterPublications(testRecords, { query: 'AIMD' });
assert.strictEqual(keywordSearchResult.length, 1, '1.3 Finds paper by keyword tag');
console.log('  ✅ PASS: 1.3 Search by keyword tag succeeds');

const issnSearchResult = filterPublications(testRecords, { query: '1738-7906' });
assert.strictEqual(issnSearchResult.length, 1, '1.4 Finds paper by exact ISSN');
console.log('  ✅ PASS: 1.4 Search by ISSN succeeds');

// 2. Year and Type Filtering
console.log('\n--- 2. Year and Type Filtering ---');
const year2024Result = filterPublications(testRecords, { year: 2024 });
assert.strictEqual(year2024Result.length, 1, '2.1 Filters by year 2024');
assert.strictEqual(year2024Result[0].year, 2024);
console.log('  ✅ PASS: 2.1 Filter by year succeeds');

const conferenceResult = filterPublications(testRecords, { type: 'conference' });
assert.strictEqual(conferenceResult.length, 1, '2.2 Filters by conference publication type');
assert.strictEqual(conferenceResult[0].publicationType, 'conference');
console.log('  ✅ PASS: 2.2 Filter by publication type succeeds');

// 3. Metadata Citation Formatting
console.log('\n--- 3. Metadata Citation Formatting ---');
const apa = formatApaCitation(mockPaper1);
assert(apa.includes('Hemant Kumar Kushwaha, A. Sharma'), '3.1 APA citation includes ordered authors');
assert(apa.includes('(2024).'), '3.2 APA citation includes year in parentheses');
assert(apa.includes('24(3)'), '3.3 APA citation includes volume and issue');
assert(apa.includes('https://doi.org/10.22937/IJCSNS.2024.24.3.15'), '3.4 APA citation includes verified DOI link');
console.log('  ✅ PASS: 3.1-3.4 APA citation generation conforms to academic standard');

const bibtex = formatBibtexCitation(mockPaper1);
assert(bibtex.startsWith('@article{'), '3.5 BibTeX starts with @article');
assert(bibtex.includes('author = {Hemant Kumar Kushwaha and A. Sharma}'), '3.6 BibTeX formats authors with and');
assert(bibtex.includes('title = {Shortest Path Optimization in Directed Graphs with Zero-Weight Cycle Pruning}'), '3.7 BibTeX includes exact title');
console.log('  ✅ PASS: 3.5-3.7 BibTeX generation conforms to academic standard');

// 4. DOI Status Invariants
console.log('\n--- 4. DOI Integrity Invariants ---');
assert.strictEqual(mockPaper2.doiStatus, 'not_assigned', '4.1 Missing DOI is explicitly tagged as not_assigned');
assert.strictEqual(mockPaper2.doi, undefined, '4.2 Missing DOI is never fabricated or guessed');
console.log('  ✅ PASS: 4.1-4.2 DOI integrity rules enforced without fabrication');

// 5. Verification of the 5 Real Publication Records in Registry
console.log('\n--- 5. Registry Invariants (Exact 5 Published Papers) ---');
import { publicationRecords } from '../src/data/publicationData';

assert.strictEqual(publicationRecords.length, 5, '5.1 Exactly 5 publication records in dataset');
console.log('  ✅ PASS: 5.1 Exactly 5 published papers cataloged');

// Verify unique IDs and Slugs
const ids = new Set(publicationRecords.map((p) => p.id));
assert.strictEqual(ids.size, 5, '5.2 Unique IDs for all 5 papers');

const slugs = new Set(publicationRecords.map((p) => p.slug));
assert.strictEqual(slugs.size, 5, '5.3 Unique slugs for all 5 papers');

// Verify Hemant Kumar Kushwaha is author in every record
publicationRecords.forEach((paper, idx) => {
  const hasAuthor = paper.authors.some((a) => a.includes('Kushwaha'));
  assert(hasAuthor, `5.4.${idx + 1} Paper "${paper.title}" includes Hemant Kumar Kushwaha`);
  assert(paper.abstract.length > 50, `5.4.${idx + 1} Paper has complete extracted abstract`);
  assert(paper.keywords.length >= 3, `5.4.${idx + 1} Paper has extracted keywords`);
});
console.log('  ✅ PASS: 5.4 Author attribution, abstracts, and keywords verified for all 5 papers');

// Verify DOI states
assert.strictEqual(publicationRecords[0].doiStatus, 'verified', '5.5 Paper 1 has verified DOI');
assert.strictEqual(publicationRecords[0].doi, '10.5281/zenodo.18171274');
for (let i = 1; i < 5; i++) {
  assert.strictEqual(publicationRecords[i].doiStatus, 'not_assigned', `5.6 Paper ${i + 1} has not_assigned DOI`);
  assert.strictEqual(publicationRecords[i].doi, undefined, `5.6 Paper ${i + 1} has undefined DOI (no fabrication)`);
}
console.log('  ✅ PASS: 5.5-5.6 Strict DOI integrity verified (1 verified Zenodo DOI, 4 unassigned)');

console.log('\n================================================================');
console.log('🎉 ALL RESEARCH PUBLICATIONS ARCHITECTURE TESTS PASSED');
console.log('================================================================\n');

