/**
 * Published Literary & Creative Books Registry
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Domain: Writings -> Books & Publications
 * 
 * Verified against official Amazon listings and verified publishing records:
 * 1. मोहब्बत-ए-गुलशन (Kindle eBook | ASIN: B0BRQVYXPN)
 * 2. Stolen Kisses, Shattered Trust: Tempted, Touched, Torn Apart (Kindle eBook | ASIN: B0F766BQSH)
 * 3. Tarun: Painful Love (तरुण) (Paperback Print Edition | ISBN-10: 1639745238 / ISBN-13: 978-1639745234, Notion Press)
 */

import type { WritingBookItem } from '../types/writingBook';
import type { ContentItem, Tag } from '../types/content';

export const publishedWritingBooks: WritingBookItem[] = [
  // --- BOOK 1: मोहब्बत-ए-गुलशन ---
  {
    id: 'book-mohabbat-e-gulshan',
    slug: 'mohabbat-e-gulshan',
    title: 'मोहब्बत-ए-गुलशन',
    subtitle: 'Hindi Poetry & Shayari Collection (कविता एवं शायरी संग्रह)',
    author: 'Hemant Kumar Kushwaha',
    language: 'Hindi',
    format: 'Kindle eBook',
    publisher: 'Amazon KDP',
    asin: 'B0BRQVYXPN',
    genre: 'Poetry & Ghazals (कविता एवं शायरी)',
    status: 'Published',
    description:
      'A heartfelt collection of Hindi and Urdu romantic poetry, nazms, and shayaris by Hemant Kumar Kushwaha exploring eternal love, tender longing, expressive affection, and the soulful tribulations of the heart.',
    amazonUrl: 'https://www.amazon.com/dp/B0BRQVYXPN',
    urlLabel: 'View on Amazon',
    verifiedDestinationDescription: 'Amazon Kindle eBook Listing (ASIN: B0BRQVYXPN)',
    sourceVerified: true,
    metadataVerificationNotes:
      'Verified ASIN: B0BRQVYXPN from Amazon listing. Format: Kindle Edition. Language: Hindi.',
  },

  // --- BOOK 2: Stolen Kisses, Shattered Trust ---
  {
    id: 'book-stolen-kisses-shattered-trust',
    slug: 'stolen-kisses-shattered-trust',
    title: 'Stolen Kisses, Shattered Trust: Tempted, Touched, Torn Apart',
    subtitle: 'Tempted, Touched, Torn Apart',
    author: 'Hemant Kumar Kushwaha',
    language: 'English',
    format: 'Kindle eBook',
    publisher: 'Amazon KDP',
    asin: 'B0F766BQSH',
    genre: 'Contemporary Fiction / Romance & Drama',
    status: 'Published',
    description:
      'A gripping contemporary fiction novel chronicling an emotionally charged journey of passion, temptation, unexpected betrayal, and shattered trust centered around Tarun\'s shocking confrontation with heartbreak.',
    amazonUrl: 'https://www.amazon.com/dp/B0F766BQSH',
    urlLabel: 'View on Amazon',
    verifiedDestinationDescription: 'Amazon Kindle eBook Listing (ASIN: B0F766BQSH)',
    sourceVerified: true,
    metadataVerificationNotes:
      'Verified full title and subtitle: Stolen Kisses, Shattered Trust: Tempted, Touched, Torn Apart. ASIN: B0F766BQSH. Author: Hemant Kumar Kushwaha.',
  },

  // --- BOOK 3: Tarun: Painful Love (तरुण) ---
  {
    id: 'book-tarun-painful-love',
    slug: 'tarun-painful-love',
    title: 'Tarun: Painful Love (तरुण)',
    subtitle: 'A Journey of Heartbreak, Love & Emotional Verses',
    author: 'Hemant Kumar Kushwaha',
    language: 'Hindi',
    format: 'Paperback',
    publisher: 'Notion Press',
    isbn10: '1639745238',
    isbn13: '978-1639745234',
    genre: 'Poetry / Expressive Literature',
    status: 'Published',
    description:
      'A poignant print edition collection of expressive Hindi poetry and verses published in paperback format by Notion Press, examining the raw vulnerability of heartbreak, devotional longing, and the intense emotional pain of love.',
    amazonUrl: 'https://www.amazon.in/dp/1639745238',
    urlLabel: 'Buy on Amazon India',
    verifiedDestinationDescription:
      'Amazon India Print Listing (ISBN-10: 1639745238 / ISBN-13: 978-1639745234, Notion Press)',
    sourceVerified: true,
    metadataVerificationNotes:
      'Verified Amazon India print listing: ISBN-10: 1639745238 / ISBN-13: 978-1639745234. Publisher: Notion Press. Format: Paperback print edition.',
  },
];

/**
 * Corresponding ContentItem representations for the unified content model.
 */
export const publishedWritingContentItems: { item: ContentItem; tags: Tag[] }[] = [
  {
    item: {
      id: 'b0b00001-0000-4000-8000-000000000001',
      title: 'मोहब्बत-ए-गुलशन',
      slug: 'mohabbat-e-gulshan',
      description:
        'A heartfelt collection of Hindi and Urdu romantic poetry, nazms, and shayaris by Hemant Kumar Kushwaha exploring eternal love, tender longing, and the soulful tribulations of the heart.',
      section: 'writings',
      category: 'Books',
      subcategory: 'Poetry',
      content_type: 'book',
      body: `### मोहब्बत-ए-गुलशन (Mohabbat-e-Gulshan)

**Author:** Hemant Kumar Kushwaha  
**Language:** Hindi (हिन्दी)  
**Format:** Kindle eBook Edition  
**Platform:** Amazon KDP  
**ASIN:** [B0BRQVYXPN](https://www.amazon.com/dp/B0BRQVYXPN)  
**Status:** Published  

---

### About the Book

*मोहब्बत-ए-गुलशन* is a poetic compilation of romantic verses, shayaris, and reflections authored by Hemant Kumar Kushwaha. Written with deep lyricism and emotional resonance, this collection captures the delicate nuances of human sentiment—the tender euphoria of infatuation, the silent yearning of separation, and the transformative power of genuine love.

### Thematic Elements
- **Romantic Lyricism:** Classic metric shayaris and free-verse Hindi poetry celebrating enduring love.
- **Introspective Musings:** Verses contemplating emotional vulnerability and deep attachment.
- **Expressive Imagery:** Traditional poetic imagery drawn from nature, fragrance, and the metaphorical garden of love (*गुलशन*).

---

### Available Purchase / Reading Destination
- **Amazon Kindle Edition:** [https://www.amazon.com/dp/B0BRQVYXPN](https://www.amazon.com/dp/B0BRQVYXPN) (ASIN: \`B0BRQVYXPN\`)`,
      thumbnail_url: null,
      file_url: null,
      external_url: 'https://www.amazon.com/dp/B0BRQVYXPN',
      language: 'hi',
      status: 'published',
      visibility: 'public',
      is_featured: true,
      published_at: '2023-01-01T00:00:00.000Z',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
    },
    tags: [
      { id: 'b0b00001-0000-4000-8000-000000000011', name: 'Hindi Poetry', slug: 'hindi-poetry', created_at: '2023-01-01T00:00:00.000Z', updated_at: '2023-01-01T00:00:00.000Z' },
      { id: 'b0b00001-0000-4000-8000-000000000012', name: 'Shayari', slug: 'shayari', created_at: '2023-01-01T00:00:00.000Z', updated_at: '2023-01-01T00:00:00.000Z' },
      { id: 'b0b00001-0000-4000-8000-000000000013', name: 'Ghazals', slug: 'ghazals', created_at: '2023-01-01T00:00:00.000Z', updated_at: '2023-01-01T00:00:00.000Z' },
      { id: 'b0b00001-0000-4000-8000-000000000014', name: 'Kindle Book', slug: 'kindle-book', created_at: '2023-01-01T00:00:00.000Z', updated_at: '2023-01-01T00:00:00.000Z' },
    ],
  },
  {
    item: {
      id: 'b0f766b0-0000-4000-8000-000000000002',
      title: 'Stolen Kisses, Shattered Trust: Tempted, Touched, Torn Apart',
      slug: 'stolen-kisses-shattered-trust',
      description:
        'A gripping contemporary fiction novel detailing an emotionally charged journey of passion, temptation, unexpected betrayal, and shattered trust centered around Tarun\'s shocking confrontation with heartbreak.',
      section: 'writings',
      category: 'Books',
      subcategory: 'Novels',
      content_type: 'book',
      body: `### Stolen Kisses, Shattered Trust: Tempted, Touched, Torn Apart

**Author:** Hemant Kumar Kushwaha  
**Language:** English  
**Format:** Kindle eBook Edition  
**Platform:** Amazon KDP  
**ASIN:** [B0F766BQSH](https://www.amazon.com/dp/B0F766BQSH)  
**Status:** Published  

---

### About the Novel

*Stolen Kisses, Shattered Trust: Tempted, Touched, Torn Apart* is a compelling contemporary romance and drama novel authored by Hemant Kumar Kushwaha. 

The narrative plunges readers into the intricate labyrinth of modern romantic relationships, exploring the devastating fallout when temptation overwhelms loyalty. Centered around the character of Tarun, the story unfolds with dramatic intensity following an unannounced arrival at an apartment—an event that shatters established certainties and forces confronting truths about trust, betrayal, and emotional resilience.

### Core Themes
- **The Fragility of Trust:** Examining how easily long-standing bonds can unravel under secret temptation.
- **Character Complexity:** Nuanced emotional portrayals capturing psychological conflict, guilt, and the path to emotional survival.
- **Narrative Pacing:** High-stakes drama interlaced with introspective reflections on loyalty and forgiveness.

---

### Available Purchase / Reading Destination
- **Amazon Kindle Edition:** [https://www.amazon.com/dp/B0F766BQSH](https://www.amazon.com/dp/B0F766BQSH) (ASIN: \`B0F766BQSH\`)`,
      thumbnail_url: null,
      file_url: null,
      external_url: 'https://www.amazon.com/dp/B0F766BQSH',
      language: 'en',
      status: 'published',
      visibility: 'public',
      is_featured: true,
      published_at: '2024-01-01T00:00:00.000Z',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
    tags: [
      { id: 'b0f766b0-0000-4000-8000-000000000021', name: 'Contemporary Fiction', slug: 'contemporary-fiction', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
      { id: 'b0f766b0-0000-4000-8000-000000000022', name: 'Romance & Drama', slug: 'romance-and-drama', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
      { id: 'b0f766b0-0000-4000-8000-000000000023', name: 'Novel', slug: 'novel', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
      { id: 'b0f766b0-0000-4000-8000-000000000024', name: 'Kindle Book', slug: 'kindle-book', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
    ],
  },
  {
    item: {
      id: '16397452-0000-4000-8000-000000000003',
      title: 'Tarun: Painful Love (तरुण)',
      slug: 'tarun-painful-love',
      description:
        'A poignant print edition collection of expressive Hindi poetry and verses published in paperback format by Notion Press, examining the raw vulnerability of heartbreak, devotional longing, and the intense emotional pain of love.',
      section: 'writings',
      category: 'Books',
      subcategory: 'Poetry',
      content_type: 'book',
      body: `### Tarun: Painful Love (तरुण)

**Author:** Hemant Kumar Kushwaha  
**Language:** Hindi (हिन्दी)  
**Format:** Paperback Print Edition  
**Publisher:** Notion Press  
**ISBN-10:** 1639745238  
**ISBN-13:** 978-1639745234  
**Platform:** Amazon India & Notion Press  
**Amazon URL:** [https://www.amazon.in/dp/1639745238](https://www.amazon.in/dp/1639745238)  
**Status:** Published  

---

### About the Collection

*Tarun: Painful Love (तरुण)* is an expressive anthology of Hindi poetry published in a physical paperback volume by Notion Press. 

The collection delves into the bitter realities of unreciprocated devotion, emotional scars, and the lingering ache that follows profound heartbreak. Written with raw sincerity, the poems trace the psychological contours of grief and the quiet resilience discovered when facing personal loss.

### Highlights
- **Authentic Print Edition:** Published in physical paperback format through Notion Press.
- **Heartfelt Verses:** Explores heartfelt themes of parting (*जुदाई*), unspoken memories, and emotional devotion.
- **Literary Integrity:** A raw and personal artistic expression complementing the author's extensive technical and philosophical portfolio.

---

### Available Purchase / Ordering Destination
- **Amazon India Store:** [https://www.amazon.in/dp/1639745238](https://www.amazon.in/dp/1639745238) (ISBN: \`1639745238\`)`,
      thumbnail_url: null,
      file_url: null,
      external_url: 'https://www.amazon.in/dp/1639745238',
      language: 'hi',
      status: 'published',
      visibility: 'public',
      is_featured: true,
      published_at: '2022-01-01T00:00:00.000Z',
      created_at: '2022-01-01T00:00:00.000Z',
      updated_at: '2022-01-01T00:00:00.000Z',
    },
    tags: [
      { id: '16397452-0000-4000-8000-000000000031', name: 'Hindi Poetry', slug: 'hindi-poetry', created_at: '2022-01-01T00:00:00.000Z', updated_at: '2022-01-01T00:00:00.000Z' },
      { id: '16397452-0000-4000-8000-000000000032', name: 'Paperback Book', slug: 'paperback-book', created_at: '2022-01-01T00:00:00.000Z', updated_at: '2022-01-01T00:00:00.000Z' },
      { id: '16397452-0000-4000-8000-000000000033', name: 'Notion Press', slug: 'notion-press', created_at: '2022-01-01T00:00:00.000Z', updated_at: '2022-01-01T00:00:00.000Z' },
      { id: '16397452-0000-4000-8000-000000000034', name: 'Tarun', slug: 'tarun', created_at: '2022-01-01T00:00:00.000Z', updated_at: '2022-01-01T00:00:00.000Z' },
    ],
  },
];

/**
 * Returns all published writing books
 */
export function getPublishedWritingBooks(): WritingBookItem[] {
  return publishedWritingBooks;
}

/**
 * Finds a writing book by slug
 */
export function getWritingBookBySlug(slug: string): WritingBookItem | undefined {
  if (!slug) return undefined;
  const normalized = slug.trim().toLowerCase();
  return publishedWritingBooks.find((b) => b.slug.toLowerCase() === normalized);
}

/**
 * Returns ContentItem representations for unified feeds
 */
export function getWritingBookContentItems(): ContentItem[] {
  return publishedWritingContentItems.map((c) => c.item);
}

/**
 * Finds tags for a writing book ContentItem
 */
export function getWritingBookTags(contentIdOrSlug: string): Tag[] {
  if (!contentIdOrSlug) return [];
  const match = publishedWritingContentItems.find(
    (c) => c.item.id === contentIdOrSlug || c.item.slug.toLowerCase() === contentIdOrSlug.toLowerCase()
  );
  return match ? match.tags : [];
}
