-- Migration: 026_add_unified_stats_functions
-- Purpose: Create helper functions for dashboard statistics

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_request_stats() CASCADE;
DROP FUNCTION IF EXISTS get_batch_stats() CASCADE;
DROP FUNCTION IF EXISTS get_request_stats_by_status() CASCADE;
DROP FUNCTION IF EXISTS get_print_status_stats() CASCADE;

-- Function to get request status statistics
CREATE OR REPLACE FUNCTION get_request_stats()
RETURNS TABLE (
  status_type text,
  count bigint
) AS $$
BEGIN
  -- In Editing: Pending status with is_edited = false
  RETURN QUERY
  SELECT 'In Editing'::text as status_type, COUNT(*)::bigint
  FROM public.requests
  WHERE status = 'Pending' AND is_edited = false;
  
  -- Awaiting Approval: Pending status with is_edited = true
  RETURN QUERY
  SELECT 'Awaiting Approval'::text as status_type, COUNT(*)::bigint
  FROM public.requests
  WHERE status = 'Pending' AND is_edited = true;
  
  -- Approved: Approved status
  RETURN QUERY
  SELECT 'Approved'::text as status_type, COUNT(*)::bigint
  FROM public.requests
  WHERE status = 'Approved';
  
  -- Sent for Printing: Printed status (which means sent for printing)
  RETURN QUERY
  SELECT 'Sent for Printing'::text as status_type, COUNT(*)::bigint
  FROM public.requests
  WHERE status = 'Printed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get print status statistics (Batch Card Statistics)
CREATE OR REPLACE FUNCTION get_print_status_stats()
RETURNS TABLE (
  print_category text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'Pending'::text as print_category, COUNT(*)::bigint
  FROM public.requests
  WHERE print_status = 'not_printed'::character varying;
  
  RETURN QUERY
  SELECT 'Sent for Printing'::text as print_category, COUNT(*)::bigint
  FROM public.requests
  WHERE print_status = 'sent_for_printing'::character varying;
  
  RETURN QUERY
  SELECT 'Printed'::text as print_category, COUNT(*)::bigint
  FROM public.requests
  WHERE print_status = 'completed'::character varying;
  
  RETURN QUERY
  SELECT 'Ready to Collect'::text as print_category, COUNT(*)::bigint
  FROM public.requests
  WHERE print_status = 'ready_to_collect'::character varying;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unified dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  stat_group text,
  stat_key text,
  stat_value bigint
) AS $$
BEGIN
  -- Request Status Group
  RETURN QUERY
  SELECT 'request_status'::text as stat_group, 'pending'::text as stat_key, COUNT(*)::bigint
  FROM public.requests
  WHERE status = 'Pending' AND print_status != 'completed'::character varying;
  
  RETURN QUERY
  SELECT 'request_status'::text as stat_group, 'in_editing'::text as stat_key, COUNT(*)::bigint
  FROM public.requests
  WHERE is_edited = true AND print_status != 'completed'::character varying;
  
  RETURN QUERY
  SELECT 'request_status'::text as stat_group, 'awaiting_approval'::text as stat_key, COUNT(*)::bigint
  FROM public.requests
  WHERE status = 'Pending' AND is_edited = false AND print_status != 'completed'::character varying;
  
  RETURN QUERY
  SELECT 'request_status'::text as stat_group, 'approved'::text as stat_key, COUNT(*)::bigint
  FROM public.requests
  WHERE status = 'Approved' AND print_status != 'completed'::character varying;
  
  RETURN QUERY
  SELECT 'request_status'::text as stat_group, 'sent_for_printing'::text as stat_key, COUNT(*)::bigint
  FROM public.requests
  WHERE print_status = 'sent_for_printing'::character varying;
  
  -- Print Status Group (Batch Card Statistics)
  RETURN QUERY
  SELECT 'print_status'::text as stat_group, 'print_pending'::text as stat_key, COUNT(*)::bigint
  FROM public.requests
  WHERE print_status = 'not_printed'::character varying;
  
  RETURN QUERY
  SELECT 'print_status'::text as stat_group, 'print_sent'::text as stat_key, COUNT(*)::bigint
  FROM public.requests
  WHERE print_status = 'sent_for_printing'::character varying;
  
  RETURN QUERY
  SELECT 'print_status'::text as stat_group, 'print_completed'::text as stat_key, COUNT(*)::bigint
  FROM public.requests
  WHERE print_status = 'completed'::character varying;
  
  RETURN QUERY
  SELECT 'print_status'::text as stat_group, 'print_ready_to_collect'::text as stat_key, COUNT(*)::bigint
  FROM public.requests
  WHERE print_status = 'ready_to_collect'::character varying;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_request_stats() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_print_status_stats() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated, anon;

-- Create view for easy dashboard access
DROP VIEW IF EXISTS v_dashboard_stats CASCADE;
CREATE VIEW v_dashboard_stats AS
SELECT * FROM get_dashboard_stats();

GRANT SELECT ON v_dashboard_stats TO authenticated, anon;

-- Log migration
SELECT 'Unified stats functions and views created for dashboard' as migration_status;
