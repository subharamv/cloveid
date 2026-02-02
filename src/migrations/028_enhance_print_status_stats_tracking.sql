-- Migration: 028_enhance_print_status_stats_tracking
-- Purpose: Add comprehensive tracking for all print statuses including approved cards

-- Function to get comprehensive batch card statistics
CREATE OR REPLACE FUNCTION get_batch_card_stats()
RETURNS TABLE (
  stat_name text,
  count bigint
) AS $$
BEGIN
  -- Pending: Cards that are Approved/Pending but not yet printed
  RETURN QUERY
  SELECT 'Pending'::text as stat_name, COUNT(*)::bigint
  FROM public.requests
  WHERE (status = 'Approved' OR status = 'Pending')
    AND (print_status = 'not_printed'::character varying OR print_status IS NULL);
  
  -- Sent for Printing: Cards sent to vendor but not yet printed
  RETURN QUERY
  SELECT 'Sent for Printing'::text as stat_name, COUNT(*)::bigint
  FROM public.requests
  WHERE (status = 'Approved' OR status = 'Pending')
    AND print_status = 'sent_for_printing'::character varying;
  
  -- Printed: Cards completed by vendor
  RETURN QUERY
  SELECT 'Printed'::text as stat_name, COUNT(*)::bigint
  FROM public.requests
  WHERE (status = 'Approved' OR status = 'Printed')
    AND (print_status = 'completed'::character varying OR print_status = 'printed'::character varying);
  
  -- Ready to Collect: Cards ready for pickup
  RETURN QUERY
  SELECT 'Ready to Collect'::text as stat_name, COUNT(*)::bigint
  FROM public.requests
  WHERE (status = 'Approved' OR status = 'Printed')
    AND print_status = 'ready_to_collect'::character varying;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get count of approved cards (for approval tracking)
CREATE OR REPLACE FUNCTION get_approved_cards_count()
RETURNS bigint AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::bigint
    FROM public.requests
    WHERE status = 'Approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get count of cards ready to collect
CREATE OR REPLACE FUNCTION get_ready_to_collect_count()
RETURNS bigint AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::bigint
    FROM public.requests
    WHERE print_status = 'ready_to_collect'::character varying
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get count of printed cards
CREATE OR REPLACE FUNCTION get_printed_cards_count()
RETURNS bigint AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::bigint
    FROM public.requests
    WHERE print_status = 'completed'::character varying 
      OR print_status = 'printed'::character varying
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_batch_card_stats() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_approved_cards_count() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_ready_to_collect_count() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_printed_cards_count() TO authenticated, anon;

-- Create view for batch card stats
DROP VIEW IF EXISTS v_batch_card_stats CASCADE;
CREATE VIEW v_batch_card_stats AS
SELECT * FROM get_batch_card_stats();

GRANT SELECT ON v_batch_card_stats TO authenticated, anon;

-- Log migration
SELECT 'Enhanced batch card statistics tracking created' as migration_status;
