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

/**
 * 1. getPublishedContent
 * Fetches all published, publicly visible content across all sections.
 * Ordered by published_at DESC, then created_at DESC.
 */
export async function getPublishedContent(): Promise<ContentItem[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
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
      return [];
    }

    return (data as ContentItem[]) || [];
  } catch (err) {
    console.error('[contentService.getPublishedContent] Unexpected error:', err);
    return [];
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

  const client = getSupabaseClient();
  if (!client) {
    return null;
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
      return null;
    }

    return (data as ContentItem) || null;
  } catch (err) {
    console.error(`[contentService.getContentBySlug] Unexpected error for slug "${slug}":`, err);
    return null;
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

  const client = getSupabaseClient();
  if (!client) {
    return [];
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
      return [];
    }

    return (data as ContentItem[]) || [];
  } catch (err) {
    console.error(`[contentService.getContentBySection] Unexpected error for section "${section}":`, err);
    return [];
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

  const client = getSupabaseClient();
  if (!client) {
    return [];
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
      return [];
    }

    return (data as ContentItem[]) || [];
  } catch (err) {
    console.error(`[contentService.getContentByCategory] Unexpected error for section "${section}", category "${category}":`, err);
    return [];
  }
}

/**
 * 5. getFeaturedContent
 * Fetches published, publicly visible content flagged as is_featured = true.
 * Ordered by published_at DESC, then created_at DESC.
 */
export async function getFeaturedContent(): Promise<ContentItem[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
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
      return [];
    }

    return (data as ContentItem[]) || [];
  } catch (err) {
    console.error('[contentService.getFeaturedContent] Unexpected error:', err);
    return [];
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

  const client = getSupabaseClient();
  if (!client) {
    return [];
  }

  try {
    // Retrieve relationships involving this contentId
    const { data: relationships, error: relError } = await client
      .from('content_relationships')
      .select('source_content_id, target_content_id')
      .or(`source_content_id.eq.${contentId},target_content_id.eq.${contentId}`);

    if (relError) {
      console.error(`[contentService.getRelatedContent] Relationship query error for id "${contentId}":`, relError.message);
      return [];
    }

    if (!relationships || relationships.length === 0) {
      return [];
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
      return [];
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
      return [];
    }

    return (relatedItems as ContentItem[]) || [];
  } catch (err) {
    console.error(`[contentService.getRelatedContent] Unexpected error for id "${contentId}":`, err);
    return [];
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

  const client = getSupabaseClient();
  if (!client) {
    return [];
  }

  try {
    // 1. Fetch tag_ids from content_tags junction table
    const { data: junctionRows, error: junctionError } = await client
      .from('content_tags')
      .select('tag_id')
      .eq('content_id', contentId);

    if (junctionError) {
      console.error(`[contentService.getContentTags] Junction query error for contentId "${contentId}":`, junctionError.message);
      return [];
    }

    if (!junctionRows || junctionRows.length === 0) {
      return [];
    }

    const tagIds = Array.from(
      new Set(junctionRows.map((row) => row.tag_id))
    ).filter(Boolean);

    if (tagIds.length === 0) {
      return [];
    }

    // 2. Fetch tag records from tags table
    const { data: tagsData, error: tagsError } = await client
      .from('tags')
      .select('*')
      .in('id', tagIds)
      .order('name', { ascending: true });

    if (tagsError) {
      console.error(`[contentService.getContentTags] Tags fetch error:`, tagsError.message);
      return [];
    }

    return (tagsData as Tag[]) || [];
  } catch (err) {
    console.error(`[contentService.getContentTags] Unexpected error for contentId "${contentId}":`, err);
    return [];
  }
}
