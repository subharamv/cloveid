-- Fix vendor_requests RLS policies to use get_user_role function
-- The previous policies used auth.jwt() ->> 'user_role' which doesn't exist
-- This migration replaces them with get_user_role() helper function

-- Drop existing policies
DROP POLICY IF EXISTS "Admins managers view all vendor requests" ON public.vendor_requests;
DROP POLICY IF EXISTS "Admins managers update all requests" ON public.vendor_requests;
DROP POLICY IF EXISTS "Admins managers insert vendor requests" ON public.vendor_requests;
DROP POLICY IF EXISTS "Admins delete vendor requests" ON public.vendor_requests;

-- Recreate SELECT policies
CREATE POLICY "Admins managers view all vendor requests" 
  ON public.vendor_requests 
  FOR SELECT 
  TO authenticated 
  USING (
    get_user_role(auth.uid()) IN ('admin', 'manager')
  );

-- Recreate UPDATE policies
CREATE POLICY "Admins managers update all requests" 
  ON public.vendor_requests 
  FOR UPDATE 
  TO authenticated 
  USING (
    get_user_role(auth.uid()) IN ('admin', 'manager')
  )
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'manager')
  );

-- Recreate INSERT policies
CREATE POLICY "Admins managers insert vendor requests" 
  ON public.vendor_requests 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'manager')
  );

-- Recreate DELETE policies
CREATE POLICY "Admins delete vendor requests" 
  ON public.vendor_requests 
  FOR DELETE 
  TO authenticated 
  USING (
    get_user_role(auth.uid()) = 'admin'
  );

-- Log migration
SELECT 'vendor_requests RLS policies updated to use get_user_role function' as migration_status;
