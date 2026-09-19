/**
 * Content Manifest Service & Validation Engine
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Automation Foundation + Content Manifest System
 * 
 * Responsibilities:
 * - Validate user-provided Content Manifests strictly against the platform schema.
 * - Normalize whitespace, tags, and generate URL-friendly slug helpers without altering user intent.
 * - Provide a clear conversion boundary for future ingestion services.
 * - Enforce the architectural rule: the manifest is the single source of truth for content placement.
 *   The system never uses AI to infer or alter user-specified section, category, topic, or content_type.
 */

import {
  ContentManifest,
  NormalizedContentManifest,
  ManifestValidationResult,
  ManifestIngestionPayload,
  ManifestSection,
  ManifestContentType,
  MANIFEST_SECTIONS,
  MANIFEST_CONTENT_TYPES,
  ManifestRelatedItem,
  AutomationManifestValidationResult,
  AutomationErrorCode,
  SUPPORTED_MANIFEST_VERSIONS,
} from '../types/manifest.js';
import { validateFileMetadata } from './storageService.js';

export * from '../types/manifest.js';

/**
 * Validates external source metadata boundary (Part B).
 * Source metadata is strictly optional and must NEVER affect content classification.
 */
export function validateSourceMetadata(source: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (source === undefined || source === null) {
    return { valid: true, errors };
  }

  if (typeof source !== 'object' || Array.isArray(source)) {
    return { valid: false, errors: ['Source metadata must be a non-null JSON object.'] };
  }

  const raw = source as Record<string, unknown>;
  if (raw.system === undefined || raw.system === null) {
    errors.push('Source metadata field "system" is required.');
  } else if (typeof raw.system !== 'string' || raw.system.trim().length === 0) {
    errors.push('Source metadata field "system" must be a non-empty string.');
  }

  if (raw.source_id !== undefined && raw.source_id !== null && typeof raw.source_id !== 'string') {
    errors.push('Source metadata field "source_id", when provided, must be a string.');
  }

  if (raw.source_url !== undefined && raw.source_url !== null) {
    if (typeof raw.source_url !== 'string' || raw.source_url.trim().length === 0) {
      errors.push('Source metadata field "source_url", when provided, must be a non-empty string.');
    }
  }

  if (raw.source_name !== undefined && raw.source_name !== null) {
    if (typeof raw.source_name !== 'string' || raw.source_name.trim().length === 0) {
      errors.push('Source metadata field "source_name", when provided, must be a non-empty string.');
    }
  }

  if (raw.generated_at !== undefined && raw.generated_at !== null) {
    if (typeof raw.generated_at !== 'string' || isNaN(Date.parse(raw.generated_at))) {
      errors.push('Source metadata field "generated_at", when provided, must be a valid ISO-8601 date string.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a versioned Automation Manifest (Part A, C, I).
 * 
 * Strict boundary enforcement for external automation systems:
 * 1. Requires manifest_version === "1.0".
 * 2. Requires section, category, topic, content_type, title.
 * 3. Enforces user metadata authority: NEVER silently infers or mutates taxonomy.
 * 4. Validates optional source metadata and file resources.
 */
export function validateAutomationManifest(manifest: unknown): AutomationManifestValidationResult {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return {
      valid: false,
      errors: ['Manifest must be a non-null JSON object.'],
      errorCode: 'INVALID_MANIFEST',
    };
  }

  const raw = manifest as Record<string, unknown>;
  const errors: string[] = [];
  let primaryErrorCode: AutomationErrorCode | undefined;

  // 1. Required field: manifest_version
  if (raw.manifest_version === undefined || raw.manifest_version === null) {
    errors.push('Missing required field: "manifest_version". Expected "1.0".');
    if (!primaryErrorCode) primaryErrorCode = 'MISSING_MANIFEST_VERSION';
  } else if (typeof raw.manifest_version !== 'string') {
    errors.push('Field "manifest_version" must be a string.');
    if (!primaryErrorCode) primaryErrorCode = 'UNSUPPORTED_MANIFEST_VERSION';
  } else if (!SUPPORTED_MANIFEST_VERSIONS.includes(raw.manifest_version as any)) {
    errors.push(
      `Unsupported manifest_version "${raw.manifest_version}". Only version "1.0" is currently supported.`
    );
    if (!primaryErrorCode) primaryErrorCode = 'UNSUPPORTED_MANIFEST_VERSION';
  }

  // 2. Required field: section
  if (raw.section === undefined || raw.section === null) {
    errors.push('Missing required field: "section".');
    if (!primaryErrorCode) primaryErrorCode = 'MISSING_REQUIRED_FIELD';
  } else if (typeof raw.section !== 'string') {
    errors.push('Field "section" must be a string.');
    if (!primaryErrorCode) primaryErrorCode = 'INVALID_SECTION';
  } else if (!MANIFEST_SECTIONS.includes(raw.section as ManifestSection)) {
    errors.push(
      `Invalid section "${raw.section}". Allowed sections are: ${MANIFEST_SECTIONS.join(', ')}.`
    );
    if (!primaryErrorCode) primaryErrorCode = 'INVALID_SECTION';
  }

  // 3. Required field: category
  if (raw.category === undefined || raw.category === null) {
    errors.push('Missing required field: "category".');
    if (!primaryErrorCode) primaryErrorCode = 'MISSING_REQUIRED_FIELD';
  } else if (typeof raw.category !== 'string') {
    errors.push('Field "category" must be a string.');
    if (!primaryErrorCode) primaryErrorCode = 'INVALID_CATEGORY';
  } else if (raw.category.trim().length === 0) {
    errors.push('Field "category" cannot be empty or contain only whitespace.');
    if (!primaryErrorCode) primaryErrorCode = 'INVALID_CATEGORY';
  }

  // 4. Required field: topic
  if (raw.topic === undefined || raw.topic === null) {
    errors.push('Missing required field: "topic".');
    if (!primaryErrorCode) primaryErrorCode = 'MISSING_REQUIRED_FIELD';
  } else if (typeof raw.topic !== 'string') {
    errors.push('Field "topic" must be a string.');
    if (!primaryErrorCode) primaryErrorCode = 'INVALID_TOPIC';
  } else if (raw.topic.trim().length === 0) {
    errors.push('Field "topic" cannot be empty or contain only whitespace.');
    if (!primaryErrorCode) primaryErrorCode = 'INVALID_TOPIC';
  }

  // 5. Required field: content_type
  if (raw.content_type === undefined || raw.content_type === null) {
    errors.push('Missing required field: "content_type".');
    if (!primaryErrorCode) primaryErrorCode = 'MISSING_REQUIRED_FIELD';
  } else if (typeof raw.content_type !== 'string') {
    errors.push('Field "content_type" must be a string.');
    if (!primaryErrorCode) primaryErrorCode = 'INVALID_CONTENT_TYPE';
  } else if (!MANIFEST_CONTENT_TYPES.includes(raw.content_type as ManifestContentType)) {
    errors.push(
      `Invalid content_type "${raw.content_type}". Allowed types are: ${MANIFEST_CONTENT_TYPES.join(', ')}.`
    );
    if (!primaryErrorCode) primaryErrorCode = 'INVALID_CONTENT_TYPE';
  }

  // 6. Required field: title
  if (raw.title === undefined || raw.title === null) {
    errors.push('Missing required field: "title".');
    if (!primaryErrorCode) primaryErrorCode = 'MISSING_REQUIRED_FIELD';
  } else if (typeof raw.title !== 'string') {
    errors.push('Field "title" must be a string.');
    if (!primaryErrorCode) primaryErrorCode = 'INVALID_TITLE';
  } else if (raw.title.trim().length === 0) {
    errors.push('Field "title" cannot be empty or contain only whitespace.');
    if (!primaryErrorCode) primaryErrorCode = 'INVALID_TITLE';
  }

  // 7. Optional source metadata validation
  if (raw.source !== undefined && raw.source !== null) {
    const sourceValidation = validateSourceMetadata(raw.source);
    if (!sourceValidation.valid) {
      errors.push(...sourceValidation.errors);
      if (!primaryErrorCode) primaryErrorCode = 'INVALID_SOURCE_METADATA';
    }
  }

  // 8. Run base manifest rules for remaining optional fields (tags, visibility, files, URLs)
  const baseValidation = validateContentManifest(manifest);
  for (const baseErr of baseValidation.errors) {
    if (!errors.includes(baseErr)) {
      errors.push(baseErr);
    }
  }

  if (errors.length > 0 && !primaryErrorCode) {
    primaryErrorCode = 'INVALID_MANIFEST';
  }

  return {
    valid: errors.length === 0,
    errors,
    errorCode: errors.length === 0 ? undefined : primaryErrorCode,
  };
}

/**
 * Generate a clean, URL-safe slug from any string
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/[^\w-]+/g, '') // Remove non-word characters except hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '') // Trim hyphen from start
    .replace(/-+$/, ''); // Trim hyphen from end
}

/**
 * Validates a Content Manifest against required and optional rules.
 * 
 * Verifies:
 * 1. The manifest is a valid non-null object.
 * 2. Required fields exist: section, category, topic, content_type, title.
 * 3. Section is one of the valid platform sections: 'academics' | 'research' | 'philosophy' | 'writings'.
 * 4. Content Type is one of the allowed extensible content types.
 * 5. Title is a non-empty string.
 * 6. Category is a non-empty string.
 * 7. Topic is a non-empty string.
 * 8. Tags, when provided, is an array of non-empty strings.
 * 
 * @param manifest The raw manifest object to validate
 * @returns ManifestValidationResult containing validity boolean and detailed error list
 */
export function validateContentManifest(manifest: unknown): ManifestValidationResult {
  const errors: string[] = [];

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return {
      valid: false,
      errors: ['Manifest must be a non-null JSON object.'],
    };
  }

  const raw = manifest as Record<string, unknown>;

  // Optional version check: if manifest_version is provided, must be supported (1.0)
  if (raw.manifest_version !== undefined && raw.manifest_version !== null) {
    if (typeof raw.manifest_version !== 'string' || !SUPPORTED_MANIFEST_VERSIONS.includes(raw.manifest_version as any)) {
      errors.push(`Unsupported manifest_version "${raw.manifest_version}". Only version "1.0" is currently supported.`);
    }
  }

  // Optional source metadata check
  if (raw.source !== undefined && raw.source !== null) {
    const srcVal = validateSourceMetadata(raw.source);
    if (!srcVal.valid) {
      errors.push(...srcVal.errors);
    }
  }

  // 1. Required field: title
  if (raw.title === undefined || raw.title === null) {
    errors.push('Missing required field: "title".');
  } else if (typeof raw.title !== 'string') {
    errors.push('Field "title" must be a string.');
  } else if (raw.title.trim().length === 0) {
    errors.push('Field "title" cannot be empty or contain only whitespace.');
  }

  // 2. Required field: section
  if (raw.section === undefined || raw.section === null) {
    errors.push('Missing required field: "section".');
  } else if (typeof raw.section !== 'string') {
    errors.push('Field "section" must be a string.');
  } else if (!MANIFEST_SECTIONS.includes(raw.section as ManifestSection)) {
    errors.push(
      `Invalid section "${raw.section}". Allowed sections are: ${MANIFEST_SECTIONS.join(', ')}.`
    );
  }

  // 3. Required field: category
  if (raw.category === undefined || raw.category === null) {
    errors.push('Missing required field: "category".');
  } else if (typeof raw.category !== 'string') {
    errors.push('Field "category" must be a string.');
  } else if (raw.category.trim().length === 0) {
    errors.push('Field "category" cannot be empty or contain only whitespace.');
  }

  // 4. Required field: topic
  if (raw.topic === undefined || raw.topic === null) {
    errors.push('Missing required field: "topic".');
  } else if (typeof raw.topic !== 'string') {
    errors.push('Field "topic" must be a string.');
  } else if (raw.topic.trim().length === 0) {
    errors.push('Field "topic" cannot be empty or contain only whitespace.');
  }

  // 5. Required field: content_type
  if (raw.content_type === undefined || raw.content_type === null) {
    errors.push('Missing required field: "content_type".');
  } else if (typeof raw.content_type !== 'string') {
    errors.push('Field "content_type" must be a string.');
  } else if (!MANIFEST_CONTENT_TYPES.includes(raw.content_type as ManifestContentType)) {
    errors.push(
      `Invalid content_type "${raw.content_type}". Allowed types are: ${MANIFEST_CONTENT_TYPES.join(', ')}.`
    );
  }

  // 6. Optional field: tags
  if (raw.tags !== undefined && raw.tags !== null) {
    if (!Array.isArray(raw.tags)) {
      errors.push('Field "tags", when provided, must be an array of strings.');
    } else {
      raw.tags.forEach((tag, idx) => {
        if (typeof tag !== 'string') {
          errors.push(`Tag at index ${idx} must be a string, received ${typeof tag}.`);
        } else if (tag.trim().length === 0) {
          errors.push(`Tag at index ${idx} cannot be empty or whitespace.`);
        }
      });
    }
  }

  // 7. Optional field: visibility
  if (raw.visibility !== undefined && raw.visibility !== null) {
    const allowedVisibility = ['public', 'registered', 'premium'];
    if (!allowedVisibility.includes(raw.visibility as string)) {
      errors.push(
        `Invalid visibility "${raw.visibility}". Allowed values are: ${allowedVisibility.join(', ')}.`
      );
    }
  }

  // 8. Optional field: boolean flags
  if (raw.is_featured !== undefined && typeof raw.is_featured !== 'boolean') {
    errors.push('Field "is_featured", when provided, must be a boolean.');
  }
  if (raw.published !== undefined && typeof raw.published !== 'boolean') {
    errors.push('Field "published", when provided, must be a boolean.');
  }

  // 9. Optional field: URLs and file resource metadata
  if (raw.external_url !== undefined && raw.external_url !== null && typeof raw.external_url !== 'string') {
    errors.push('Field "external_url", when provided, must be a string.');
  }
  if (raw.source_url !== undefined && raw.source_url !== null && typeof raw.source_url !== 'string') {
    errors.push('Field "source_url", when provided, must be a string.');
  }

  // File metadata validation (Step 11 — File Ingestion Foundation)
  if (raw.file_name !== undefined && raw.file_name !== null && typeof raw.file_name !== 'string') {
    errors.push('Field "file_name", when provided, must be a string.');
  }

  const trimmedFileName = typeof raw.file_name === 'string' ? raw.file_name.trim() : null;
  const hasFileAttributes =
    raw.file_type !== undefined ||
    raw.file_size !== undefined ||
    raw.file_path !== undefined;

  // Run full file validation if an actual file name or file attributes are provided
  if (trimmedFileName || hasFileAttributes) {
    const fileValidation = validateFileMetadata({
      file_name: raw.file_name as string,
      file_type: raw.file_type as string | undefined,
      file_size: raw.file_size as number | undefined,
      file_path: raw.file_path as string | undefined,
      source_url: raw.source_url as string | undefined,
    });

    if (!fileValidation.valid) {
      errors.push(...fileValidation.errors);
    }
  }

  // 10. Optional field: related_content
  if (raw.related_content !== undefined && raw.related_content !== null) {
    if (!Array.isArray(raw.related_content)) {
      errors.push('Field "related_content", when provided, must be an array.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Normalizes a validated Content Manifest.
 * 
 * Rules:
 * - Trims whitespace on strings.
 * - Converts empty optional strings to null.
 * - Deduplicates and trims tags while preserving casing.
 * - Generates URL-compatible slug helpers (topic_slug, title_slug).
 * - CRITICAL: Never alters or overrides user-selected section, category, topic, or content_type.
 * 
 * @param manifest Validated ContentManifest
 * @returns NormalizedContentManifest
 */
export function normalizeContentManifest(manifest: ContentManifest): NormalizedContentManifest {
  const cleanCategory = manifest.category.trim();
  const cleanTopic = manifest.topic.trim();
  const cleanTitle = manifest.title.trim();

  // Normalize tags: trim whitespace, eliminate empty strings, deduplicate
  const cleanTags: string[] = [];
  if (Array.isArray(manifest.tags)) {
    const seen = new Set<string>();
    for (const rawTag of manifest.tags) {
      if (typeof rawTag === 'string') {
        const trimmed = rawTag.trim();
        if (trimmed.length > 0 && !seen.has(trimmed.toLowerCase())) {
          seen.add(trimmed.toLowerCase());
          cleanTags.push(trimmed);
        }
      }
    }
  }

  // Normalize related_content array into uniform ManifestRelatedItem objects
  const cleanRelated: ManifestRelatedItem[] = [];
  if (Array.isArray(manifest.related_content)) {
    for (const item of manifest.related_content) {
      if (typeof item === 'string' && item.trim().length > 0) {
        cleanRelated.push({ slug: item.trim(), relationship_type: 'related' });
      } else if (item && typeof item === 'object') {
        const relObj = item as ManifestRelatedItem;
        cleanRelated.push({
          slug: relObj.slug?.trim() || undefined,
          id: relObj.id?.trim() || undefined,
          relationship_type: relObj.relationship_type?.trim() || 'related',
        });
      }
    }
  }

  const cleanSubcategory = manifest.subcategory?.trim() || null;
  const cleanDescription = manifest.description?.trim() || null;
  const cleanExternalUrl = manifest.external_url?.trim() || null;
  const cleanSourceUrl = manifest.source_url?.trim() || null;
  const cleanFileName = manifest.file_name?.trim() || null;
  const cleanFileType = manifest.file_type?.trim().toLowerCase() || null;
  const cleanFileSize = typeof manifest.file_size === 'number' && !isNaN(manifest.file_size) ? manifest.file_size : null;
  const cleanFilePath = manifest.file_path?.trim() || null;
  const cleanLanguage = manifest.language?.trim() || 'en';
  const cleanVisibility = manifest.visibility || 'public';
  const cleanIsFeatured = manifest.is_featured ?? false;
  const cleanPublished = manifest.published ?? false;

  return {
    section: manifest.section, // Preserved exactly as user specified
    category: cleanCategory, // Preserved without semantic alteration
    topic: cleanTopic, // Preserved
    topic_slug: slugify(cleanTopic),
    content_type: manifest.content_type, // Preserved exactly as user specified
    title: cleanTitle,
    title_slug: slugify(cleanTitle),
    subcategory: cleanSubcategory,
    description: cleanDescription,
    tags: cleanTags,
    language: cleanLanguage,
    visibility: cleanVisibility,
    is_featured: cleanIsFeatured,
    external_url: cleanExternalUrl,
    source_url: cleanSourceUrl,
    file_name: cleanFileName,
    file_type: cleanFileType,
    file_size: cleanFileSize,
    file_path: cleanFilePath,
    related_content: cleanRelated,
    published: cleanPublished,
  };
}

/**
 * Conversion Boundary:
 * Prepares the intermediate ingestion payload from a normalized Content Manifest.
 * 
 * Pipeline Contract:
 * Content Manifest → Future Content Ingestion Service → Supabase (content, tags, content_relationships)
 * 
 * This function does NOT perform database writes or network calls.
 * It establishes the formal boundary mapping contract for future automation pipelines.
 */
export function prepareIngestionPayload(normalized: NormalizedContentManifest): ManifestIngestionPayload {
  return {
    contentRecord: {
      title: normalized.title,
      slug: normalized.title_slug,
      description: normalized.description,
      section: normalized.section,
      category: normalized.category,
      subcategory: normalized.subcategory,
      content_type: normalized.content_type,
      body: null, // Body or rich text is supplied by source file or notebook content during ingestion
      thumbnail_url: null,
      file_url: normalized.file_path || normalized.file_name, // Bound to storage reference in ingestion pipeline
      external_url: normalized.external_url,
      language: normalized.language,
      status: normalized.published ? 'published' : 'draft',
      visibility: normalized.visibility,
      is_featured: normalized.is_featured,
    },
    tagsToAssociate: normalized.tags,
    relationshipsToLink: normalized.related_content.map((rel) => ({
      target_identifier: rel.slug || rel.id || '',
      relationship_type: rel.relationship_type || 'related',
    })),
    sourceMetadata: {
      topic: normalized.topic,
      topic_slug: normalized.topic_slug,
      source_url: normalized.source_url,
      file_name: normalized.file_name,
      file_type: normalized.file_type,
      file_size: normalized.file_size,
      file_path: normalized.file_path,
    },
  };
}
