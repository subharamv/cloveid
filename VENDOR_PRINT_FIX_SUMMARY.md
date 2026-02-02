# Fix: Send Single Card Editor Cards to Print

## Problem
Error when trying to send SingleCard editor cards to vendor for printing:
```
409 Conflict
Key (request_id)=(1) is not present in table "requests". 
insert or update on table "vendor_requests" violates... key constraint "vendor_requests_request_id_fkey"
```

**Root Cause**: 
- SingleCard editor cards are stored in `card_details` table, not `requests` table
- `vendor_requests` foreign key only referenced `requests` table
- System couldn't link single card editor cards to vendor requests

## Solution Implemented

### 1. Database Schema Enhancement (New Migration)
**File**: `src/migrations/021_enhance_vendor_requests_for_card_details.sql`

Added to `vendor_requests` table:
- `card_details_id` (bigint) - Reference to card_details table
- `source_table` (text) - Track whether request came from 'requests' or 'card_details'
- Indexes for performance on card_details_id and source_table

### 2. Frontend Logic Updates
**File**: `src/pages/ManageRequests.tsx`

#### Updated `confirmSendToPrint()` function:
- Detects if request is from `card_details` or `requests` table via `sourceTable` property
- Creates appropriate vendor_request record:
  - If from card_details → Sets `card_details_id` and `source_table: 'card_details'`
  - If from requests → Sets `request_id` and `source_table: 'requests'`
- Updates status in correct table:
  - `card_details` table for single card editor cards
  - `requests` table for user/bulk import cards

#### Updated `handleMarkAsDone()` function:
- Detects source table via `request.sourceTable`
- Updates `print_status` to 'ready_to_collect' in correct table
- Works for both single card and bulk cards

#### Updated `handleDeleteSelected()` function:
- Separates selected items by source table
- Deletes from both `requests` and `card_details` tables as needed
- Properly handles mixed selections

## How It Works Now

### Workflow: Single Card Editor → Send to Print

1. **User creates card** in SingleCard editor
2. **Card saved** to `card_details` table with `sourceTable: 'card_details'`
3. **User navigates** to ManageRequests page
4. **Card appears** in the unified list (fetched from both tables)
5. **User selects card** and clicks "Send to Print"
6. **System detects** source: `request.sourceTable === 'card_details'`
7. **Creates vendor_request record** with:
   - `card_details_id: <id>`
   - `source_table: 'card_details'`
   - `card_details: {...}` (JSONB snapshot of card data)
8. **Updates status** in `card_details` table to 'Printed'
9. **Vendor receives** card for printing via vendor dashboard
10. **After printing**, user can mark as "Ready to Collect"
11. **Status updates** in `card_details` table to `print_status: 'ready_to_collect'`

### Workflow: User Request → Send to Print

1. **User submits** request via EmployeeForm
2. **Request saved** to `requests` table
3. **In ManageRequests**, same flow as above
4. **System detects** source: `request.sourceTable === 'requests'` (or undefined, defaults to 'requests')
5. **Creates vendor_request record** with:
   - `request_id: <id>`
   - `source_table: 'requests'`
6. **Updates status** in `requests` table to 'Printed'
7. (Rest is same as above)

## Database Schema Updates

### `vendor_requests` table additions:
```sql
card_details_id BIGINT REFERENCES public.card_details(id) ON DELETE CASCADE
source_table TEXT DEFAULT 'requests' CHECK (source_table IN ('requests', 'card_details'))
```

### Indexes added:
```sql
idx_vendor_requests_card_details_id  -- For lookups by card_details_id
idx_vendor_requests_source_table     -- For filtering by source
idx_vendor_requests_vendor_source    -- For vendor dashboard queries
```

## Testing Checklist

### Test 1: Single Card Editor Card
- [ ] Create card in SingleCard editor
- [ ] Navigate to ManageRequests
- [ ] Select the card
- [ ] Click "Send to Print" → Choose vendor
- [ ] Verify card sent successfully (no 409 error)
- [ ] Verify status changed to "Printed"
- [ ] Click "Mark as Ready to Collect"
- [ ] Verify status changed to "Ready to Collect"

### Test 2: User Request Card
- [ ] Create request via EmployeeForm
- [ ] In ManageRequests, select the request
- [ ] Click "Send to Print" → Choose vendor
- [ ] Verify request sent successfully
- [ ] Verify status changed to "Printed"
- [ ] Test "Mark as Ready to Collect"

### Test 3: Mixed Selection
- [ ] Select both a single card editor card AND a user request card
- [ ] Click "Send to Print"
- [ ] Verify both are sent successfully
- [ ] Verify both show "Printed" status

### Test 4: Delete Operations
- [ ] Select single card editor cards
- [ ] Delete them
- [ ] Verify they're removed from card_details table
- [ ] Select user request cards
- [ ] Delete them
- [ ] Verify they're removed from requests table

## Files Modified

1. **src/pages/ManageRequests.tsx**
   - `confirmSendToPrint()` - Handle both sources when sending to print
   - `handleMarkAsDone()` - Handle both sources when marking ready
   - `handleDeleteSelected()` - Delete from both tables

2. **src/migrations/021_enhance_vendor_requests_for_card_details.sql** (NEW)
   - Add card_details_id column
   - Add source_table column
   - Create indexes

## No Breaking Changes

- Existing vendor_requests records work as before
- `request_id` remains required for existing requests
- `source_table` defaults to 'requests' for backward compatibility
- Foreign key on request_id still works (nullable for new cards from card_details)

## Vendor Dashboard Integration

Vendor dashboard can now query vendor_requests and:
- Get card data from `card_details` table if `source_table = 'card_details'`
- Get card data from `requests` table if `source_table = 'requests'`
- Or use pre-stored `card_details` JSONB column as fallback

---

**Status**: Ready to deploy ✅
**Impact**: Full functionality for both single card and bulk request workflows
