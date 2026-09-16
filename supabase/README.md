# Supabase Unified Content Database Foundation

Platform: **Hemant Kumar Kushwaha Knowledge Platform** (`hemantkrkushwaha.com`)  
Author: **Hemant Kumar Kushwaha** (Teacher · Researcher · Thinker · Writer)  
Database Engine: **PostgreSQL via Supabase**

---

## 1. Schema Overview

This schema unifies all 4 knowledge domains (**Academics**, **Research**, **Philosophy**, **Writings**) into a single, high-performance, normalized relational schema.

### Tables

1. **`content`**
   - **Fields**: `id`, `title`, `slug`, `description`, `section`, `category`, `subcategory`, `content_type`, `body`, `thumbnail_url`, `file_url`, `external_url`, `language`, `status`, `visibility`, `is_featured`, `published_at`, `created_at`, `updated_at`
   - **Constraints**:
     - `section`: restricted to `'academics'`, `'research'`, `'philosophy'`, `'writings'`
     - `status`: `'draft'`, `'published'`, `'archived'`
     - `visibility`: `'public'`, `'registered'`, `'premium'`
     - `slug`: unique URL-friendly slug
   - **Triggers**: automated `updated_at` timestamps on row modification.

2. **`tags`**
   - Normalized tag registry (`id`, `name`, `slug`, `created_at`, `updated_at`).
   - Unique constraints on `name` and `slug`.

3. **`content_tags`**
   - True many-to-many junction table (`content_id`, `tag_id`, `created_at`) with composite primary key and cascade deletions.

4. **`content_relationships`**
   - Flexible relationship model connecting related entities (e.g., *Study Material ↔ Companion Presentation ↔ Web App*, *Research Paper ↔ Project ↔ Dataset ↔ Experiment*).
   - `CONSTRAINT check_no_self_relationship` guarantees no self-referential loops.
   - `CONSTRAINT unique_content_relationship` enforces unique directional edges per relationship type.

---

## 2. Row Level Security (RLS)

- **RLS is strictly enabled** on all 4 tables (`content`, `tags`, `content_tags`, `content_relationships`).
- **Public Read Access**: Restricted strictly to items where `status = 'published'` AND `visibility = 'public'`. Drafts, archived items, and restricted materials are invisible to unauthenticated or public clients.
- **Service Role Access**: Full administrative permissions are granted only to the `service_role` on the server.

---

## 3. Applying the Schema to Supabase

1. Open your Supabase Project Dashboard at [supabase.com](https://supabase.com).
2. Navigate to **SQL Editor**.
3. Create a new query, paste the contents of `supabase/migrations/20260916000000_unified_content_schema.sql`, and execute ("Run").
4. Alternatively, if using the Supabase CLI:
   ```bash
   supabase db push
   ```

---

## 4. Required Environment Variables

When ready to connect your Supabase project, supply the following values:

```env
# CLIENT-SIDE (Public browser-safe configuration)
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<public-publishable-key>"

# SERVER-SIDE ONLY (Secret administrative key - NEVER expose to browser)
SUPABASE_SECRET_KEY="<secret-key>"
```
