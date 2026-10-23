/**
 * Content Data Access Layer
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Unified Content Model across Academics, Research, Philosophy, and Writings
 * 
 * Key Guarantees:
 * - Read-only queries using the public Supabase client.
 * - Enforces published + public visibility at query time (in synergy with RLS).
 * - Never imports or accesses SUPABASE_SECRET_KEY.
 * - Strongly typed returns adhering to src/types/content.ts.
 * - Graceful fallback and error handling (never crashes UI on unconfigured client or network errors).
 * - Zero sample/fake data generation.
 */

import { getSupabaseClient } from '../lib/supabase';
import type { ContentItem, SectionId, Tag } from '../types/content';
import {
  getZenodoContentItems,
  getZenodoContentItemBySlug,
  getZenodoTagsByContentId,
} from '../data/zenodoResources';
import {
  getWritingBookContentItems,
  getWritingBookTags,
} from '../data/writingBooksData';

/**
 * Deduplicates and sorts content items by published_at DESC.
 * Supabase records take precedence; verified registry records fill when not in DB.
 */
function mergeAndSortContent(databaseItems: ContentItem[], localItems: ContentItem[]): ContentItem[] {
  const map = new Map<string, ContentItem>();
  for (const item of databaseItems) {
    if (item && item.slug) {
      map.set(item.slug.toLowerCase().trim(), item);
    }
  }
  for (const item of localItems) {
    if (item && item.slug) {
      const key = item.slug.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, item);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const timeA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const timeB = b.published_at ? new Date(b.published_at).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * 1. getPublishedContent
 * Fetches all published, publicly visible content across all sections.
 * Ordered by published_at DESC, then created_at DESC.
 */
export async function getPublishedContent(): Promise<ContentItem[]> {
  const allLocalItems = [...getZenodoContentItems(), ...getWritingBookContentItems()];
  const client = getSupabaseClient();
  if (!client) {
    return allLocalItems;
  }

  try {
    const { data, error } = await client
      .from('content')
      .select('*')
      .eq('status', 'published')
      .eq('visibility', 'public')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[contentService.getPublishedContent] Query error:', error.message);
      return allLocalItems;
    }

    const dbItems = (data as ContentItem[]) || [];
    return mergeAndSortContent(dbItems, allLocalItems);
  } catch (err) {
    console.error('[contentService.getPublishedContent] Unexpected error:', err);
    return allLocalItems;
  }
}

/**
 * 2. getContentBySlug
 * Fetches a single published, publicly visible content item by its unique URL slug.
 * Returns null if not found or if not published/public.
 */
export async function getContentBySlug(slug: string): Promise<ContentItem | null> {
  if (!slug || slug.trim().length === 0) {
    return null;
  }

  const normalizedSlug = slug.trim().toLowerCase();
  const localZenodoItem = getZenodoContentItemBySlug(normalizedSlug);
  const localWritingItem = getWritingBookContentItems().find(
    (item) => item.slug.toLowerCase() === normalizedSlug
  );
  const localItem = localZenodoItem || localWritingItem || null;

  const client = getSupabaseClient();
  if (!client) {
    return localItem;
  }

  try {
    const { data, error } = await client
      .from('content')
      .select('*')
      .eq('slug', slug.trim())
      .eq('status', 'published')
      .eq('visibility', 'public')
      .maybeSingle();

    if (error) {
      console.error(`[contentService.getContentBySlug] Query error for slug "${slug}":`, error.message);
      return localItem;
    }

    if (data) {
      return data as ContentItem;
    }

    return localItem;
  } catch (err) {
    console.error(`[contentService.getContentBySlug] Unexpected error for slug "${slug}":`, err);
    return localItem;
  }
}

/**
 * 3. getContentBySection
 * Fetches published, publicly visible content belonging to a specific section:
 * ('academics', 'research', 'philosophy', 'writings').
 * Ordered by published_at DESC, then created_at DESC.
 */
export async function getContentBySection(section: SectionId | string): Promise<ContentItem[]> {
  if (!section) {
    return [];
  }

  const localSectionItems = section === 'academics'
    ? getZenodoContentItems().filter((item) => item.section === 'academics')
    : section === 'writings'
    ? getWritingBookContentItems()
    : [];

  const client = getSupabaseClient();
  if (!client) {
    return localSectionItems;
  }

  try {
    const { data, error } = await client
      .from('content')
      .select('*')
      .eq('section', section)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[contentService.getContentBySection] Query error for section "${section}":`, error.message);
      return localSectionItems;
    }

    const dbItems = (data as ContentItem[]) || [];
    return mergeAndSortContent(dbItems, localSectionItems);
  } catch (err) {
    console.error(`[contentService.getContentBySection] Unexpected error for section "${section}":`, err);
    return localSectionItems;
  }
}

/**
 * 4. getContentByCategory
 * Fetches published, publicly visible content matching both section and category.
 * Ordered by published_at DESC, then created_at DESC.
 */
export async function getContentByCategory(
  section: SectionId | string,
  category: string
): Promise<ContentItem[]> {
  if (!section || !category) {
    return [];
  }

  const allLocal = [...getZenodoContentItems(), ...getWritingBookContentItems()];
  const localCategoryItems = allLocal.filter(
    (item) => item.section === section && item.category.toLowerCase() === category.toLowerCase()
  );

  const client = getSupabaseClient();
  if (!client) {
    return localCategoryItems;
  }

  try {
    const { data, error } = await client
      .from('content')
      .select('*')
      .eq('section', section)
      .eq('category', category)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[contentService.getContentByCategory] Query error for section "${section}", category "${category}":`, error.message);
      return localCategoryItems;
    }

    const dbItems = (data as ContentItem[]) || [];
    return mergeAndSortContent(dbItems, localCategoryItems);
  } catch (err) {
    console.error(`[contentService.getContentByCategory] Unexpected error for section "${section}", category "${category}":`, err);
    return localCategoryItems;
  }
}

/**
 * 5. getFeaturedContent
 * Fetches published, publicly visible content flagged as is_featured = true.
 * Ordered by published_at DESC, then created_at DESC.
 */
export async function getFeaturedContent(): Promise<ContentItem[]> {
  const allLocal = [...getZenodoContentItems(), ...getWritingBookContentItems()];
  const localFeatured = allLocal.filter((item) => item.is_featured);
  const client = getSupabaseClient();
  if (!client) {
    return localFeatured;
  }

  try {
    const { data, error } = await client
      .from('content')
      .select('*')
      .eq('is_featured', true)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[contentService.getFeaturedContent] Query error:', error.message);
      return localFeatured;
    }

    const dbItems = (data as ContentItem[]) || [];
    return mergeAndSortContent(dbItems, localFeatured);
  } catch (err) {
    console.error('[contentService.getFeaturedContent] Unexpected error:', err);
    return localFeatured;
  }
}

/**
 * 6. getRelatedContent
 * Uses the content_relationships table to find related content items for a given contentId.
 * Traverses relationships where contentId is either source or target,
 * and returns ONLY related items that are published and public.
 */
export async function getRelatedContent(contentId: string): Promise<ContentItem[]> {
  if (!contentId || contentId.trim().length === 0) {
    return [];
  }

  const allLocal = [...getZenodoContentItems(), ...getWritingBookContentItems()];
  const targetItem = allLocal.find((item) => item.id === contentId || item.slug === contentId);
  const localRelated = targetItem
    ? allLocal.filter((item) => item.section === targetItem.section && item.id !== targetItem.id && item.slug !== targetItem.slug)
    : [];

  const client = getSupabaseClient();
  if (!client) {
    return localRelated;
  }

  try {
    // Retrieve relationships involving this contentId
    const { data: relationships, error: relError } = await client
      .from('content_relationships')
      .select('source_content_id, target_content_id')
      .or(`source_content_id.eq.${contentId},target_content_id.eq.${contentId}`);

    if (relError) {
      console.error(`[contentService.getRelatedContent] Relationship query error for id "${contentId}":`, relError.message);
      return localRelated;
    }

    if (!relationships || relationships.length === 0) {
      return localRelated;
    }

    // Collect all related IDs excluding the queried contentId
    const relatedIds = Array.from(
      new Set(
        relationships.map((r) =>
          r.source_content_id === contentId ? r.target_content_id : r.source_content_id
        )
      )
    ).filter((id): id is string => Boolean(id) && id !== contentId);

    if (relatedIds.length === 0) {
      return localRelated;
    }

    // Fetch related content items (only published and public)
    const { data: relatedItems, error: itemsError } = await client
      .from('content')
      .select('*')
      .in('id', relatedIds)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (itemsError) {
      console.error(`[contentService.getRelatedContent] Content fetch error for related items:`, itemsError.message);
      return localRelated;
    }

    const dbItems = (relatedItems as ContentItem[]) || [];
    return mergeAndSortContent(dbItems, localRelated);
  } catch (err) {
    console.error(`[contentService.getRelatedContent] Unexpected error for id "${contentId}":`, err);
    return localRelated;
  }
}

/**
 * 7. getContentTags
 * Returns tags associated with the given contentId via the content_tags junction table.
 */
export async function getContentTags(contentId: string): Promise<Tag[]> {
  if (!contentId || contentId.trim().length === 0) {
    return [];
  }

  const zenodoTags = getZenodoTagsByContentId(contentId);
  const writingTags = getWritingBookTags(contentId);
  const localTags = zenodoTags.length > 0 ? zenodoTags : writingTags;

  const client = getSupabaseClient();
  if (!client) {
    return localTags;
  }

  try {
    // 1. Fetch tag_ids from content_tags junction table
    const { data: junctionRows, error: junctionError } = await client
      .from('content_tags')
      .select('tag_id')
      .eq('content_id', contentId);

    if (junctionError) {
      console.error(`[contentService.getContentTags] Junction query error for contentId "${contentId}":`, junctionError.message);
      return localTags;
    }

    if (!junctionRows || junctionRows.length === 0) {
      return localTags;
    }

    const tagIds = Array.from(
      new Set(junctionRows.map((row) => row.tag_id))
    ).filter(Boolean);

    if (tagIds.length === 0) {
      return localTags;
    }

    // 2. Fetch tag records from tags table
    const { data: tagsData, error: tagsError } = await client
      .from('tags')
      .select('*')
      .in('id', tagIds)
      .order('name', { ascending: true });

    if (tagsError) {
      console.error(`[contentService.getContentTags] Tags fetch error:`, tagsError.message);
      return localTags;
    }

    const dbTags = (tagsData as Tag[]) || [];
    if (dbTags.length > 0) {
      return dbTags;
    }

    return localTags;
  } catch (err) {
    console.error(`[contentService.getContentTags] Unexpected error for contentId "${contentId}":`, err);
    return localTags;
  }
}
