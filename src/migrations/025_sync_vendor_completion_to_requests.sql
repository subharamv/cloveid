-- Create trigger to sync vendor_requests completion status to requests table
-- When a vendor marks a request as 'completed', update the requests table's print_status and status

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_vendor_completion_to_requests ON public.vendor_requests;
DROP FUNCTION IF EXISTS sync_vendor_completion_to_requests_fn();

-- Create function to sync vendor_requests status changes to requests table
CREATE OR REPLACE FUNCTION sync_vendor_completion_to_requests_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_rows_updated INTEGER;
BEGIN
  -- Only proceed if status is changing to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Case 1: Update request from vendor_requests.request_id
    IF NEW.request_id IS NOT NULL THEN
      UPDATE public.requests
      SET 
        print_status = 'completed'::character varying,
        status = 'Printed',
        updated_at = NOW()
      WHERE id = NEW.request_id;
      
      GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
      
      -- Log the update for debugging
      IF v_rows_updated > 0 THEN
        RAISE NOTICE 'Updated request % to Printed status', NEW.request_id;
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log any errors but don't fail the update
  RAISE WARNING 'Error in sync_vendor_completion_to_requests_fn: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on vendor_requests table
CREATE TRIGGER sync_vendor_completion_to_requests
AFTER UPDATE ON public.vendor_requests
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION sync_vendor_completion_to_requests_fn();

-- Grant execute permission to authenticated users if needed
GRANT EXECUTE ON FUNCTION sync_vendor_completion_to_requests_fn() TO authenticated, anon;

-- Log migration
SELECT 'Trigger created to sync vendor_requests completion to requests table' as migration_status;
