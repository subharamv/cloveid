-- Migration: 032_fix_batch_statistics_view
-- Purpose: Create proper batch statistics functions that include all card sources
-- This ensures the dashboard correctly shows pending/collected/printed cards

-- 1. Create function to get unified batch statistics (all sources)
CREATE OR REPLACE FUNCTION get_batch_card_statistics()
RETURNS TABLE (
  pending_count bigint,
  sent_for_printing_count bigint,
  printed_count bigint,
  ready_to_collect_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((
      SELECT COUNT(*)
      FROM public.requests
      WHERE print_status IS NULL OR print_status = 'not_printed'::character varying
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.card_details
      WHERE print_status IS NULL OR print_status = 'not_printed'::character varying
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.id_cards
      WHERE print_status IS NULL OR print_status = 'not_printed'::character varying
    ), 0) AS pending_count,
    
    COALESCE((
      SELECT COUNT(*)
      FROM public.requests
      WHERE print_status = 'sent_for_printing'::character varying
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.card_details
      WHERE print_status = 'sent_for_printing'::character varying
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.id_cards
      WHERE print_status = 'sent_for_printing'::character varying
    ), 0) AS sent_for_printing_count,
    
    COALESCE((
      SELECT COUNT(*)
      FROM public.requests
      WHERE print_status = 'completed'::character varying OR print_status = 'printed'::character varying
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.card_details
      WHERE print_status = 'completed'::character varying OR print_status = 'printed'::character varying
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.id_cards
      WHERE print_status = 'completed'::character varying OR print_status = 'printed'::character varying
    ), 0) AS printed_count,
    
    COALESCE((
      SELECT COUNT(*)
      FROM public.requests
      WHERE print_status = 'ready_to_collect'::character varying
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.card_details
      WHERE print_status = 'ready_to_collect'::character varying
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.id_cards
      WHERE print_status = 'ready_to_collect'::character varying
    ), 0) AS ready_to_collect_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Create function to get batch statistics by batch_id
CREATE OR REPLACE FUNCTION get_batch_statistics_by_id(batch_id_param TEXT)
RETURNS TABLE (
  batch_id text,
  total_cards bigint,
  pending_count bigint,
  sent_for_printing_count bigint,
  printed_count bigint,
  ready_to_collect_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    batch_id_param,
    COALESCE((
      SELECT COUNT(*)
      FROM public.requests
      WHERE batch_id = batch_id_param
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.card_details
      WHERE batch_id = batch_id_param
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.id_cards
      WHERE batch_id = batch_id_param
    ), 0) AS total_cards,
    
    COALESCE((
      SELECT COUNT(*)
      FROM public.requests
      WHERE batch_id = batch_id_param AND (print_status IS NULL OR print_status = 'not_printed'::character varying)
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.card_details
      WHERE batch_id = batch_id_param AND (print_status IS NULL OR print_status = 'not_printed'::character varying)
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.id_cards
      WHERE batch_id = batch_id_param AND (print_status IS NULL OR print_status = 'not_printed'::character varying)
    ), 0) AS pending_count,
    
    COALESCE((
      SELECT COUNT(*)
      FROM public.requests
      WHERE batch_id = batch_id_param AND print_status = 'sent_for_printing'::character varying
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.card_details
      WHERE batch_id = batch_id_param AND print_status = 'sent_for_printing'::character varying
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.id_cards
      WHERE batch_id = batch_id_param AND print_status = 'sent_for_printing'::character varying
    ), 0) AS sent_for_printing_count,
    
    COALESCE((
      SELECT COUNT(*)
      FROM public.requests
      WHERE batch_id = batch_id_param AND (print_status = 'completed'::character varying OR print_status = 'printed'::character varying)
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.card_details
      WHERE batch_id = batch_id_param AND (print_status = 'completed'::character varying OR print_status = 'printed'::character varying)
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.id_cards
      WHERE batch_id = batch_id_param AND (print_status = 'completed'::character varying OR print_status = 'printed'::character varying)
    ), 0) AS printed_count,
    
    COALESCE((
      SELECT COUNT(*)
      FROM public.requests
      WHERE batch_id = batch_id_param AND print_status = 'ready_to_collect'::character varying
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.card_details
      WHERE batch_id = batch_id_param AND print_status = 'ready_to_collect'::character varying
    ), 0) +
    COALESCE((
      SELECT COUNT(*)
      FROM public.id_cards
      WHERE batch_id = batch_id_param AND print_status = 'ready_to_collect'::character varying
    ), 0) AS ready_to_collect_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Create view for all batch statistics
DROP VIEW IF EXISTS v_all_batch_statistics CASCADE;
CREATE VIEW v_all_batch_statistics AS
SELECT
  cb.batch_id,
  cb.name,
  cb.status,
  cb.created_at,
  cb.updated_at,
  (
    SELECT total_cards FROM get_batch_statistics_by_id(cb.batch_id)
  ) AS total_cards,
  (
    SELECT pending_count FROM get_batch_statistics_by_id(cb.batch_id)
  ) AS pending_count,
  (
    SELECT sent_for_printing_count FROM get_batch_statistics_by_id(cb.batch_id)
  ) AS sent_for_printing_count,
  (
    SELECT printed_count FROM get_batch_statistics_by_id(cb.batch_id)
  ) AS printed_count,
  (
    SELECT ready_to_collect_count FROM get_batch_statistics_by_id(cb.batch_id)
  ) AS ready_to_collect_count
FROM public.card_batches cb;

-- 4. Create function to check and fix inconsistent batches (batches with 0 cards but showing as pending)
CREATE OR REPLACE FUNCTION diagnose_batch_issues()
RETURNS TABLE (
  batch_id text,
  batch_status text,
  stored_total_cards int,
  actual_total_cards bigint,
  issue text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cb.batch_id,
    cb.status::text,
    cb.total_cards,
    (
      SELECT COUNT(*)
      FROM public.requests r
      WHERE r.batch_id = cb.batch_id
    )::bigint +
    (
      SELECT COUNT(*)
      FROM public.card_details cd
      WHERE cd.batch_id = cb.batch_id
    )::bigint +
    (
      SELECT COUNT(*)
      FROM public.id_cards ic
      WHERE ic.batch_id = cb.batch_id
    )::bigint AS actual_total_cards,
    CASE
      WHEN cb.total_cards = 0 AND (
        SELECT COUNT(*)
        FROM public.requests r
        WHERE r.batch_id = cb.batch_id
      )::bigint +
      (
        SELECT COUNT(*)
        FROM public.card_details cd
        WHERE cd.batch_id = cb.batch_id
      )::bigint +
      (
        SELECT COUNT(*)
        FROM public.id_cards ic
        WHERE ic.batch_id = cb.batch_id
      )::bigint > 0 THEN 'Card count mismatch - stored=0 but actual>0'
      WHEN cb.status = 'pending'::card_status_enum AND (
        SELECT COUNT(*)
        FROM public.requests r
        WHERE r.batch_id = cb.batch_id AND r.print_status = 'ready_to_collect'::character varying
      )::bigint +
      (
        SELECT COUNT(*)
        FROM public.card_details cd
        WHERE cd.batch_id = cb.batch_id AND cd.print_status = 'ready_to_collect'::character varying
      )::bigint +
      (
        SELECT COUNT(*)
        FROM public.id_cards ic
        WHERE ic.batch_id = cb.batch_id AND ic.print_status = 'ready_to_collect'::character varying
      )::bigint > 0 THEN 'Batch marked pending but has ready_to_collect cards'
      ELSE 'OK'
    END AS issue
  FROM public.card_batches cb
  WHERE cb.total_cards = 0 OR cb.status = 'pending'::card_status_enum;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION get_batch_card_statistics() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_batch_statistics_by_id(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION diagnose_batch_issues() TO authenticated, anon;
