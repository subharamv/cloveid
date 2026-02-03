-- Verification query to check current sync status
SELECT 'Completed vendor_requests' as status, COUNT(*) as total
FROM vendor_requests 
WHERE status = 'completed';

SELECT 'id_cards still sent_for_printing' as status, COUNT(*) as total
FROM id_cards 
WHERE print_status = 'sent_for_printing';

SELECT 'id_cards now printed' as status, COUNT(*) as total
FROM id_cards 
WHERE print_status = 'printed';

SELECT 'requests still sent_for_printing' as status, COUNT(*) as total
FROM requests 
WHERE print_status = 'sent_for_printing';

SELECT 'requests now printed' as status, COUNT(*) as total
FROM requests 
WHERE print_status = 'printed';

-- Show mapping of vendor_requests to id_cards
SELECT vr.id as vr_id, vr.status as vr_status, vr.id_card_id, ic.id as ic_id, ic.print_status
FROM vendor_requests vr
LEFT JOIN id_cards ic ON vr.id_card_id = ic.id
WHERE vr.status = 'completed'
ORDER BY vr.id;

-- Show vendor_requests with request_id
SELECT vr.id, vr.request_id, r.id as r_id, r.print_status
FROM vendor_requests vr
LEFT JOIN requests r ON vr.request_id = r.id
WHERE vr.status = 'completed' AND vr.request_id IS NOT NULL
ORDER BY vr.id;
