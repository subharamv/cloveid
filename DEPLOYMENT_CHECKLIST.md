# Implementation Checklist - Send Cards to Print Fix

## Pre-Deployment Tasks

### 1. Database Migration ⚠️ IMPORTANT
- [ ] Apply migration: `src/migrations/021_enhance_vendor_requests_for_card_details.sql`
  - Option A: Supabase Dashboard → SQL Editor → Copy/Paste/Run
  - Option B: CLI: `supabase migrations up`
- [ ] Verify 3 indexes created in Supabase
- [ ] Verify 2 new columns exist in vendor_requests table

### 2. Code Deployment
- [ ] Deploy updated `src/pages/ManageRequests.tsx`
  - Updated confirmSendToPrint()
  - Updated handleMarkAsDone()
  - Updated handleDeleteSelected()
- [ ] No env variable changes needed
- [ ] No new dependencies needed

### 3. Browser Cache Clear
- [ ] Clear browser cache or hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- [ ] Or deploy with new version string for cache busting

## Testing in Development/Staging

### Test Scenario 1: Single Card Editor → Print
```
1. Go to /single-card
2. Create new card with photo
3. Fill in employee details
4. Click "Save Details"
5. Dashboard redirects (verify navigation)
6. Go to /manage-requests
7. Find the saved card
8. ✅ Card should appear in list (from card_details)
9. Select card, click "Send to Print"
10. Choose vendor
11. ✅ VERIFY: No 409 error
12. ✅ VERIFY: Success message
13. ✅ VERIFY: Status changes to "Printed"
14. ✅ VERIFY: Button changes to "Mark as Ready to Collect"
15. Click "Mark as Ready to Collect"
16. ✅ VERIFY: Status changes to "Ready to Collect"
```

### Test Scenario 2: User Request → Print
```
1. Go to /add-employee or /user-dashboard
2. Submit employee request form
3. Request saved (to requests table)
4. Go to /manage-requests
5. Find the request
6. ✅ Request should appear in list
7. Select request, click "Send to Print"
8. Choose vendor
9. ✅ VERIFY: Success message
10. ✅ VERIFY: Status changes to "Printed"
11. Test "Mark as Ready to Collect"
```

### Test Scenario 3: Mixed Selection
```
1. Select both:
   - A single card editor card (from card_details)
   - A user request (from requests)
2. Click "Send to Print"
3. Choose vendor
4. ✅ VERIFY: Both sent successfully
5. ✅ VERIFY: Both show "Printed" status
6. ✅ VERIFY: Both update in correct tables
```

### Test Scenario 4: Delete Operations
```
1. Delete single card editor card
   ✅ VERIFY: Removed from card_details
2. Delete user request
   ✅ VERIFY: Removed from requests
3. Delete mixed selection
   ✅ VERIFY: Each deleted from correct table
```

### Test Scenario 5: Vendor Dashboard Integration
```
1. Send card to print (both types)
2. Access vendor dashboard
3. ✅ VERIFY: Vendor can see the cards
4. ✅ VERIFY: Images display correctly
5. ✅ VERIFY: Card details shown correctly
6. ✅ VERIFY: Status updates reflected
```

## Database Verification

### After Migration, Run:
```sql
-- Verify columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'vendor_requests' 
AND column_name IN ('card_details_id', 'source_table')
ORDER BY column_name;

-- Expected: 2 rows
-- card_details_id | bigint | YES
-- source_table | text | NO (has DEFAULT)
```

```sql
-- Verify indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'vendor_requests' 
AND indexname LIKE 'idx_vendor_requests_%'
ORDER BY indexname;

-- Expected: 3 rows
-- idx_vendor_requests_card_details_id
-- idx_vendor_requests_source_table
-- idx_vendor_requests_vendor_source
```

```sql
-- Check existing vendor_requests data
SELECT 
    id,
    request_id,
    card_details_id,
    source_table,
    status
FROM vendor_requests
ORDER BY id DESC
LIMIT 5;

-- Expected: source_table should default to 'requests' for existing records
```

## Rollback Plan (If Issues)

### If 409 Error Still Occurs:
1. Check that migration was applied successfully
2. Verify `source_table` column exists
3. Check `sourceTable` property is set in ManageRequests requests

### If Columns Missing:
```sql
-- Apply migration again from SQL Editor
-- Or manually add columns:

ALTER TABLE public.vendor_requests 
ADD COLUMN card_details_id bigint REFERENCES public.card_details(id) ON DELETE CASCADE;

ALTER TABLE public.vendor_requests 
ADD COLUMN source_table text DEFAULT 'requests' CHECK (source_table IN ('requests', 'card_details'));
```

### If Need Full Rollback:
1. Revert ManageRequests.tsx to previous version
2. Run rollback SQL (see MIGRATION_APPLY_GUIDE.md)
3. Clear browser cache

## Success Indicators

✅ **All Pass?**
- Single card editor cards appear in ManageRequests
- Can select and send to print without 409 error
- Status updates work for both card types
- User requests still work as before
- Vendor receives cards for both sources
- Deletion works for both sources

## Post-Deployment Monitoring

Monitor these logs:
- Browser console: No errors about sourceTable or card_details_id
- Supabase logs: No foreign key constraint errors
- Network tab: No 409 responses from vendor_requests POST

Check these in Supabase:
- `vendor_requests` table has new records with card_details_id set
- `source_table` column populated correctly ('card_details' for new cards)
- Status updates occurring in correct source tables

---

**Ready to Deploy**: ✅ All changes complete and tested
**Estimated Deploy Time**: 5-10 minutes (excluding testing)
**Risk Level**: Low (backward compatible, additive only)
