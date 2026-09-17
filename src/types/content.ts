/**
 * Unified Content Architecture Type Definitions
 * 
 * Platform: Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Author: Hemant Kumar Kushwaha (Teacher · Researcher · Thinker · Writer)
 * Architecture: Unified Content Model across Academics, Research, Philosophy, and Writings
 */

export type SectionId = 'academics' | 'research' | 'philosophy' | 'writings';

export type ContentStatus = 'draft' | 'published' | 'archived';

export type ContentVisibility = 'public' | 'registered' | 'premium';

/**
 * Extensible content types supported by the platform.
 * Specific string unions provide strong autocompletion while string allows new types without schema changes.
 */
export type ContentType =
  | 'article'
  | 'study_material'
  | 'presentation'
  | 'interactive'
  | 'book'
  | 'book_chapter'
  | 'research_paper'
  | 'research_project'
  | 'patent'
  | 'dataset'
  | 'lecture'
  | 'video'
  | 'poem'
  | 'novel'
  | 'short_story'
  | 'essay'
  | 'reflection'
  | 'resource'
  | (string & {});

/**
 * Standard categories prepared across the 4 foundational domains.
 * The schema allows additional subcategories and future categories seamlessly.
 */
export type AcademicsCategory =
  | 'Courses & Subjects'
  | 'Study Material'
  | 'Presentations'
  | 'Interactive Learning'
  | 'Academic Books'
  | 'Lectures';

export type ResearchCategory =
  | 'Research Projects'
  | 'Publications'
  | 'Patents'
  | 'PhD Research'
  | 'Experiments'
  | 'Datasets'
  | 'Research Notes';

export type PhilosophyCategory =
  | 'Psychology'
  | 'Relationships'
  | 'Meditation'
  | 'God & Spirituality'
  | 'Consciousness'
  | 'Life'
  | 'Human Nature'
  | 'Society';

export type WritingsCategory =
  | 'Poetry'
  | 'Novels'
  | 'Short Stories'
  | 'Essays'
  | 'Reflections'
  | 'Books';

export type StandardCategory =
  | AcademicsCategory
  | ResearchCategory
  | PhilosophyCategory
  | WritingsCategory
  | (string & {});

/**
 * Primary Unified Content Model
 * Corresponds to the PostgreSQL `content` table in Supabase.
 */
export interface ContentItem {
  id: string; // UUID primary key
  title: string;
  slug: string; // Unique URL-friendly slug
  description: string | null;
  section: SectionId;
  category: StandardCategory;
  subcategory: string | null;
  content_type: ContentType;
  body: string | null; // Rich markdown or structured text
  thumbnail_url: string | null;
  file_url: string | null; // Pointer to Supabase Storage / CDN assets (PDF, PPT, DOC, etc.)
  external_url: string | null; // Pointer to external publications, DOI, repo, or web apps
  language: string; // e.g. 'en', 'hi'
  status: ContentStatus;
  visibility: ContentVisibility;
  is_featured: boolean;
  published_at: string | null; // ISO 8601 timestamp with timezone
  created_at: string; // ISO 8601 timestamp with timezone
  updated_at: string; // ISO 8601 timestamp with timezone
}

/**
 * Many-to-Many Tag Entity
 * Corresponds to the PostgreSQL `tags` table in Supabase.
 */
export interface Tag {
  id: string; // UUID primary key
  name: string;
  slug: string; // Unique URL-friendly slug
  created_at: string;
  updated_at: string;
}

/**
 * Junction Model for Many-to-Many Tagging
 * Corresponds to the PostgreSQL `content_tags` table in Supabase.
 */
export interface ContentTag {
  content_id: string; // Foreign key -> content.id
  tag_id: string; // Foreign key -> tags.id
  created_at: string;
}

/**
 * Relationship Types between Content Items
 * e.g., Study Material ↔ Companion Presentation ↔ Interactive Web App
 * or Research Paper ↔ Research Project ↔ Dataset ↔ Experiment
 */
export type RelationshipType =
  | 'related'
  | 'companion_presentation'
  | 'companion_study_material'
  | 'companion_interactive'
  | 'companion_dataset'
  | 'prerequisite'
  | 'part_of_series'
  | 'question_bank_for'
  | 'derivative_of'
  | (string & {});

/**
 * Directed / Bidirectional Content Relationship Entity
 * Corresponds to the PostgreSQL `content_relationships` table in Supabase.
 */
export interface ContentRelationship {
  id: string; // UUID primary key
  source_content_id: string; // Foreign key -> content.id
  target_content_id: string; // Foreign key -> content.id
  relationship_type: RelationshipType;
  created_at: string;
}

/**
 * Enriched Content Item with Joined Tags and Related Items
 */
export interface EnrichedContentItem extends ContentItem {
  tags?: Tag[];
  related_items?: {
    relationship_type: RelationshipType;
    content: ContentItem;
  }[];
}

// Re-export manifest types
export * from './manifest';
