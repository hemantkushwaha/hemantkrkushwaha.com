-- ==============================================================================
-- Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
-- Step 3: Unified Content Database Foundation (PostgreSQL / Supabase)
-- 
-- Author: Hemant Kumar Kushwaha (Teacher · Researcher · Thinker · Writer)
-- Architecture: Single Unified Content Model across Academics, Research,
--               Philosophy, and Writings with Many-to-Many Tagging and
--               Flexible Content Relationships.
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. Primary Table: content
-- Unified storage for Academics, Research, Philosophy, and Writings
-- ==============================================================================
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  section TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  content_type TEXT NOT NULL,
  body TEXT,
  thumbnail_url TEXT,
  file_url TEXT,
  external_url TEXT,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'public',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Domain integrity constraints
  CONSTRAINT check_section_validity CHECK (
    section IN ('academics', 'research', 'philosophy', 'writings')
  ),
  CONSTRAINT check_status_validity CHECK (
    status IN ('draft', 'published', 'archived')
  ),
  CONSTRAINT check_visibility_validity CHECK (
    visibility IN ('public', 'registered', 'premium')
  )
);

-- Trigger for content.updated_at
DROP TRIGGER IF EXISTS trigger_content_updated_at ON content;
CREATE TRIGGER trigger_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for content performance & filtering
CREATE INDEX IF NOT EXISTS idx_content_slug ON content (slug);
CREATE INDEX IF NOT EXISTS idx_content_section_category ON content (section, category);
CREATE INDEX IF NOT EXISTS idx_content_status_visibility ON content (status, visibility);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON content (published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_content_content_type ON content (content_type);
CREATE INDEX IF NOT EXISTS idx_content_featured ON content (is_featured) WHERE is_featured = TRUE;

-- ==============================================================================
-- 4. Many-to-Many Tags: tags
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger for tags.updated_at
DROP TRIGGER IF EXISTS trigger_tags_updated_at ON tags;
CREATE TRIGGER trigger_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for tags
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags (slug);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name);

-- ==============================================================================
-- 5. Tag Junction Table: content_tags
-- Normalized many-to-many relationship
-- ==============================================================================
CREATE TABLE IF NOT EXISTS content_tags (
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (content_id, tag_id)
);

-- Indexes for content_tags
CREATE INDEX IF NOT EXISTS idx_content_tags_tag_id ON content_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_content_tags_content_id ON content_tags (content_id);

-- ==============================================================================
-- 6. Content Relationships: content_relationships
-- Connects related items across domains (e.g., Study Material ↔ Presentation ↔ Web App,
-- Research Paper ↔ Dataset ↔ Experiment)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS content_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  target_content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'related',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Disallow self-referential loops
  CONSTRAINT check_no_self_relationship CHECK (source_content_id <> target_content_id),
  -- Prevent redundant duplicate edges
  CONSTRAINT unique_content_relationship UNIQUE (source_content_id, target_content_id, relationship_type)
);

-- Indexes for content_relationships
CREATE INDEX IF NOT EXISTS idx_content_rel_source ON content_relationships (source_content_id);
CREATE INDEX IF NOT EXISTS idx_content_rel_target ON content_relationships (target_content_id);
CREATE INDEX IF NOT EXISTS idx_content_rel_type ON content_relationships (relationship_type);

-- ==============================================================================
-- 7. Row Level Security (RLS) Configuration
-- Protects draft, archived, and non-public content from unauthorized exposure
-- ==============================================================================

ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_relationships ENABLE ROW LEVEL SECURITY;

-- 7.1 content RLS Policies
-- Public can ONLY read published, publicly visible content
CREATE POLICY "Allow public read access for published content"
  ON content
  FOR SELECT
  USING (status = 'published' AND visibility = 'public');

-- Service role has full administrative access (server-side only)
CREATE POLICY "Allow full access for service_role on content"
  ON content
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7.2 tags RLS Policies
-- Public can view tags
CREATE POLICY "Allow public read access for tags"
  ON tags
  FOR SELECT
  USING (true);

-- Service role has full access on tags
CREATE POLICY "Allow full access for service_role on tags"
  ON tags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7.3 content_tags RLS Policies
-- Public can only see tags assigned to published public content
CREATE POLICY "Allow public read access for content_tags of published content"
  ON content_tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = content_tags.content_id
        AND content.status = 'published'
        AND content.visibility = 'public'
    )
  );

-- Service role has full access on content_tags
CREATE POLICY "Allow full access for service_role on content_tags"
  ON content_tags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7.4 content_relationships RLS Policies
-- Public can only see relationships where the source content is published and public
CREATE POLICY "Allow public read access for content_relationships of published content"
  ON content_relationships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = content_relationships.source_content_id
        AND content.status = 'published'
        AND content.visibility = 'public'
    )
  );

-- Service role has full access on content_relationships
CREATE POLICY "Allow full access for service_role on content_relationships"
  ON content_relationships
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
