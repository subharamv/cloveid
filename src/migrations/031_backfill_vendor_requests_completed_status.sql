-- Backfill script to sync existing vendor_requests completed status to id_cards print_status
-- Run this after applying the trigger migration

-- 1. Update id_cards that have completed vendor_requests
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

-- 2. Update card_details that have completed vendor_requests
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

-- 3. Update requests that have completed vendor_requests
UPDATE requests
SET print_status = 'printed',
    status = 'Printed'
WHERE id IN (
  SELECT vr.request_id 
  FROM vendor_requests vr
  WHERE vr.status = 'completed' 
    AND vr.request_id IS NOT NULL
);

-- Verify the updates
SELECT 'id_cards updated' as "Table", COUNT(*) as "Updated Records"
FROM id_cards 
WHERE print_status = 'printed' AND updated_at >= NOW() - INTERVAL '1 minute'
UNION ALL
SELECT 'card_details updated', COUNT(*)
FROM card_details 
WHERE print_status = 'printed' AND updated_at >= NOW() - INTERVAL '1 minute'
UNION ALL
SELECT 'requests updated', COUNT(*)
FROM requests 
WHERE print_status = 'printed' AND updated_at >= NOW() - INTERVAL '1 minute';
