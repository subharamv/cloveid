-- =================================================================
-- BREAK RLS RECURSION - INTRODUCE A HELPER FUNCTION
--
-- This script introduces a helper function to safely get the user's role
-- and uses it in the RLS policies to break the recursive loop.
-- =================================================================

-- Create a function to get the user's role from their user ID
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID) 
RETURNS TEXT AS $$
DECLARE
    role_name TEXT;
BEGIN
    SELECT role INTO role_name FROM public.profiles WHERE id = user_id;
    RETURN role_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;

-- =================================================================
-- RECREATE RLS POLICIES USING THE HELPER FUNCTION
-- =================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can update all profiles" ON public.profiles;

-- SELECT policies
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Managers can view all profiles"
ON public.profiles FOR SELECT
USING (get_user_role(auth.uid()) = 'manager');

-- UPDATE policies
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Managers can update all profiles"
ON public.profiles FOR UPDATE
USING (get_user_role(auth.uid()) = 'manager');

-- =================================================================
-- MIGRATION METADATA
-- =================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
    ) THEN
        INSERT INTO public.schema_migrations (version, name, executed_at) 
        VALUES ('005_break_rls_recursion', 'Break RLS recursion with a helper function', now())
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

COMMENT ON SCHEMA public IS 'CLOVE ID Maker Database - RLS Policies Fixed with a helper function to break recursion';