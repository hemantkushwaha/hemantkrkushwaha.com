import { SectionId, ContentStatus, ContentVisibility } from './content';

/**
 * Standard Sections supported on the platform
 */
export const MANIFEST_SECTIONS = [
  'academics',
  'research',
  'philosophy',
  'writings',
] as const;

export type ManifestSection = (typeof MANIFEST_SECTIONS)[number];

/**
 * Standard extensible Content Types supported by the manifest system.
 */
export const MANIFEST_CONTENT_TYPES = [
  'article',
  'study_material',
  'presentation',
  'interactive',
  'book',
  'book_chapter',
  'research_paper',
  'research_project',
  'patent',
  'dataset',
  'lecture',
  'video',
  'poem',
  'novel',
  'short_story',
  'essay',
  'reflection',
  'resource',
] as const;

export type ManifestContentType = (typeof MANIFEST_CONTENT_TYPES)[number];

/**
 * Related content reference in a manifest.
 * Can be a simple string (slug or ID) or an object with relationship details.
 */
export interface ManifestRelatedItem {
  slug?: string;
  id?: string;
  relationship_type?: string;
}

export type ManifestRelatedContent = string | ManifestRelatedItem;

/**
 * Standard Content Manifest
 * 
 * Single source of truth for automated content placement.
 * Defines exactly where a resource belongs across section, category, and topic.
 * The system must NOT use AI to guess or alter these values.
 * 
 * Metadata only — never contains large binary files.
 */
export interface ContentManifest {
  // Required fields
  section: ManifestSection;
  category: string;
  topic: string;
  content_type: ManifestContentType;
  title: string;

  // Optional fields
  subcategory?: string;
  description?: string;
  tags?: string[];
  language?: string;
  visibility?: ContentVisibility;
  is_featured?: boolean;
  external_url?: string;
  source_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  file_path?: string;
  related_content?: ManifestRelatedContent[];
  published?: boolean;
}

/**
 * Normalized representation of a Content Manifest
 * Preserves user-selected section, category, and content_type while cleaning whitespace,
 * normalizing tags, and providing slug-compatible helpers.
 */
export interface NormalizedContentManifest {
  section: ManifestSection;
  category: string;
  topic: string;
  topic_slug: string;
  content_type: ManifestContentType;
  title: string;
  title_slug: string;
  subcategory: string | null;
  description: string | null;
  tags: string[];
  language: string;
  visibility: ContentVisibility;
  is_featured: boolean;
  external_url: string | null;
  source_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  file_path: string | null;
  related_content: ManifestRelatedItem[];
  published: boolean;
}

/**
 * Manifest Validation Result
 */
export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Conversion Boundary Contract:
 * Content Manifest → Future Content Ingestion Service → Supabase (content, tags, content_relationships)
 */
export interface ManifestIngestionPayload {
  contentRecord: {
    title: string;
    slug: string;
    description: string | null;
    section: ManifestSection;
    category: string;
    subcategory: string | null;
    content_type: ManifestContentType;
    body: string | null;
    thumbnail_url: string | null;
    file_url: string | null;
    external_url: string | null;
    language: string;
    status: ContentStatus;
    visibility: ContentVisibility;
    is_featured: boolean;
  };
  tagsToAssociate: string[];
  relationshipsToLink: Array<{
    target_identifier: string; // slug or UUID
    relationship_type: string;
  }>;
  sourceMetadata: {
    topic: string;
    topic_slug: string;
    source_url: string | null;
    file_name: string | null;
    file_type: string | null;
    file_size: number | null;
    file_path: string | null;
  };
}
