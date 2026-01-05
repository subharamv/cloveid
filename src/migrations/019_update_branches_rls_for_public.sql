-- Migration: 019_update_branches_rls_for_public
-- Purpose: Allow unauthenticated (anon) users to view branches for the registration form.

-- 1. Update the SELECT policy to include anon users
DROP POLICY IF EXISTS "Branches are viewable by authenticated users" ON public.branches;
DROP POLICY IF EXISTS "Branches are viewable by everyone" ON public.branches;

CREATE POLICY "Branches are viewable by everyone" ON public.branches
    FOR SELECT
    USING (true);

-- 2. Ensure system_settings also allows public view for branding (logos)
-- This might already be set, but let's be sure
DROP POLICY IF EXISTS "System settings are viewable by everyone" ON public.system_settings;
CREATE POLICY "System settings are viewable by everyone" ON public.system_settings
    FOR SELECT
    USING (true);

-- Record migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
        INSERT INTO public.schema_migrations (version, name, executed_at) 
        VALUES ('019_update_branches_rls_for_public', 'Allow public access to branches and system_settings', now())
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;
