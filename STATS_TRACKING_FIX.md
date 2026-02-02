# Fix: Dashboard Stats Tracking & ManageRequests Status Updates

## Issues Fixed

### 1. ✅ Missing Stats Trackers
**Problem**: Dashboard was not tracking:
- Approved cards
- Ready to Collect cards
- Printed cards count

**Solution**: 
- Enhanced `useDashboardStats` hook to properly calculate batch card statistics
- Added new migration `028_enhance_print_status_stats_tracking.sql` with dedicated functions:
  - `get_batch_card_stats()` - Returns all batch statistics
  - `get_approved_cards_count()` - Tracks approved cards
  - `get_ready_to_collect_count()` - Tracks ready to collect
  - `get_printed_cards_count()` - Tracks printed cards

### 2. ✅ Failed Mark as Ready to Collect Error
**Problem**: 400 error when marking card as ready to collect
```
Failed to load resource: the server responded with a status of 400
```

**Root Cause**: `.select()` without arguments in Supabase queries

**Solution**: Updated all Supabase update operations to use `.select('*')`
- Fixed in `handleMarkAsDone()`
- Fixed in `handleApprove()`  
- Fixed in `handleReject()`
- Fixed in `handleCancelPrint()`

### 3. ✅ Status Update Issues
**Problem**: Database updates failing silently

**Solution**:
- Added `.select('*')` to all update queries
- Added `.updated_at: new Date().toISOString()` to track when changes occur
- Added error checking for data.length > 0 instead of just checking truthiness

## Files Modified

### Database Migrations
1. **025_sync_vendor_completion_to_requests.sql** (existing)
   - Trigger syncs vendor completion to requests table

2. **026_add_unified_stats_functions.sql** (modified)
   - Updated `get_request_stats()` logic
   - Better status mapping

3. **027_add_print_status_completion_workflow.sql** (existing)
   - Helper functions for workflow

4. **028_enhance_print_status_stats_tracking.sql** (NEW)
   - `get_batch_card_stats()` - Comprehensive batch stats
   - `get_approved_cards_count()` - Count approved
   - `get_ready_to_collect_count()` - Count ready
   - `get_printed_cards_count()` - Count printed
   - `v_batch_card_stats` view

### Frontend Files

#### src/hooks/useDashboardStats.ts (MODIFIED)
**Changes**:
- Fixed batch card statistics calculation
- Now properly filters by status = 'Approved' or 'Printed'
- Counts all print statuses correctly:
  - Pending: cards not yet printed
  - Sent for Printing: cards with vendor
  - Printed: completed/printed cards
  - Ready to Collect: ready for pickup

#### src/pages/ManageRequests.tsx (MODIFIED)
**Changes in 4 functions**:

1. **handleApprove()**
   - Added `.select('*')` instead of `.select()`
   - Added `updated_at` timestamp
   - Added data length check

2. **handleReject()**
   - Added `.select('*')` instead of `.select()`
   - Added `updated_at` timestamp
   - Added data length check

3. **handleMarkAsDone()**
   - Added `.select('*')` instead of `.select()`
   - Added `updated_at` timestamp
   - Added data length check

4. **handleCancelPrint()**
   - Changed `print_status: null` to `print_status: 'not_printed'`
   - Added `.select('*')` instead of `.select()`
   - Added `updated_at` timestamp
   - Added data length check

## Stats Calculation Logic

### Request Status (Manage Requests Tab)
```
In Editing: 
  status = 'Pending' AND is_edited = false

Awaiting Approval:
  status = 'Pending' AND is_edited = true

Approved:
  status = 'Approved'

Sent for Printing:
  status = 'Printed'
```

### Batch Card Statistics (Dashboard)
```
Pending:
  (status = 'Approved' OR status = 'Printed')
  AND (print_status = 'not_printed' OR print_status IS NULL)

Sent for Printing:
  (status = 'Approved' OR status = 'Printed')
  AND print_status = 'sent_for_printing'

Printed:
  (status = 'Approved' OR status = 'Printed')
  AND (print_status = 'completed' OR print_status = 'printed')

Ready to Collect:
  (status = 'Approved' OR status = 'Printed')
  AND print_status = 'ready_to_collect'
```

## Testing Checklist

- [ ] Apply migration 028 to Supabase
- [ ] Click "Approve" button on a request → should update successfully
- [ ] Click "Mark as Ready to Collect" → should update successfully
- [ ] Check Dashboard → "Printed" count should show correctly
- [ ] Check Dashboard → "Ready to Collect" count should show correctly
- [ ] Vendor completes card → stats should update automatically
- [ ] Check ManageRequests page → status should show "Ready to Collect"
- [ ] No 400 errors in browser console
- [ ] No "Failed to mark card" toasts

## Database Verification Queries

### Check if updates are working:
```sql
-- View recent updates
SELECT id, status, print_status, updated_at 
FROM public.requests 
ORDER BY updated_at DESC 
LIMIT 10;

-- Get batch card stats
SELECT * FROM get_batch_card_stats();

-- Get approved cards count
SELECT get_approved_cards_count() as approved_count;

-- Get ready to collect count
SELECT get_ready_to_collect_count() as ready_count;

-- Get printed cards count
SELECT get_printed_cards_count() as printed_count;
```

## Error Resolution

### If you see 400 errors:
1. Check that all `.select()` calls have `'*'` argument
2. Verify `updated_at` field exists in table
3. Check RLS policies allow updates

### If stats are still 0:
1. Verify migration 028 was applied
2. Check that requests table has data with correct statuses
3. Run the verification queries above
4. Check browser console for JavaScript errors

## Deployment Steps

1. **Step 1**: Apply migration 028 in Supabase SQL Editor
   ```sql
   -- Copy contents of 028_enhance_print_status_stats_tracking.sql
   ```

2. **Step 2**: Deploy frontend changes
   - ManageRequests.tsx updates are automatic
   - useDashboardStats.ts updates are automatic

3. **Step 3**: Test in browser
   - Open DevTools → Network tab
   - Try approving a request
   - Check for successful response (no 400 errors)

4. **Step 4**: Verify stats display
   - Dashboard should show all stats > 0 if data exists
   - ManageRequests should show "Ready to Collect" status

## Performance Notes

- All update operations use indexed fields (id, status, print_status)
- Real-time subscriptions will auto-refresh stats
- No performance impact from these changes
- All queries use SECURITY DEFINER for consistent behavior
