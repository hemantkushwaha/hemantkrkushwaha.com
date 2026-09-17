/**
 * Central Content Ingestion Service
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Unified Content Model & Automation Ingestion Foundation
 * 
 * Responsibilities:
 * - Single entry point for future automated content sources (Google Drive, NotebookLM, Google Slides, AI Studio, GitHub).
 * - Accepts a raw or validated ContentManifest.
 * - Validates and normalizes metadata against platform taxonomy.
 * - Generates deterministic URL-safe slugs.
 * - Enforces duplicate slug prevention (no overwriting).
 * - Maps manifest fields to the existing unified `content` schema.
 * - Manages tag creation and junction links in `tags` and `content_tags`.
 * - Resolves companion relationships in `content_relationships` with referential integrity.
 * - Strictly respects user-selected section, category, topic, and content_type (NEVER uses AI inference).
 * - Adheres strictly to security: zero secret key leakage, respect RLS boundaries, safe error handling.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';
import { ContentItem, ContentStatus, ContentVisibility } from '../types/content';
import {
  ContentManifest,
  NormalizedContentManifest,
  validateContentManifest,
  normalizeContentManifest,
  ManifestRelatedItem,
} from './manifestService';

export interface IngestionOptions {
  /**
   * Optional custom Supabase client (e.g., authenticated admin client or mock for testing).
   * Defaults to getSupabaseClient() if not provided.
   */
  client?: SupabaseClient | any;
  /**
   * If true, performs validation, normalization, slug calculation, and relationship resolution
   * without committing changes to the database.
   */
  dryRun?: boolean;
}

export interface IngestionResult {
  success: boolean;
  content: ContentItem | null;
  slug: string | null;
  topic: string | null;
  tagsCreated: number;
  tagsAssociated: number;
  relationshipsCreated: number;
  warnings?: string[];
  errors: string[];
}

/**
 * Generates a deterministic, URL-safe slug from a title string.
 * 
 * Rules:
 * - Lowercase
 * - Convert unicode dashes, en-dashes, em-dashes and spaces to single hyphens
 * - Remove non-alphanumeric characters (except hyphens)
 * - Eliminate duplicate hyphens
 * - Trim leading and trailing hyphens
 * 
 * Example:
 * "ARP – Address Resolution Protocol" → "arp-address-resolution-protocol"
 */
export function generateDeterministicSlug(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[—–]/g, '-') // Replace em-dash and en-dash with hyphen
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/[^\w-]/g, '') // Remove non-word characters except hyphens
    .replace(/--+/g, '-') // Collapse multiple hyphens into one
    .replace(/^-+/, '') // Remove leading hyphens
    .replace(/-+$/, ''); // Remove trailing hyphens
}

/**
 * Maps a normalized manifest to the Supabase `content` table schema.
 * Preserves user intent as the absolute single source of truth.
 */
function mapManifestToContentRecord(normalized: NormalizedContentManifest, slug: string): Record<string, unknown> {
  const status: ContentStatus = normalized.published ? 'published' : 'draft';
  const publishedAt: string | null = normalized.published ? new Date().toISOString() : null;

  return {
    title: normalized.title,
    slug: slug,
    description: normalized.description,
    section: normalized.section,
    category: normalized.category,
    subcategory: normalized.subcategory,
    content_type: normalized.content_type,
    body: null, // Body content is populated during document/file ingestion
    thumbnail_url: null,
    file_url: normalized.file_name,
    external_url: normalized.external_url,
    language: normalized.language,
    status: status,
    visibility: normalized.visibility,
    is_featured: normalized.is_featured,
    published_at: publishedAt,
  };
}

/**
 * Central Content Ingestion Entry Point
 * 
 * Future automated pipelines (NotebookLM, Google Slides, AI Studio, etc.)
 * pass their generated ContentManifest here.
 */
export async function ingestContent(
  rawManifest: unknown,
  options: IngestionOptions = {}
): Promise<IngestionResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Validation
  const validation = validateContentManifest(rawManifest);
  if (!validation.valid) {
    return {
      success: false,
      content: null,
      slug: null,
      topic: null,
      tagsCreated: 0,
      tagsAssociated: 0,
      relationshipsCreated: 0,
      errors: validation.errors,
    };
  }

  // 2. Normalization
  const normalized = normalizeContentManifest(rawManifest as ContentManifest);

  // 3. Slug Generation
  const slug = generateDeterministicSlug(normalized.title);
  if (!slug) {
    return {
      success: false,
      content: null,
      slug: null,
      topic: normalized.topic,
      tagsCreated: 0,
      tagsAssociated: 0,
      relationshipsCreated: 0,
      errors: ['Failed to generate a valid URL slug from the title.'],
    };
  }

  // 4. Client Resolution
  const client: SupabaseClient | null = options.client || getSupabaseClient();
  if (!client) {
    return {
      success: false,
      content: null,
      slug,
      topic: normalized.topic,
      tagsCreated: 0,
      tagsAssociated: 0,
      relationshipsCreated: 0,
      errors: [
        'Supabase client is not configured or unavailable. Set environment variables to enable persistence.',
      ],
    };
  }

  // 5. Dry-Run Check
  if (options.dryRun) {
    return {
      success: true,
      content: null,
      slug,
      topic: normalized.topic,
      tagsCreated: 0,
      tagsAssociated: normalized.tags.length,
      relationshipsCreated: normalized.related_content.length,
      warnings: ['Dry run mode: validation and normalization succeeded without database writes.'],
      errors: [],
    };
  }

  try {
    // 6. Check for duplicate slug (do NOT overwrite existing content)
    const { data: existingItem, error: checkError } = await client
      .from('content')
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (checkError) {
      // Check if it's an RLS read error or connection issue
      return {
        success: false,
        content: null,
        slug,
        topic: normalized.topic,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        errors: [`Database check failed: ${checkError.message}`],
      };
    }

    if (existingItem) {
      return {
        success: false,
        content: null,
        slug,
        topic: normalized.topic,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        errors: [`Duplicate content error: A publication with slug "${slug}" already exists.`],
      };
    }

    // 7. Insert Content Record
    const contentRecordPayload = mapManifestToContentRecord(normalized, slug);
    const { data: insertedContent, error: insertError } = await client
      .from('content')
      .insert(contentRecordPayload)
      .select('*')
      .single();

    if (insertError || !insertedContent) {
      // Catch RLS write permission error cleanly
      if (insertError && (insertError.code === '42501' || insertError.message.includes('row-level security'))) {
        return {
          success: false,
          content: null,
          slug,
          topic: normalized.topic,
          tagsCreated: 0,
          tagsAssociated: 0,
          relationshipsCreated: 0,
          errors: [
            'Database write denied by Row-Level Security (RLS). Content ingestion requires authenticated or server-side authority.',
          ],
        };
      }

      return {
        success: false,
        content: null,
        slug,
        topic: normalized.topic,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        errors: [`Content insertion failed: ${insertError?.message || 'Unknown database error'}`],
      };
    }

    const createdContentId = insertedContent.id;
    let tagsCreatedCount = 0;
    let tagsAssociatedCount = 0;
    let relationshipsCreatedCount = 0;

    // 8. Tag Processing
    if (normalized.tags.length > 0) {
      for (const tagName of normalized.tags) {
        try {
          const tagSlug = generateDeterministicSlug(tagName);

          // Find existing tag by name or slug
          let tagId: string | null = null;
          const { data: existingTag } = await client
            .from('tags')
            .select('id, name')
            .ilike('name', tagName)
            .maybeSingle();

          if (existingTag) {
            tagId = existingTag.id;
          } else {
            // Create missing tag record
            const { data: newTag, error: tagCreateError } = await client
              .from('tags')
              .insert({ name: tagName, slug: tagSlug })
              .select('id')
              .single();

            if (!tagCreateError && newTag) {
              tagId = newTag.id;
              tagsCreatedCount++;
            }
          }

          // Link via content_tags junction table
          if (tagId) {
            const { error: linkError } = await client
              .from('content_tags')
              .insert({ content_id: createdContentId, tag_id: tagId });

            if (!linkError) {
              tagsAssociatedCount++;
            }
          }
        } catch {
          warnings.push(`Failed to associate tag "${tagName}".`);
        }
      }
    }

    // 9. Relationship Processing
    if (normalized.related_content.length > 0) {
      const processedTargetIds = new Set<string>();

      for (const rel of normalized.related_content) {
        const identifier = rel.slug || rel.id;
        if (!identifier) {
          warnings.push('Encountered relationship item with missing slug and id.');
          continue;
        }

        // Prevent self-relationship
        if (identifier === slug || identifier === createdContentId) {
          errors.push(`Self-relationship prevented: Content cannot be linked to itself ("${identifier}").`);
          continue;
        }

        try {
          // Resolve existing target content record
          let query = client.from('content').select('id, slug');
          if (rel.id) {
            query = query.eq('id', rel.id);
          } else if (rel.slug) {
            query = query.eq('slug', rel.slug);
          }

          const { data: targetRecord } = await query.maybeSingle();

          if (!targetRecord) {
            warnings.push(
              `Related content "${identifier}" could not be resolved in the database. Skipped to prevent broken relationship.`
            );
            continue;
          }

          const targetId = targetRecord.id;

          // Prevent duplicate relationship linking
          if (processedTargetIds.has(targetId)) {
            continue;
          }
          processedTargetIds.add(targetId);

          // Insert relationship
          const { error: relInsertError } = await client
            .from('content_relationships')
            .insert({
              source_content_id: createdContentId,
              target_content_id: targetId,
              relationship_type: rel.relationship_type || 'related',
            });

          if (!relInsertError) {
            relationshipsCreatedCount++;
          }
        } catch {
          warnings.push(`Failed to establish relationship with "${identifier}".`);
        }
      }
    }

    // 10. Topic Handling
    // The database currently does not have a dedicated topic column.
    // We preserve the topic in the return result and metadata boundary so it is never discarded.

    return {
      success: true,
      content: insertedContent as ContentItem,
      slug,
      topic: normalized.topic,
      tagsCreated: tagsCreatedCount,
      tagsAssociated: tagsAssociatedCount,
      relationshipsCreated: relationshipsCreatedCount,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : [],
    };
  } catch (unexpectedError: any) {
    return {
      success: false,
      content: null,
      slug,
      topic: normalized.topic,
      tagsCreated: 0,
      tagsAssociated: 0,
      relationshipsCreated: 0,
      errors: [`Unexpected ingestion error: ${unexpectedError?.message || String(unexpectedError)}`],
    };
  }
}
