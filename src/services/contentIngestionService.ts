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
import {
  validateFileMetadata,
  uploadFile,
  deleteFile,
  generateDeterministicStoragePath,
  StorageUploadParams,
  StorageUploadResult,
  StorageDeleteParams,
  StorageDeleteResult,
} from './storageService';

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
  /**
   * Optional file resource accompanying the manifest (Step 11 — File Ingestion Foundation).
   * Orchestrated through uploadFile before database record creation.
   */
  fileResource?: {
    data: Buffer | Uint8Array | Blob | string;
    fileName: string;
    fileType?: string; // MIME type e.g. 'application/pdf'
    fileSize?: number; // Size in bytes
    filePath?: string; // Optional custom target path
  };
  /**
   * Optional storage service overrides for testing or isolated mocks.
   */
  storageService?: {
    uploadFile: (params: StorageUploadParams, client?: any) => Promise<StorageUploadResult>;
    deleteFile: (params: StorageDeleteParams, client?: any) => Promise<StorageDeleteResult>;
  };
}

export interface IngestionResult {
  success: boolean;
  content: ContentItem | null;
  slug: string | null;
  title?: string | null;
  topic: string | null;
  tagsCreated: number;
  tagsAssociated: number;
  relationshipsCreated: number;
  fileUploaded?: boolean;
  filePath?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  fileCleanedUp?: boolean;
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
function mapManifestToContentRecord(
  normalized: NormalizedContentManifest,
  slug: string,
  resolvedFileUrl?: string | null
): Record<string, unknown> {
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
    file_url: resolvedFileUrl !== undefined ? resolvedFileUrl : (normalized.file_path || normalized.file_name),
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

  // 1. Validation of Manifest
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
      fileUploaded: false,
      errors: validation.errors,
    };
  }

  // 1b. Validation of File Resource (if provided in options)
  let normalizedData: Buffer | Uint8Array | Blob | null = null;
  let fileDataSize = 0;
  let sanitizedFileName: string | null = null;
  let detectedExtension: string | null = null;

  if (options.fileResource) {
    const rawData = options.fileResource.data;
    if (!rawData) {
      return {
        success: false,
        content: null,
        slug: null,
        title: (rawManifest as any)?.title || null,
        topic: null,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: false,
        errors: ['Missing file data: Uploaded file contains no binary or base64 data.'],
      };
    }

    if (typeof rawData === 'string') {
      try {
        const cleanBase64 = rawData.includes(',') ? rawData.split(',')[1] : rawData;
        normalizedData = Buffer.from(cleanBase64, 'base64');
        fileDataSize = normalizedData.length;
      } catch {
        return {
          success: false,
          content: null,
          slug: null,
          title: (rawManifest as any)?.title || null,
          topic: null,
          tagsCreated: 0,
          tagsAssociated: 0,
          relationshipsCreated: 0,
          fileUploaded: false,
          errors: ['Malformed file data: Failed to decode base64 file data.'],
        };
      }
    } else if (Buffer.isBuffer(rawData)) {
      normalizedData = rawData;
      fileDataSize = rawData.length;
    } else if (rawData instanceof Uint8Array) {
      normalizedData = rawData;
      fileDataSize = rawData.byteLength;
    } else if (typeof Blob !== 'undefined' && rawData instanceof Blob) {
      normalizedData = rawData;
      fileDataSize = rawData.size;
    } else {
      return {
        success: false,
        content: null,
        slug: null,
        title: (rawManifest as any)?.title || null,
        topic: null,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: false,
        errors: ['Malformed file data: File data must be a Buffer, Uint8Array, Blob, or base64 string.'],
      };
    }

    if (fileDataSize === 0) {
      return {
        success: false,
        content: null,
        slug: null,
        title: (rawManifest as any)?.title || null,
        topic: null,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: false,
        errors: ['Malformed file data: Uploaded file is empty (0 bytes).'],
      };
    }

    const effectiveSize = options.fileResource.fileSize ?? fileDataSize;

    const fileValidation = validateFileMetadata({
      file_name: options.fileResource.fileName,
      file_type: options.fileResource.fileType,
      file_size: effectiveSize,
      file_path: options.fileResource.filePath,
    });

    if (!fileValidation.valid) {
      return {
        success: false,
        content: null,
        slug: null,
        title: (rawManifest as any)?.title || null,
        topic: null,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: false,
        errors: fileValidation.errors,
      };
    }

    sanitizedFileName = fileValidation.sanitizedFileName;
    detectedExtension = fileValidation.detectedExtension;
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
      fileUploaded: false,
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
      fileUploaded: false,
      errors: [
        'Supabase client is not configured or unavailable. Set environment variables to enable persistence.',
      ],
    };
  }

  // 5. Dry-Run Check
  if (options.dryRun) {
    const dryRunPath = options.fileResource
      ? options.fileResource.filePath ||
        generateDeterministicStoragePath({
          section: normalized.section,
          category: normalized.category,
          topic: normalized.topic,
          contentType: normalized.content_type,
          fileName: sanitizedFileName || options.fileResource.fileName,
        })
      : null;

    return {
      success: true,
      content: null,
      slug,
      title: normalized.title,
      topic: normalized.topic,
      tagsCreated: 0,
      tagsAssociated: normalized.tags.length,
      relationshipsCreated: normalized.related_content.length,
      fileUploaded: !!options.fileResource,
      filePath: dryRunPath,
      fileName: options.fileResource ? (sanitizedFileName || options.fileResource.fileName) : undefined,
      fileType: options.fileResource ? (options.fileResource.fileType || (detectedExtension ? `application/${detectedExtension}` : undefined)) : undefined,
      fileSize: options.fileResource ? (options.fileResource.fileSize ?? fileDataSize) : undefined,
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
        title: normalized.title,
        topic: normalized.topic,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: false,
        errors: [`Database check failed: ${checkError.message}`],
      };
    }

    if (existingItem) {
      return {
        success: false,
        content: null,
        slug,
        title: normalized.title,
        topic: normalized.topic,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: false,
        errors: [`Duplicate content error: A publication with slug "${slug}" already exists.`],
      };
    }

    // 7. File Ingestion Step (orchestrated BEFORE database insertion)
    let uploadedStoragePath: string | null = null;
    let resolvedFileUrl: string | null = null;

    if (options.fileResource) {
      const targetStoragePath =
        options.fileResource.filePath ||
        generateDeterministicStoragePath({
          section: normalized.section,
          category: normalized.category,
          topic: normalized.topic,
          contentType: normalized.content_type,
          fileName: sanitizedFileName || options.fileResource.fileName,
        });

      const uploadFn = options.storageService?.uploadFile || uploadFile;
      const uploadResult = await uploadFn(
        {
          path: targetStoragePath,
          data: (normalizedData || options.fileResource.data) as any,
          contentType: options.fileResource.fileType || (detectedExtension ? `application/${detectedExtension}` : 'application/octet-stream'),
        },
        client
      );

      if (!uploadResult.success) {
        // Architectural Failure Boundary: If file upload fails, do not create an incomplete content record.
        return {
          success: false,
          content: null,
          slug,
          title: normalized.title,
          topic: normalized.topic,
          tagsCreated: 0,
          tagsAssociated: 0,
          relationshipsCreated: 0,
          fileUploaded: false,
          errors: [
            `File upload failed: ${uploadResult.error || 'Unknown storage upload error'}. Content record was not created.`,
          ],
        };
      }

      uploadedStoragePath = uploadResult.path;
      resolvedFileUrl = uploadResult.path;
    }

    // 8. Insert Content Record
    const contentRecordPayload = mapManifestToContentRecord(normalized, slug, resolvedFileUrl);
    const { data: insertedContent, error: insertError } = await client
      .from('content')
      .insert(contentRecordPayload)
      .select('*')
      .single();

    if (insertError || !insertedContent) {
      // Architectural Failure Boundary: If database insertion fails after a successful file upload,
      // attempt safe cleanup of the newly uploaded file where possible.
      let fileCleanedUp = false;
      if (uploadedStoragePath) {
        try {
          const deleteFn = options.storageService?.deleteFile || deleteFile;
          const deleteRes = await deleteFn({ path: uploadedStoragePath }, client);
          fileCleanedUp = deleteRes.success;
        } catch {
          fileCleanedUp = false;
        }
      }

      const cleanupNote = fileCleanedUp
        ? ' Newly uploaded file was safely cleaned up.'
        : uploadedStoragePath
        ? ' Warning: Automatic cleanup of the uploaded file could not be confirmed.'
        : '';

      // Catch duplicate slug conflict during insertion (e.g. concurrent race condition)
      const isDuplicateInsert =
        insertError &&
        (insertError.code === '23505' ||
          insertError.message?.toLowerCase().includes('duplicate') ||
          insertError.message?.toLowerCase().includes('unique constraint'));

      if (isDuplicateInsert) {
        return {
          success: false,
          content: null,
          slug,
          title: normalized.title,
          topic: normalized.topic,
          tagsCreated: 0,
          tagsAssociated: 0,
          relationshipsCreated: 0,
          fileUploaded: !!uploadedStoragePath,
          fileCleanedUp,
          errors: [
            `Duplicate content error: A publication with slug "${slug}" already exists.${cleanupNote}`,
          ],
        };
      }

      // Catch RLS write permission error cleanly
      if (insertError && (insertError.code === '42501' || insertError.message.includes('row-level security'))) {
        return {
          success: false,
          content: null,
          slug,
          title: normalized.title,
          topic: normalized.topic,
          tagsCreated: 0,
          tagsAssociated: 0,
          relationshipsCreated: 0,
          fileUploaded: !!uploadedStoragePath,
          fileCleanedUp,
          errors: [
            `Database write denied by Row-Level Security (RLS). Content ingestion requires authenticated or server-side authority.${cleanupNote}`,
          ],
        };
      }

      return {
        success: false,
        content: null,
        slug,
        title: normalized.title,
        topic: normalized.topic,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: !!uploadedStoragePath,
        fileCleanedUp,
        errors: [`Content insertion failed: ${insertError?.message || 'Unknown database error'}.${cleanupNote}`],
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
      title: normalized.title,
      topic: normalized.topic,
      tagsCreated: tagsCreatedCount,
      tagsAssociated: tagsAssociatedCount,
      relationshipsCreated: relationshipsCreatedCount,
      fileUploaded: !!uploadedStoragePath,
      filePath: uploadedStoragePath,
      fileName: options.fileResource ? (sanitizedFileName || options.fileResource.fileName) : undefined,
      fileType: options.fileResource ? (options.fileResource.fileType || (detectedExtension ? `application/${detectedExtension}` : undefined)) : undefined,
      fileSize: options.fileResource ? (options.fileResource.fileSize ?? fileDataSize) : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : [],
    };
  } catch (unexpectedError: any) {
    return {
      success: false,
      content: null,
      slug,
      title: (rawManifest as any)?.title || null,
      topic: null,
      tagsCreated: 0,
      tagsAssociated: 0,
      relationshipsCreated: 0,
      fileUploaded: false,
      errors: [`Unexpected ingestion error: ${unexpectedError?.message || String(unexpectedError)}`],
    };
  }
}
