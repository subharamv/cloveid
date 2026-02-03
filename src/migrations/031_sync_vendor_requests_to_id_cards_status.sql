-- Create trigger to sync vendor_requests status changes to id_cards print_status
-- When vendor_requests.status = 'completed', update id_cards.print_status = 'printed'

-- Create function to update id_cards print_status when vendor_requests status is completed
CREATE OR REPLACE FUNCTION sync_vendor_request_to_id_cards()
RETURNS TRIGGER AS $$
DECLARE
  v_status text;
BEGIN
  -- Normalize status to lowercase for comparison
  v_status := LOWER(COALESCE(NEW.status, ''));
  
  -- If vendor_requests status is being set to 'completed'
  IF v_status = 'completed' THEN
    -- Update the id_card's print_status to 'printed'
    IF NEW.id_card_id IS NOT NULL THEN
      UPDATE id_cards
      SET print_status = 'printed',
          status = 'completed',
          updated_at = NOW()
      WHERE id = NEW.id_card_id;
    END IF;

    -- Also update card_details print_status if source is card_details
    IF NEW.card_details_id IS NOT NULL THEN
      UPDATE card_details
      SET print_status = 'printed',
          status = 'completed',
          updated_at = NOW()
      WHERE id = NEW.card_details_id;
    END IF;

    -- Also update requests print_status if source is requests
    IF NEW.request_id IS NOT NULL THEN
      UPDATE requests
      SET print_status = 'printed',
          status = 'Printed'
      WHERE id = NEW.request_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_vendor_request_to_id_cards_trigger ON vendor_requests;

-- Create trigger on vendor_requests table - fires on both INSERT and UPDATE
CREATE TRIGGER sync_vendor_request_to_id_cards_trigger
AFTER INSERT OR UPDATE ON vendor_requests
FOR EACH ROW
EXECUTE FUNCTION sync_vendor_request_to_id_cards();
