-- Migration: 013_add_delete_policies
-- Purpose: Add DELETE policies for requests and vendor_requests tables to allow Admins/Managers to delete records.

-- 1. Add DELETE policy for requests table
DROP POLICY IF EXISTS "Admins and managers can delete requests" ON public.requests;
CREATE POLICY "Admins and managers can delete requests" ON public.requests
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE 
            id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- 2. Add DELETE policy for vendor_requests table
-- We check if the table exists first because of potential naming variations in migrations
DO $$
BEGIN
    -- Handle vendor_requests (current name used in code)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendor_requests') THEN
        DROP POLICY IF EXISTS "Admins and managers can delete vendor_requests" ON public.vendor_requests;
        CREATE POLICY "Admins and managers can delete vendor_requests" ON public.vendor_requests
            FOR DELETE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles WHERE 
                    id = auth.uid() AND role IN ('admin', 'manager')
                )
            );
    END IF;

    -- Handle vendor_sends (alias used in some migrations)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendor_sends') THEN
        DROP POLICY IF EXISTS "Admins and managers can delete vendor_sends" ON public.vendor_sends;
        CREATE POLICY "Admins and managers can delete vendor_sends" ON public.vendor_sends
            FOR DELETE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles WHERE 
                    id = auth.uid() AND role IN ('admin', 'manager')
                )
            );
    END IF;
END $$;

-- 3. Record migration in schema_migrations table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
        INSERT INTO public.schema_migrations (version, name, executed_at) 
        VALUES ('013_add_delete_policies', 'Add DELETE policies for requests and vendor_requests', now())
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;
