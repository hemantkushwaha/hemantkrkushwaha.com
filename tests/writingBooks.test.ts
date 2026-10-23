/**
 * Automated Verification Suite for Published Literary Books Integration
 * 
 * Verifies:
 * 1. Exact 3 published book records matching user instructions:
 *    - मोहब्बत-ए-गुलशन (Hindi Kindle Book | ASIN: B0BRQVYXPN)
 *    - Stolen Kisses, Shattered Trust: Tempted, Touched, Torn Apart (English Kindle Book | ASIN: B0F766BQSH)
 *    - Tarun: Painful Love (तरुण) (Amazon India Print Listing | ISBN-10: 1639745238 / ISBN-13: 978-1639745234)
 * 2. Author attribution: Hemant Kumar Kushwaha for all 3 books
 * 3. Exact Amazon URLs and labels
 * 4. Placement in Writings domain under 'Books' category
 * 5. Route resolution via /content/:slug and /writings/books
 * 6. Deduplication and non-empty content service queries
 */

import assert from 'node:assert';
import {
  publishedWritingBooks,
  getPublishedWritingBooks,
  getWritingBookBySlug,
  getWritingBookContentItems,
  getWritingBookTags,
} from '../src/data/writingBooksData.js';
import {
  getContentBySection,
  getContentByCategory,
  getContentBySlug,
} from '../src/services/contentService.js';

async function runTests() {
  console.log('🧪 RUNNING PUBLISHED WRITING BOOKS INTEGRATION TESTS');

  // --- 1. Exact 3 Book Records & Integrity ---
  console.log('\n--- 1. Exact 3 Book Records & Integrity ---');
  assert.strictEqual(
    publishedWritingBooks.length,
    3,
    'Must have exactly 3 published writing book records'
  );

  const [b1, b2, b3] = publishedWritingBooks;

  // Book 1: मोहब्बत-ए-गुलशन
  assert.strictEqual(b1.title, 'मोहब्बत-ए-गुलशन');
  assert.strictEqual(b1.author, 'Hemant Kumar Kushwaha');
  assert.strictEqual(b1.language, 'Hindi');
  assert.strictEqual(b1.format, 'Kindle eBook');
  assert.strictEqual(b1.asin, 'B0BRQVYXPN');
  assert.strictEqual(b1.publisher, 'Amazon KDP');
  assert.strictEqual(b1.status, 'Published');
  assert.strictEqual(b1.amazonUrl, 'https://www.amazon.com/dp/B0BRQVYXPN');
  assert.strictEqual(b1.urlLabel, 'View on Amazon');
  console.log('  ✅ PASS: 1.1 Book 1 (मोहब्बत-ए-गुलशन) metadata and Amazon ASIN verified');

  // Book 2: Stolen Kisses, Shattered Trust
  assert.strictEqual(
    b2.title,
    'Stolen Kisses, Shattered Trust: Tempted, Touched, Torn Apart'
  );
  assert.strictEqual(b2.subtitle, 'Tempted, Touched, Torn Apart');
  assert.strictEqual(b2.author, 'Hemant Kumar Kushwaha');
  assert.strictEqual(b2.language, 'English');
  assert.strictEqual(b2.format, 'Kindle eBook');
  assert.strictEqual(b2.asin, 'B0F766BQSH');
  assert.strictEqual(b2.publisher, 'Amazon KDP');
  assert.strictEqual(b2.status, 'Published');
  assert.strictEqual(b2.amazonUrl, 'https://www.amazon.com/dp/B0F766BQSH');
  assert.strictEqual(b2.urlLabel, 'View on Amazon');
  console.log('  ✅ PASS: 1.2 Book 2 (Stolen Kisses, Shattered Trust) metadata and Amazon ASIN verified');

  // Book 3: Tarun: Painful Love (तरुण)
  assert.strictEqual(b3.title, 'Tarun: Painful Love (तरुण)');
  assert.strictEqual(b3.author, 'Hemant Kumar Kushwaha');
  assert.strictEqual(b3.language, 'Hindi');
  assert.strictEqual(b3.format, 'Paperback');
  assert.strictEqual(b3.isbn10, '1639745238');
  assert.strictEqual(b3.isbn13, '978-1639745234');
  assert.strictEqual(b3.publisher, 'Notion Press');
  assert.strictEqual(b3.status, 'Published');
  assert.strictEqual(b3.amazonUrl, 'https://www.amazon.in/dp/1639745238');
  assert.strictEqual(b3.urlLabel, 'Buy on Amazon India');
  console.log('  ✅ PASS: 1.3 Book 3 (Tarun: Painful Love) ISBN-10, Paperback format, and Amazon India URL verified');

  // --- 2. Placement in Writings Domain under 'Books' ---
  console.log('\n--- 2. Placement in Writings Domain under Books ---');
  const contentItems = getWritingBookContentItems();
  assert.strictEqual(contentItems.length, 3, 'Must have 3 ContentItem representations');

  for (const item of contentItems) {
    assert.strictEqual(item.section, 'writings', `Book ${item.title} must be in 'writings' section`);
    assert.strictEqual(item.category, 'Books', `Book ${item.title} must be in 'Books' category`);
    assert.strictEqual(item.content_type, 'book', `Book ${item.title} must have content_type 'book'`);
    assert.strictEqual(item.status, 'published');
    assert.strictEqual(item.visibility, 'public');
    assert.ok(item.external_url?.startsWith('https://www.amazon.'), 'External URL must point to Amazon');
  }
  console.log('  ✅ PASS: 2.1 All 3 books strictly placed in Writings > Books');

  // --- 3. Content Service Queries & Deduplication ---
  console.log('\n--- 3. Content Service Queries & Deduplication ---');
  const writingsFeed = await getContentBySection('writings');
  assert.ok(writingsFeed.length >= 3, 'Writings feed must contain at least 3 items');

  const booksCategoryFeed = await getContentByCategory('writings', 'Books');
  assert.ok(booksCategoryFeed.length >= 3, 'Writings Books category must contain at least 3 items');

  // Deduplication check
  const slugCounts = new Map<string, number>();
  for (const item of writingsFeed) {
    slugCounts.set(item.slug, (slugCounts.get(item.slug) || 0) + 1);
  }
  for (const [slug, count] of slugCounts.entries()) {
    assert.strictEqual(count, 1, `Slug "${slug}" must not have duplicate entries in feed`);
  }
  console.log('  ✅ PASS: 3.1 ContentService returns all writing books without duplicates');

  // --- 4. Slug Lookups & Route Targets ---
  console.log('\n--- 4. Slug Lookups & Route Targets ---');
  const slug1 = await getContentBySlug('mohabbat-e-gulshan');
  assert.ok(slug1, 'Must find mohabbat-e-gulshan by slug');
  assert.strictEqual(slug1?.title, 'मोहब्बत-ए-गुलशन');

  const slug2 = await getContentBySlug('stolen-kisses-shattered-trust');
  assert.ok(slug2, 'Must find stolen-kisses-shattered-trust by slug');
  assert.ok(slug2?.title.includes('Stolen Kisses'));

  const slug3 = await getContentBySlug('tarun-painful-love');
  assert.ok(slug3, 'Must find tarun-painful-love by slug');
  assert.ok(slug3?.title.includes('Tarun: Painful Love'));
  console.log('  ✅ PASS: 4.1 All 3 writing books resolve via /content/:slug');

  // --- 5. Helper & Tag Queries ---
  console.log('\n--- 5. Helper & Tag Queries ---');
  const bookLookup = getWritingBookBySlug('mohabbat-e-gulshan');
  assert.strictEqual(bookLookup?.asin, 'B0BRQVYXPN');

  const tags = getWritingBookTags('b0b00001-0000-4000-8000-000000000001');
  assert.ok(tags.length >= 4, 'Must have at least 4 tags for Book 1');
  console.log('  ✅ PASS: 5.1 Slug helper and tag queries verified');

  console.log('\n================================================================');
  console.log('🎉 ALL PUBLISHED WRITING BOOKS INTEGRATION TESTS PASSED');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
