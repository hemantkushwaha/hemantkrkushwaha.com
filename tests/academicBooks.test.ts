/**
 * Academic Books Section Test Suite
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Tests: Book catalogue invariants, title preservation, publisher accuracy,
 *        classification prominence, verified destination URLs, and routing.
 */

import assert from 'assert';
import { academicBooks, getAcademicBooks, getAcademicBookBySlug } from '../src/data/bookData';

console.log('🧪 RUNNING ACADEMIC BOOKS CATALOGUE TESTS\n');

// 1. Exact Book Count & Registry Invariants
console.log('--- 1. Exact Book Count & Integrity ---');
assert.strictEqual(academicBooks.length, 5, '1.1 Exactly 5 authored books in dataset');
assert.strictEqual(getAcademicBooks().length, 5, '1.2 getAcademicBooks() returns all 5 books');
console.log('  ✅ PASS: 1.1-1.2 Exactly five book records cataloged');

// 2. Exact Titles Preservation (Prompt Invariant)
console.log('\n--- 2. Exact Title Preservation ---');
const expectedTitles = [
  'META-COMPUTING: A Self-Optimizing Architecture for Adaptive AI Workloads in Distributed Computing Systems',
  'Think in Sets – A Beginner’s Guide to Discrete Maths: Foundations of Logic, Structures, and Reasoning for Computer Science',
  'Total State–Space Coexistence Theory: A Structural Framework for Time, Probability, and Experience',
  'The Complete Guide to Web Stories: Strategies, Tools and Techniques for Successful Storytelling',
  'Data Structures: Approach to Programming',
];

expectedTitles.forEach((expectedTitle, idx) => {
  const match = academicBooks.find((b) => b.title === expectedTitle);
  assert(match, `2.${idx + 1} Exact title matched: "${expectedTitle}"`);
  assert.strictEqual(match.status, 'Published', `2.${idx + 1} Status is strictly Published`);
  assert.strictEqual(match.author, 'Hemant Kumar Kushwaha', `2.${idx + 1} Author is Hemant Kumar Kushwaha`);
});
console.log('  ✅ PASS: 2.1-2.5 All five exact titles, author attributions, and published statuses verified');

// 3. Publisher & Classification Integrity
console.log('\n--- 3. Publisher & Classification Prominence ---');
const book1 = academicBooks[0];
assert.strictEqual(book1.publisher, 'Eliva Press', '3.1 Book 1 published by Eliva Press');
assert.strictEqual(book1.bookType, 'Technical / Research Book', '3.2 Book 1 is Technical / Research Book');
assert.strictEqual(book1.isResearchProminent, true, '3.3 Book 1 has research prominence');

const book2 = academicBooks[1];
assert.strictEqual(book2.publisher, 'Amazon KDP', '3.4 Book 2 published by Amazon KDP');
assert.strictEqual(book2.bookType, 'Technical / Academic Book', '3.5 Book 2 is Technical / Academic Book');
assert.strictEqual(book2.isResearchProminent, true, '3.6 Book 2 has academic prominence');

const book3 = academicBooks[2];
assert.strictEqual(book3.publisher, 'Amazon KDP', '3.7 Book 3 published by Amazon KDP');
assert.strictEqual(book3.bookType, 'Technical / Research Book', '3.8 Book 3 is Technical / Research Book');
assert.strictEqual(book3.isResearchProminent, true, '3.9 Book 3 has research prominence');

const book4 = academicBooks[3];
assert.strictEqual(book4.publisher, 'Amazon KDP', '3.10 Book 4 published by Amazon KDP');
assert.strictEqual(book4.bookType, 'Book', '3.11 Book 4 is Book');

const book5 = academicBooks[4];
assert.strictEqual(book5.publisher, 'Amazon KDP', '3.12 Book 5 published by Amazon KDP');
assert.strictEqual(book5.bookType, 'Technical Book', '3.13 Book 5 is Technical Book');
console.log('  ✅ PASS: 3.1-3.13 Publishers and classification visual hierarchy verified');

// 4. Mandatory Direct Destination URLs (Non-Fabricated & Valid)
console.log('\n--- 4. Mandatory Verified Destination URLs ---');
academicBooks.forEach((book, idx) => {
  assert(book.url && book.url.length > 10, `4.${idx + 1} Book "${book.title}" has direct URL`);
  assert(book.url.startsWith('https://'), `4.${idx + 1} URL uses safe HTTPS`);
  assert(book.urlLabel && book.urlLabel.length > 0, `4.${idx + 1} Has non-empty URL action label`);
  assert(book.verifiedDestinationDescription.length > 0, `4.${idx + 1} Has destination provenance description`);
  // Ensure not pointing to generic bare kdp.amazon.com
  assert.notStrictEqual(book.url, 'https://kdp.amazon.com', `4.${idx + 1} Does not link to generic KDP homepage`);
});

// Specific URL destinations check
assert.strictEqual(
  book1.url,
  'https://www.elivapress.com/en/book/book-8851227556/',
  '4.6 Book 1 points to official Eliva Press book page'
);
assert(book2.url.includes('amazon.com'), '4.7 Book 2 points to Amazon catalogue listing');
assert(book3.url.includes('books.google.com'), '4.8 Book 3 points to Google Books official record');
assert(book4.url.includes('amazon.com'), '4.9 Book 4 points to Amazon catalogue listing');
assert(book5.url.includes('amazon.com'), '4.10 Book 5 points to Amazon catalogue listing');
console.log('  ✅ PASS: 4.1-4.10 Mandatory direct destination URLs verified for all 5 books');

// 5. Slug Query Helper
console.log('\n--- 5. Slug Query Helper ---');
const foundBySlug = getAcademicBookBySlug('meta-computing-adaptive-ai-workloads');
assert(foundBySlug, '5.1 Finds book by slug');
assert.strictEqual(foundBySlug.id, 'book-meta-computing');
console.log('  ✅ PASS: 5.1 Slug retrieval helper works correctly');

console.log('\n================================================================');
console.log('🎉 ALL ACADEMIC BOOKS CATALOGUE TESTS PASSED');
console.log('================================================================\n');
