-- Migration: 031_add_super_admin_rls_policies
-- Purpose: Add super_admin role to all existing admin RLS policies across all tables
-- super_admin has full access to all data, same as admin, without needing to use supabaseAdmin client

-- Step 1: Create the is_super_admin() helper function if it doesn't exist
-- This function uses SECURITY DEFINER to bypass RLS recursion when checking the role
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
EXCEPTION
  WHEN OTHERS THEN RETURN FALSE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- =====================================================================
-- profiles table
-- =====================================================================
-- Drop existing super_admin policies
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.profiles;

-- Create new super_admin policies that use SECURITY DEFINER function
CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Super admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_super_admin());

CREATE POLICY "Super admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.is_super_admin());

-- =====================================================================
-- requests table
-- =====================================================================
DROP POLICY IF EXISTS "Super admins can view all requests" ON public.requests;
DROP POLICY IF EXISTS "Super admins can update requests" ON public.requests;
DROP POLICY IF EXISTS "Super admins can delete requests" ON public.requests;

CREATE POLICY "Super admins can view all requests" ON public.requests
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Super admins can update requests" ON public.requests
  FOR UPDATE USING (public.is_super_admin());

CREATE POLICY "Super admins can delete requests" ON public.requests
  FOR DELETE USING (public.is_super_admin());

-- =====================================================================
-- issues table
-- =====================================================================
DROP POLICY IF EXISTS "Super admins can view all issues" ON public.issues;
DROP POLICY IF EXISTS "Super admins can update issues" ON public.issues;
DROP POLICY IF EXISTS "Super admins can delete issues" ON public.issues;

CREATE POLICY "Super admins can view all issues" ON public.issues
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Super admins can update issues" ON public.issues
  FOR UPDATE USING (public.is_super_admin());

CREATE POLICY "Super admins can delete issues" ON public.issues
  FOR DELETE USING (public.is_super_admin());

-- =====================================================================
-- vendors table
-- =====================================================================
DROP POLICY IF EXISTS "Super admins can view all vendors" ON public.vendors;
DROP POLICY IF EXISTS "Super admins can manage vendors" ON public.vendors;

CREATE POLICY "Super admins can view all vendors" ON public.vendors
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Super admins can manage vendors" ON public.vendors
  FOR ALL USING (public.is_super_admin());

-- =====================================================================
-- vendor_requests table
-- =====================================================================
DROP POLICY IF EXISTS "Super admins view all vendor requests" ON public.vendor_requests;
DROP POLICY IF EXISTS "Super admins update all vendor requests" ON public.vendor_requests;
DROP POLICY IF EXISTS "Super admins insert vendor requests" ON public.vendor_requests;
DROP POLICY IF EXISTS "Super admins delete vendor requests" ON public.vendor_requests;

CREATE POLICY "Super admins view all vendor requests" ON public.vendor_requests
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Super admins update all vendor requests" ON public.vendor_requests
  FOR UPDATE USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins insert vendor requests" ON public.vendor_requests
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins delete vendor requests" ON public.vendor_requests
  FOR DELETE USING (public.is_super_admin());

-- =====================================================================
-- vendor_sends table
-- =====================================================================
DROP POLICY IF EXISTS "Super admins can view all vendor sends" ON public.vendor_sends;
DROP POLICY IF EXISTS "Super admins can manage vendor sends" ON public.vendor_sends;

CREATE POLICY "Super admins can view all vendor sends" ON public.vendor_sends
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Super admins can manage vendor sends" ON public.vendor_sends
  FOR ALL USING (public.is_super_admin());

-- =====================================================================
-- branches table
-- =====================================================================
DROP POLICY IF EXISTS "Super admins can manage branches" ON public.branches;

CREATE POLICY "Super admins can manage branches" ON public.branches
  FOR ALL USING (public.is_super_admin());

-- =====================================================================
-- departments table
-- =====================================================================
DROP POLICY IF EXISTS "Super admins can manage departments" ON public.departments;

CREATE POLICY "Super admins can manage departments" ON public.departments
  FOR ALL USING (public.is_super_admin());

-- =====================================================================
-- card_batches table
-- =====================================================================
DROP POLICY IF EXISTS "Super admins can manage card batches" ON public.card_batches;

CREATE POLICY "Super admins can manage card batches" ON public.card_batches
  FOR ALL USING (public.is_super_admin());

-- =====================================================================
-- id_cards table
-- =====================================================================
DROP POLICY IF EXISTS "Super admins can manage id cards" ON public.id_cards;

CREATE POLICY "Super admins can manage id cards" ON public.id_cards
  FOR ALL USING (public.is_super_admin());

-- =====================================================================
-- card_details table
-- =====================================================================
DROP POLICY IF EXISTS "Super admins can manage card details" ON public.card_details;

CREATE POLICY "Super admins can manage card details" ON public.card_details
  FOR ALL USING (public.is_super_admin());

-- =====================================================================
-- system_settings table
-- =====================================================================
DROP POLICY IF EXISTS "Super admins can manage system settings" ON public.system_settings;

CREATE POLICY "Super admins can manage system settings" ON public.system_settings
  FOR ALL USING (public.is_super_admin());



-- Record migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
        INSERT INTO public.schema_migrations (version, name, executed_at) 
        VALUES ('031_add_super_admin_rls_policies', 'Add super_admin role to all RLS policies', now())
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;
