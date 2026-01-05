-- Migration: 015_add_storage_policies
-- Purpose: Add RLS policies for the 'id-card-images' storage bucket to allow public viewing and authenticated management.

-- Enable RLS on storage.objects (usually enabled by default in Supabase)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Allow public access to 'id-card-images' bucket for viewing
-- This fixes the 401 error when trying to load images via public URL
DROP POLICY IF EXISTS "Public Access to ID Card Images" ON storage.objects;
CREATE POLICY "Public Access to ID Card Images" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'id-card-images');

-- 2. Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload ID Card Images" ON storage.objects;
CREATE POLICY "Authenticated users can upload ID Card Images" ON storage.objects
    FOR INSERT 
    TO authenticated
    WITH CHECK (bucket_id = 'id-card-images');

-- 3. Allow authenticated users to update their own uploads (or any in this bucket if they are admins)
-- For simplicity in this admin-heavy tool, we allow all authenticated users to manage the bucket
DROP POLICY IF EXISTS "Authenticated users can update ID Card Images" ON storage.objects;
CREATE POLICY "Authenticated users can update ID Card Images" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'id-card-images');

-- 4. Allow authenticated users to delete images
DROP POLICY IF EXISTS "Authenticated users can delete ID Card Images" ON storage.objects;
CREATE POLICY "Authenticated users can delete ID Card Images" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'id-card-images');

-- 5. Record migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
        INSERT INTO public.schema_migrations (version, name, executed_at) 
        VALUES ('015_add_storage_policies', 'Add RLS policies for id-card-images storage bucket', now())
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;
