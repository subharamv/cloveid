-- Direct update: sync all id_cards that have completed vendor_requests

-- Update all id_cards with print_status='sent_for_printing' to 'printed' 
-- if they have a completed vendor_request
UPDATE id_cards
SET print_status = 'printed',
    status = 'completed',
    updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT vr.id_card_id 
  FROM vendor_requests vr
  WHERE vr.status = 'completed' 
    AND vr.id_card_id IS NOT NULL
);

-- Verify the update
SELECT 'id_cards updated' as result, COUNT(*) as count
FROM id_cards 
WHERE print_status = 'printed' AND status = 'completed';

-- Show which id_cards are still not synced
SELECT ic.id, ic.print_status, ic.status, vr.id as vr_id, vr.status as vr_status
FROM id_cards ic
INNER JOIN vendor_requests vr ON ic.id = vr.id_card_id
WHERE ic.print_status != 'printed'
ORDER BY ic.id;
