-- Migration: 031_fix_batch_card_count_sync
-- Purpose: Fix batch card count synchronization when cards are from requests or card_details
-- This migration adds triggers to sync total_cards count from all card sources

-- 0. Ensure batch_id column exists on all tables that need it
DO $$
BEGIN
  -- Add batch_id to requests if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN batch_id text;
  END IF;

  -- Add batch_id to card_details if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'card_details' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE public.card_details ADD COLUMN batch_id text;
  END IF;

  -- Add batch_id to id_cards if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'id_cards' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE public.id_cards ADD COLUMN batch_id text;
  END IF;
END $$;

-- 1. Create function to recalculate batch total_cards from all sources (requests, card_details, id_cards)
CREATE OR REPLACE FUNCTION recalculate_batch_card_count()
RETURNS TRIGGER AS $$
DECLARE
  total_count INT;
  batch_id_val TEXT;
BEGIN
  -- Determine which batch_id to use based on table and operation
  IF TG_TABLE_NAME = 'requests' THEN
    batch_id_val := CASE WHEN TG_OP = 'DELETE' THEN OLD.batch_id ELSE NEW.batch_id END;
  ELSIF TG_TABLE_NAME = 'card_details' THEN
    batch_id_val := CASE WHEN TG_OP = 'DELETE' THEN OLD.batch_id ELSE NEW.batch_id END;
  ELSIF TG_TABLE_NAME = 'id_cards' THEN
    batch_id_val := CASE WHEN TG_OP = 'DELETE' THEN OLD.batch_id ELSE NEW.batch_id END;
  END IF;
  
  -- Only process if batch_id exists
  IF batch_id_val IS NOT NULL THEN
    -- Count cards from all three sources for this batch
    total_count := COALESCE((
      SELECT COUNT(*)
      FROM public.requests
      WHERE batch_id = batch_id_val
    ), 0) + COALESCE((
      SELECT COUNT(*)
      FROM public.card_details
      WHERE batch_id = batch_id_val
    ), 0) + COALESCE((
      SELECT COUNT(*)
      FROM public.id_cards
      WHERE batch_id = batch_id_val
    ), 0);
    
    -- Update the batch total_cards count
    UPDATE public.card_batches 
    SET total_cards = total_count, updated_at = NOW()
    WHERE batch_id = batch_id_val;
  END IF;
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- 2. Create triggers on requests table to update batch card count
DO $$
BEGIN
  -- Only create triggers if batch_id column exists on requests
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'batch_id'
  ) THEN
    DROP TRIGGER IF EXISTS sync_batch_count_on_requests_insert ON public.requests;
    CREATE TRIGGER sync_batch_count_on_requests_insert
    AFTER INSERT ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_batch_card_count();

    DROP TRIGGER IF EXISTS sync_batch_count_on_requests_delete ON public.requests;
    CREATE TRIGGER sync_batch_count_on_requests_delete
    AFTER DELETE ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_batch_card_count();

    DROP TRIGGER IF EXISTS sync_batch_count_on_requests_update ON public.requests;
    CREATE TRIGGER sync_batch_count_on_requests_update
    AFTER UPDATE ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_batch_card_count();
  END IF;
END $$;

-- 3. Create triggers on card_details table to update batch card count
DO $$
BEGIN
  -- Only create triggers if batch_id column exists on card_details
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'card_details' AND column_name = 'batch_id'
  ) THEN
    DROP TRIGGER IF EXISTS sync_batch_count_on_card_details_insert ON public.card_details;
    CREATE TRIGGER sync_batch_count_on_card_details_insert
    AFTER INSERT ON public.card_details
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_batch_card_count();

    DROP TRIGGER IF EXISTS sync_batch_count_on_card_details_delete ON public.card_details;
    CREATE TRIGGER sync_batch_count_on_card_details_delete
    AFTER DELETE ON public.card_details
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_batch_card_count();

    DROP TRIGGER IF EXISTS sync_batch_count_on_card_details_update ON public.card_details;
    CREATE TRIGGER sync_batch_count_on_card_details_update
    AFTER UPDATE ON public.card_details
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_batch_card_count();
  END IF;
END $$;

-- 4. Create function to update batch status based on ALL card sources
CREATE OR REPLACE FUNCTION check_batch_completion_all_sources()
RETURNS TRIGGER AS $$
DECLARE
  batch_id_val TEXT;
  total_count INT;
  ready_to_collect_count INT;
BEGIN
  -- Determine which batch_id to use based on table and operation
  IF TG_TABLE_NAME = 'requests' THEN
    batch_id_val := CASE WHEN TG_OP = 'DELETE' THEN OLD.batch_id ELSE NEW.batch_id END;
  ELSIF TG_TABLE_NAME = 'card_details' THEN
    batch_id_val := CASE WHEN TG_OP = 'DELETE' THEN OLD.batch_id ELSE NEW.batch_id END;
  ELSIF TG_TABLE_NAME = 'id_cards' THEN
    batch_id_val := CASE WHEN TG_OP = 'DELETE' THEN OLD.batch_id ELSE NEW.batch_id END;
  END IF;
  
  -- Only process if batch_id exists
  IF batch_id_val IS NOT NULL THEN
    -- Count total cards from all sources
    total_count := COALESCE((
      SELECT COUNT(*)
      FROM public.requests
      WHERE batch_id = batch_id_val
    ), 0) + COALESCE((
      SELECT COUNT(*)
      FROM public.card_details
      WHERE batch_id = batch_id_val
    ), 0) + COALESCE((
      SELECT COUNT(*)
      FROM public.id_cards
      WHERE batch_id = batch_id_val
    ), 0);
    
    -- Count cards that are ready_to_collect from all sources
    ready_to_collect_count := COALESCE((
      SELECT COUNT(*)
      FROM public.requests
      WHERE batch_id = batch_id_val
        AND print_status = 'ready_to_collect'::character varying
    ), 0) + COALESCE((
      SELECT COUNT(*)
      FROM public.card_details
      WHERE batch_id = batch_id_val
        AND print_status = 'ready_to_collect'::character varying
    ), 0) + COALESCE((
      SELECT COUNT(*)
      FROM public.id_cards
      WHERE batch_id = batch_id_val
        AND print_status = 'ready_to_collect'::character varying
    ), 0);
    
    -- If all cards are ready_to_collect, mark batch as completed
    IF total_count > 0 AND ready_to_collect_count = total_count THEN
      UPDATE public.card_batches 
      SET status = 'completed'::card_status_enum, 
          completed_at = NOW(),
          updated_at = NOW()
      WHERE batch_id = batch_id_val
        AND status != 'completed'::card_status_enum;
    END IF;
  END IF;
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers for batch completion check on all sources
DO $$
BEGIN
  -- Only create triggers if batch_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'batch_id'
  ) THEN
    DROP TRIGGER IF EXISTS check_batch_completion_on_requests ON public.requests;
    CREATE TRIGGER check_batch_completion_on_requests
    AFTER UPDATE ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION check_batch_completion_all_sources();
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'card_details' AND column_name = 'batch_id'
  ) THEN
    DROP TRIGGER IF EXISTS check_batch_completion_on_card_details ON public.card_details;
    CREATE TRIGGER check_batch_completion_on_card_details
    AFTER UPDATE ON public.card_details
    FOR EACH ROW
    EXECUTE FUNCTION check_batch_completion_all_sources();
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'id_cards' AND column_name = 'batch_id'
  ) THEN
    DROP TRIGGER IF EXISTS check_batch_completion_on_id_cards_all ON public.id_cards;
    CREATE TRIGGER check_batch_completion_on_id_cards_all
    AFTER UPDATE ON public.id_cards
    FOR EACH ROW
    EXECUTE FUNCTION check_batch_completion_all_sources();
  END IF;
END $$;

-- 6. Function to recalculate all existing batch card counts (run once to fix existing batches)
CREATE OR REPLACE FUNCTION repair_all_batch_card_counts()
RETURNS TABLE (batch_id TEXT, old_count INT, new_count INT) AS $$
DECLARE
  batch_rec RECORD;
  new_total INT;
  old_count_val INT;
BEGIN
  -- Iterate through all batches
  FOR batch_rec IN SELECT DISTINCT batch_id FROM public.card_batches LOOP
    -- Get old count
    SELECT total_cards INTO old_count_val FROM public.card_batches WHERE batch_id = batch_rec.batch_id;
    
    -- Count cards from all sources
    new_total := COALESCE((
      SELECT COUNT(*)
      FROM public.requests
      WHERE batch_id = batch_rec.batch_id
    ), 0) + COALESCE((
      SELECT COUNT(*)
      FROM public.card_details
      WHERE batch_id = batch_rec.batch_id
    ), 0) + COALESCE((
      SELECT COUNT(*)
      FROM public.id_cards
      WHERE batch_id = batch_rec.batch_id
    ), 0);
    
    -- Update batch
    UPDATE public.card_batches 
    SET total_cards = new_total, updated_at = NOW()
    WHERE batch_id = batch_rec.batch_id;
    
    -- Prepare output values and return
    batch_id := batch_rec.batch_id;
    old_count := COALESCE(old_count_val, 0);
    new_count := new_total;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Create view to show batch status with card counts
DROP VIEW IF EXISTS v_batch_status CASCADE;
CREATE VIEW v_batch_status AS
SELECT 
  cb.batch_id,
  cb.name,
  cb.status,
  cb.total_cards,
  cb.created_at,
  cb.updated_at,
  cb.completed_at,
  (
    SELECT COUNT(*)
    FROM public.requests r
    WHERE r.batch_id = cb.batch_id
  ) +
  (
    SELECT COUNT(*)
    FROM public.card_details cd
    WHERE cd.batch_id = cb.batch_id
  ) +
  (
    SELECT COUNT(*)
    FROM public.id_cards ic
    WHERE ic.batch_id = cb.batch_id
  ) AS actual_card_count,
  (
    SELECT COUNT(*)
    FROM public.requests r
    WHERE r.batch_id = cb.batch_id AND r.print_status = 'ready_to_collect'::character varying
  ) +
  (
    SELECT COUNT(*)
    FROM public.card_details cd
    WHERE cd.batch_id = cb.batch_id AND cd.print_status = 'ready_to_collect'::character varying
  ) +
  (
    SELECT COUNT(*)
    FROM public.id_cards ic
    WHERE ic.batch_id = cb.batch_id AND ic.print_status = 'ready_to_collect'::character varying
  ) AS ready_to_collect_count,
  (
    SELECT COUNT(*)
    FROM public.requests r
    WHERE r.batch_id = cb.batch_id AND r.print_status = 'sent_for_printing'::character varying
  ) +
  (
    SELECT COUNT(*)
    FROM public.card_details cd
    WHERE cd.batch_id = cb.batch_id AND cd.print_status = 'sent_for_printing'::character varying
  ) +
  (
    SELECT COUNT(*)
    FROM public.id_cards ic
    WHERE ic.batch_id = cb.batch_id AND ic.print_status = 'sent_for_printing'::character varying
  ) AS sent_for_printing_count
FROM public.card_batches cb;

-- Grant permissions
GRANT EXECUTE ON FUNCTION recalculate_batch_card_count() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_batch_completion_all_sources() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION repair_all_batch_card_counts() TO authenticated, anon;
