-- Comprehensive backfill to sync all completed vendor_requests to id_cards print_status
-- This handles all three scenarios: id_card_id, card_details_id, and request_id

-- 1. Update id_cards where vendor_requests has id_card_id (direct mapping)
UPDATE id_cards
SET print_status = 'printed',
    status = 'completed',
    updated_at = NOW()
WHERE id IN (
  SELECT vr.id_card_id 
  FROM vendor_requests vr
  WHERE vr.status = 'completed' 
    AND vr.id_card_id IS NOT NULL
);

-- 2. Update requests where vendor_requests has request_id
UPDATE requests
SET print_status = 'printed',
    status = 'Printed'
WHERE id IN (
  SELECT vr.request_id
  FROM vendor_requests vr
  WHERE vr.status = 'completed'
    AND vr.request_id IS NOT NULL
);

-- 3. Update card_details where vendor_requests has card_details_id
UPDATE card_details
SET print_status = 'printed',
    status = 'completed',
    updated_at = NOW()
WHERE id IN (
  SELECT vr.card_details_id
  FROM vendor_requests vr
  WHERE vr.status = 'completed'
    AND vr.card_details_id IS NOT NULL
);

-- Verify results
SELECT 'id_cards updated to printed' as check_name, COUNT(*) as count
FROM id_cards 
WHERE print_status = 'printed' AND status = 'completed';

SELECT 'requests updated to printed' as check_name, COUNT(*) as count
FROM requests 
WHERE print_status = 'printed' AND status = 'Printed';

SELECT 'card_details updated to printed' as check_name, COUNT(*) as count
FROM card_details 
WHERE print_status = 'printed' AND status = 'completed';
