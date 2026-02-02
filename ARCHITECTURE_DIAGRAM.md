# System Architecture - Send to Print Flow

## Before Fix ❌

```
SingleCard Editor
    ↓
card_details table
    ↓
ManageRequests
    ↓
Send to Print Clicked
    ↓
Try to create vendor_request with request_id
    ↓
❌ 409 CONFLICT ERROR
   "request_id is not in requests table"
    ↓
Card NOT sent to vendor
```

## After Fix ✅

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED SYSTEM FLOW                           │
└─────────────────────────────────────────────────────────────────┘

SOURCE 1: SingleCard Editor          SOURCE 2: User Request Form
    ↓                                     ↓
    ↓                                     ↓
    └──→ card_details table  ←──→  requests table
         ├─ sourceTable: 'card_details'  ├─ sourceTable: 'requests'
         └─ ...other fields...            └─ ...other fields...
    
    ↓                                     ↓
    └──────────────────────────────────────┘
              ManageRequests Page
         (Fetches from both tables)
              ↓
         [Card/Request listed]
              ↓
         User selects + "Send to Print"
              ↓
    ┌─────────────────────────────────┐
    │ System Checks sourceTable        │
    └─────────────────────────────────┘
       ↙                           ↖
       
sourceTable='card_details'    sourceTable='requests'
       ↓                           ↓
Creates vendor_request      Creates vendor_request
with card_details_id        with request_id
       ↓                           ↓
Updates card_details        Updates requests
table: status='Printed'      table: status='Printed'
       ↓                           ↓
       └───────────────────────────┘
              ↓
         Vendor Dashboard
      (Receives both types)
              ↓
         ✅ Card Ready for Print
```

## Database Schema Relationship Diagram

### Before Fix
```
requests table                vendor_requests table
┌──────────────┐             ┌──────────────────┐
│ id (PK)      │──FK──┬──→   │ request_id (FK)  │
│ full_name    │      │      │ vendor_id        │
│ photo_url    │      │      │ status           │
│ status       │      │      │ sent_at          │
└──────────────┘      │      └──────────────────┘
                      │
card_details table    │
┌──────────────┐      │
│ id           │──X─── (NO CONNECTION)
│ full_name    │
│ photo_url    │
│ status       │
└──────────────┘
```

### After Fix
```
requests table                vendor_requests table              card_details table
┌──────────────┐             ┌──────────────────────────┐        ┌──────────────┐
│ id (PK)      │──FK─┐──→   │ request_id (FK)  [NULL] ├──FK─→   │ id (PK)      │
│ full_name    │     │      │ card_details_id [NULL] ────FK──→  │ full_name    │
│ photo_url    │     │      │ vendor_id                │         │ photo_url    │
│ status       │     │      │ source_table: 'requests' │         │ status       │
└──────────────┘     │      │ ...other fields...      │         └──────────────┘
                     │      └──────────────────────────┘
                     │
                     └─────────────────────────────────── (Dual FK Support)
```

## Function Flow Diagrams

### confirmSendToPrint() - Send Cards to Vendor

```
confirmSendToPrint()
│
├─ For each selected request ID:
│  ├─ Get request from merged list
│  ├─ Render ID card front/back to canvas
│  ├─ Upload images to storage
│  │
│  └─ Determine source:
│     ├─ IF sourceTable === 'card_details'
│     │  └─ vendorRequestRecord.card_details_id = id
│     │     vendorRequestRecord.source_table = 'card_details'
│     │
│     └─ ELSE (sourceTable === 'requests' or default)
│        └─ vendorRequestRecord.request_id = id
│           vendorRequestRecord.source_table = 'requests'
│
├─ Insert all vendor_request records
│
└─ For each request:
   ├─ Get correct table (card_details or requests)
   └─ Update status = 'Printed'
      ✅ Success message
```

### handleMarkAsDone() - Mark Ready to Collect

```
handleMarkAsDone(id)
│
├─ Find request by ID
│
├─ Determine source table:
│  ├─ IF request.sourceTable === 'card_details'
│  │  └─ table = 'card_details'
│  │
│  └─ ELSE
│     └─ table = 'requests'
│
├─ UPDATE table
   SET print_status = 'ready_to_collect'
   WHERE id = id
│
└─ ✅ Success: Card marked ready
```

### handleDeleteSelected() - Delete Multiple Cards

```
handleDeleteSelected()
│
├─ Separate requests by source:
│  ├─ requestIds = requests from 'requests' table
│  └─ cardDetailsIds = requests from 'card_details' table
│
├─ Delete from requests table:
│  └─ DELETE FROM requests WHERE id IN (requestIds)
│
├─ Delete from card_details table:
│  └─ DELETE FROM card_details WHERE id IN (cardDetailsIds)
│
└─ ✅ All deleted successfully
```

## Data Flow Through Vendor System

```
┌──────────────────────────────────────────────────────────────┐
│                 USER SENDS CARD TO PRINT                      │
└──────────────────────────────────────────────────────────────┘

ManageRequests Component
│
├─ confirmSendToPrint()
│  ├─ Read sourceTable property
│  ├─ Render canvas images
│  └─ Create vendor_request record
│     ├─ request_id [FOR: 'requests' source]
│     ├─ card_details_id [FOR: 'card_details' source]
│     ├─ source_table [ALWAYS: track source]
│     ├─ front_image_url
│     ├─ back_image_url
│     ├─ card_details [JSONB backup]
│     └─ status = 'sent'
│
├─ Update source table:
│  ├─ requests.status = 'Printed'  [IF from requests]
│  └─ card_details.status = 'Printed'  [IF from card_details]
│
└─ Insert vendor_request record

                    ↓

Supabase vendor_requests Table
│
├─ Row created with:
│  ├─ request_id XOR card_details_id (only one set)
│  ├─ source_table = indicator
│  └─ All card images/details stored
│
└─ ✅ Vendor can now query this

                    ↓

Vendor Dashboard
│
├─ Query vendor_requests
├─ Read source_table field
├─ Fetch from appropriate source table
│  ├─ card_details.* [IF source_table = 'card_details']
│  └─ requests.* [IF source_table = 'requests']
│
└─ Display card for printing

                    ↓

Update print_status
│
├─ Vendor marks card as printed
├─ Updates print_status in source table:
│  ├─ card_details.print_status = 'ready_to_collect'
│  └─ requests.print_status = 'ready_to_collect'
│
└─ ✅ Status reflected everywhere
```

## Query Examples

### Query 1: Get Vendor's Pending Requests
```sql
-- Vendor wants all requests sent to them
SELECT 
    vr.id,
    vr.request_id,
    vr.card_details_id,
    vr.source_table,
    vr.card_details,  -- JSONB snapshot
    r.full_name,       -- FROM requests if source_table='requests'
    cd.full_name,      -- FROM card_details if source_table='card_details'
    vr.status
FROM vendor_requests vr
LEFT JOIN requests r ON vr.request_id = r.id
LEFT JOIN card_details cd ON vr.card_details_id = cd.id
WHERE vr.vendor_id = $1
  AND vr.status = 'sent'
ORDER BY vr.sent_at DESC;
```

### Query 2: Update Card Status (Vendor)
```sql
-- When vendor marks card ready to collect
UPDATE vendor_requests
SET status = 'ready_to_collect'
WHERE id = $1;

-- Then update source table accordingly
CASE 
  WHEN source_table = 'requests' THEN
    UPDATE requests SET print_status = 'ready_to_collect' WHERE id = request_id
  WHEN source_table = 'card_details' THEN
    UPDATE card_details SET print_status = 'ready_to_collect' WHERE id = card_details_id
END;
```

---

## Key Insight

The `source_table` column is the "router" that tells the system where to find and update each card's data. This enables a unified interface for both single cards and bulk requests.
