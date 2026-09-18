-- ==============================================================================
-- Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
-- Step 12: Supabase Storage Security Policies & Row Level Security (RLS)
-- 
-- Bucket: content-files
-- Status: PRIVATE (public: false)
-- 
-- Security Architecture:
-- 1. Storage objects in the 'content-files' bucket are strictly private.
-- 2. Direct public read/write access via Supabase public endpoints is disallowed.
-- 3. Access is mediated exclusively through the server-side application layer,
--    which generates time-limited signed URLs (via service_role) ONLY after
--    evaluating content publication status ('published') and visibility rules:
--    - 'public': Accessible to all visitors via temporary signed URL.
--    - 'registered': Requires valid authenticated user context.
--    - 'premium': Requires valid authenticated user with premium authorization.
--    - 'draft' / 'archived': Forbidden from public file generation.
-- ==============================================================================

-- 1. Ensure the 'content-files' bucket is private
UPDATE storage.buckets
SET public = false
WHERE id = 'content-files';

-- 2. Enable Row Level Security (RLS) on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Explicit Access Restriction Policies for 'content-files'
-- Note: With RLS enabled on storage.objects, any role without an explicit GRANT/POLICY
-- is denied access by default. The service_role automatically bypasses RLS in Supabase.
-- The policies below provide explicit, defensive rejection for public/anon/authenticated roles.

-- 3a. Deny direct public SELECT (read) access on 'content-files'
DROP POLICY IF EXISTS "Disallow direct public read on content-files" ON storage.objects;
CREATE POLICY "Disallow direct public read on content-files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id <> 'content-files');

-- 3b. Deny direct public INSERT (upload) access on 'content-files'
DROP POLICY IF EXISTS "Disallow direct public upload on content-files" ON storage.objects;
CREATE POLICY "Disallow direct public upload on content-files"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id <> 'content-files');

-- 3c. Deny direct public UPDATE access on 'content-files'
DROP POLICY IF EXISTS "Disallow direct public update on content-files" ON storage.objects;
CREATE POLICY "Disallow direct public update on content-files"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id <> 'content-files');

-- 3d. Deny direct public DELETE access on 'content-files'
DROP POLICY IF EXISTS "Disallow direct public delete on content-files" ON storage.objects;
CREATE POLICY "Disallow direct public delete on content-files"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id <> 'content-files');

-- ==============================================================================
-- Verification Query
-- Run this query to confirm RLS and bucket privacy status in Supabase SQL Editor:
-- 
-- SELECT id, name, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets
-- WHERE id = 'content-files';
-- ==============================================================================
