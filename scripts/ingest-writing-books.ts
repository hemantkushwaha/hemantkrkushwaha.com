/**
 * Ingestion Script for Published Literary Books
 * 
 * Synchronizes the 3 verified published books into Supabase:
 * 1. मोहब्बत-ए-गुलशन (Kindle eBook | ASIN: B0BRQVYXPN)
 * 2. Stolen Kisses, Shattered Trust: Tempted, Touched, Torn Apart (Kindle eBook | ASIN: B0F766BQSH)
 * 3. Tarun: Painful Love (तरुण) (Paperback Print Edition | ISBN-10: 1639745238 / ISBN-13: 978-1639745234)
 * 
 * Safe, idempotent upsert using getServerSupabaseClient().
 */

import { getServerSupabaseClient } from '../src/server/lib/supabaseServer.js';
import { publishedWritingContentItems } from '../src/data/writingBooksData.js';

async function ingestWritingBooks() {
  console.log('🚀 Starting Published Writing Books Ingestion...');

  const client = getServerSupabaseClient();
  if (!client) {
    console.error('❌ Supabase server client not configured (missing URL or SUPABASE_SECRET_KEY).');
    process.exit(1);
  }

  for (const record of publishedWritingContentItems) {
    const { item, tags } = record;
    console.log(`\n📦 Ingesting: "${item.title}"`);
    console.log(`   Slug: ${item.slug} | External URL: ${item.external_url}`);

    // 1. Upsert Content Row
    const { error: contentError } = await client
      .from('content')
      .upsert(
        {
          id: item.id,
          title: item.title,
          slug: item.slug,
          description: item.description,
          section: item.section,
          category: item.category,
          subcategory: item.subcategory,
          content_type: item.content_type,
          body: item.body,
          thumbnail_url: item.thumbnail_url,
          file_url: item.file_url,
          external_url: item.external_url,
          language: item.language,
          status: item.status,
          visibility: item.visibility,
          is_featured: item.is_featured,
          published_at: item.published_at,
          created_at: item.created_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug' }
      );

    if (contentError) {
      console.error(`   ❌ Failed to upsert content row for "${item.slug}":`, contentError.message);
      continue;
    }
    console.log(`   ✅ Content item upserted successfully.`);

    // 2. Upsert Tags
    for (const tag of tags) {
      const { error: tagError } = await client
        .from('tags')
        .upsert(
          {
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            created_at: tag.created_at,
            updated_at: tag.updated_at,
          },
          { onConflict: 'slug' }
        );

      if (tagError) {
        console.warn(`   ⚠️ Warning: Failed to upsert tag "${tag.name}":`, tagError.message);
      }

      // 3. Upsert Junction content_tags
      const { error: ctError } = await client
        .from('content_tags')
        .upsert(
          {
            content_id: item.id,
            tag_id: tag.id,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'content_id,tag_id' }
        );

      if (ctError) {
        // Ignored or logged
      }
    }
    console.log(`   ✅ Attached ${tags.length} tags to content item.`);
  }

  // Verification Query
  const { data: countData, error: countError } = await client
    .from('content')
    .select('id, title, slug, section, category')
    .eq('section', 'writings');

  if (countError) {
    console.error('❌ Error verifying ingested records:', countError.message);
  } else {
    console.log(`\n🎉 Ingestion Complete! Found ${countData.length} records in 'writings' section:`);
    for (const row of countData) {
      console.log(`   - [${row.category}] ${row.title} (/content/${row.slug})`);
    }
  }
}

ingestWritingBooks().catch((err) => {
  console.error('Unexpected error during ingestion:', err);
  process.exit(1);
});
