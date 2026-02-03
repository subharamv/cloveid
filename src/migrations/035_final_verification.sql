-- Check remaining unsynced id_cards
SELECT ic.id, ic.print_status, ic.status, vr.id as vr_id, vr.status as vr_status, vr.id_card_id
FROM id_cards ic
LEFT JOIN vendor_requests vr ON ic.id = vr.id_card_id
WHERE vr.id IS NOT NULL AND vr.status = 'completed' AND ic.print_status != 'printed'
ORDER BY ic.id;

-- Count total completed vendor_requests with id_card_id
SELECT COUNT(*) as total_completed_with_id_card_id
FROM vendor_requests 
WHERE status = 'completed' AND id_card_id IS NOT NULL;

-- Count id_cards that are now printed
SELECT COUNT(*) as id_cards_printed
FROM id_cards
WHERE print_status = 'printed';

-- Show summary by print_status
SELECT print_status, COUNT(*) as count
FROM id_cards
GROUP BY print_status
ORDER BY print_status;
