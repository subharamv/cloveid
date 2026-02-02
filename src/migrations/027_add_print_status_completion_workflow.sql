-- Migration: 027_add_print_status_completion_workflow
-- Purpose: Add helper functions for print status workflow transitions

-- Function to mark cards as ready for collection (after printing is completed)
CREATE OR REPLACE FUNCTION mark_cards_ready_for_collection(p_request_ids bigint[])
RETURNS TABLE (
  request_id bigint,
  old_status character varying,
  new_status character varying,
  updated_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.requests
  SET 
    print_status = 'ready_to_collect'::character varying,
    updated_at = NOW()
  WHERE id = ANY(p_request_ids) AND print_status = 'completed'::character varying
  RETURNING id, 'completed'::character varying, print_status, updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update single request print status
CREATE OR REPLACE FUNCTION update_request_print_status(
  p_request_id bigint,
  p_new_status character varying
)
RETURNS TABLE (
  request_id bigint,
  previous_status character varying,
  new_status character varying,
  success boolean
) AS $$
DECLARE
  v_old_status character varying;
BEGIN
  -- Get old status
  SELECT print_status INTO v_old_status
  FROM public.requests
  WHERE id = p_request_id;
  
  -- Update if record exists
  IF v_old_status IS NOT NULL THEN
    UPDATE public.requests
    SET 
      print_status = p_new_status,
      updated_at = NOW()
    WHERE id = p_request_id;
    
    RETURN QUERY SELECT p_request_id, v_old_status, p_new_status, true;
  ELSE
    RETURN QUERY SELECT p_request_id, NULL::character varying, NULL::character varying, false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk update request statuses from vendor_requests
CREATE OR REPLACE FUNCTION sync_vendor_request_status_batch(p_vendor_request_ids bigint[])
RETURNS TABLE (
  vendor_request_id bigint,
  request_id bigint,
  status_updated boolean,
  message text
) AS $$
DECLARE
  v_vendor_req RECORD;
  v_updated_count INTEGER;
BEGIN
  FOR v_vendor_req IN 
    SELECT id, request_id, status 
    FROM public.vendor_requests 
    WHERE id = ANY(p_vendor_request_ids)
  LOOP
    IF v_vendor_req.status = 'completed' AND v_vendor_req.request_id IS NOT NULL THEN
      UPDATE public.requests
      SET 
        print_status = 'completed'::character varying,
        status = 'Printed',
        updated_at = NOW()
      WHERE id = v_vendor_req.request_id;
      
      GET DIAGNOSTICS v_updated_count = ROW_COUNT;
      
      RETURN QUERY SELECT 
        v_vendor_req.id,
        v_vendor_req.request_id,
        v_updated_count > 0,
        CASE WHEN v_updated_count > 0 THEN 'Updated request to Printed' ELSE 'Request not found' END;
    ELSE
      RETURN QUERY SELECT 
        v_vendor_req.id,
        v_vendor_req.request_id,
        false,
        'Vendor request not completed';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_cards_ready_for_collection(bigint[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_request_print_status(bigint, character varying) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_vendor_request_status_batch(bigint[]) TO authenticated;

-- Log migration
SELECT 'Print status workflow functions created' as migration_status;
