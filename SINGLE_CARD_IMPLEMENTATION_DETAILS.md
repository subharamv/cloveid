# Implementation Details - Single Card Status Updates

## Problem Analysis

### Issue 1: Missing Real-Time Updates
**Location**: `ManageRequests.tsx` lines 93-96  
**Problem**: Data was only fetched on component mount  
**Solution**: Added window focus listener + 20-second periodic refresh

```typescript
// BEFORE: Only initial fetch
useEffect(() => {
    fetchRequests();
    fetchVendors();
}, []);

// AFTER: Initial fetch + auto-refresh
useEffect(() => {
    fetchRequests();
    fetchVendors();

    const handleWindowFocus = () => {
        fetchRequests();
    };
    window.addEventListener('focus', handleWindowFocus);

    const refreshInterval = setInterval(fetchRequests, 20000);

    return () => {
        window.removeEventListener('focus', handleWindowFocus);
        clearInterval(refreshInterval);
    };
}, []);
```

**Why this works:**
- User switches to vendor dashboard → Completes card
- Returns to manage requests tab → `focus` event fires → `fetchRequests()` called
- Status now shows as "Printed" with "Done" button visible

---

### Issue 2: Card Details Not Updated by Vendor
**Location**: `VendorDashboard.tsx` lines 238-268  
**Problem**: `updateRequestStatus()` didn't handle `card_details` table properly

**Root Cause**: The function only checked for `request.id && !request.batch_id` but card_details records have a different ID structure

**Solution**: 
1. Added source table tracking when mapping vendor requests
2. Enhanced updateRequestStatus to identify and update correct table

```typescript
// In fetchVendorRequests - Enhanced mapping
return {
    ...existing fields,
    card_details_id: vr.card_details_id,    // NEW
    request_id: vr.request_id,               // NEW
    source_table: vr.source_table || (vr.card_details_id ? 'card_details' : 'requests'),  // NEW
    card_details: details
};
```

```typescript
// In updateRequestStatus - Enhanced logic
let sourceTable = request.source_table || 'requests';
let updateId = request.request_id;

if (sourceTable === 'card_details' && request.card_details_id) {
    updateId = request.card_details_id;
} else if (!updateId && request.card_details && request.card_details.id) {
    sourceTable = 'card_details';
    updateId = request.card_details.id;
}

// Update correct table
if (!request.batch_id && updateId) {
    await supabase
        .from(sourceTable)
        .update({ status: 'Printed', print_status: 'printed' })
        .eq('id', updateId);
}
```

**Why this works:**
- `card_details_id` is explicitly passed through
- Fallback logic handles edge cases
- Correct table is always updated

---

### Issue 3: Status Display Issue
**Location**: `ManageRequests.tsx` lines 224-240  
**Problem**: "Sent for Print" status had no color styling (fell to default)

**Solution**: Added case for "Sent for Print" in getStatusClassName

```typescript
// BEFORE
switch (displayStatus) {
    case 'Approved':
        return 'bg-green-100 text-green-800';
    case 'Printed':           // Wrong color for "Sent for Print"
        return 'bg-blue-100 text-blue-800';
    // ...
}

// AFTER
switch (displayStatus) {
    case 'Approved':
        return 'bg-green-100 text-green-800';
    case 'Sent for Print':    // NEW - proper color
        return 'bg-blue-100 text-blue-800';
    case 'Printed':           // Changed to green for completion
        return 'bg-green-100 text-green-800';
    // ...
}
```

---

## Data Flow After Fixes

### Scenario: Single Card from card_details Table

**Step 1: Admin sends card to vendor**
```
UI Action: Select card + Click "Send to Print"
↓
ManageRequests.confirmSendToPrint()
↓
Creates vendor_requests record:
{
    vendor_id: "...",
    card_details_id: 1,        ← Key difference from requests
    request_id: null,
    source_table: "card_details",  ← Stored for identification
    card_details: {...},
    status: 'sent'
}
↓
Updates card_details table:
{
    id: 1,
    status: 'Sent for Print',
    print_status: 'sent_for_printing'
}
↓
UI Update: Status badge shows "Sent for Print" (blue) with "Cancel" button
```

**Step 2: Vendor downloads and completes**
```
Vendor Dashboard Action: Download card
↓
VendorDashboard.handleDownload()
↓
Calls updateRequestStatus(request)
↓
Request object contains:
{
    card_details_id: 1,
    source_table: 'card_details',
    card_details: {id: 1, ...}
}
↓
updateRequestStatus logic:
- sourceTable = 'card_details'
- updateId = 1
↓
Updates card_details table:
{
    id: 1,
    status: 'Printed',
    print_status: 'printed'
}
↓
Updates vendor_requests status to 'completed'
```

**Step 3: ManageRequests auto-refreshes**
```
Browser action: Return to ManageRequests tab
↓
Window 'focus' event fires
↓
fetchRequests() called
↓
Queries card_details table - gets updated status:
{
    status: 'Printed',
    print_status: 'printed'
}
↓
Rendered with condition:
request.status === "Printed" && request.print_status !== 'ready_to_collect'
↓
Shows: "Done" button ✓
```

**Step 4: Admin marks as ready to collect**
```
UI Action: Click "Done" button
↓
ManageRequests.handleMarkAsDone()
↓
Updates card_details:
{
    print_status: 'ready_to_collect'
}
↓
Condition now matches:
request.print_status === 'ready_to_collect'
↓
Shows: "Ready to Collect" badge ✓
```

---

## Testing Checklist

- [ ] Send single card from card_details to vendor
- [ ] Verify "Sent for Print" status shows with Cancel button
- [ ] Vendor downloads the card (completedAutomatically in dashboard)
- [ ] Switch away from ManageRequests tab
- [ ] Return to tab (within 20 seconds)
- [ ] Verify status auto-refreshes to "Printed" with Done button
- [ ] Click Done button
- [ ] Verify status updates to "Ready to Collect"
- [ ] Check browser console for any errors
- [ ] Verify Supabase card_details table has correct status values

---

## Performance Considerations

**Refresh Interval (20 seconds)**:
- Too frequent: Excessive server calls
- Too infrequent: Stale data for longer
- 20 seconds chosen as good balance

**Can be adjusted in ManageRequests.tsx line 105:**
```typescript
const refreshInterval = setInterval(fetchRequests, 20000);  // Change 20000 to desired ms
```

**Focus Listener**:
- Zero cost when tab not in focus
- Immediate refresh when user returns
- Best user experience for typical workflows

---

## Backward Compatibility

✓ Requests table still works (non-card_details records)  
✓ Batch cards continue to work  
✓ Vendor dashboard behavior unchanged  
✓ Existing data not affected  

---

## Related Files

- `src/pages/ManageRequests.tsx` - Main dashboard with refresh logic
- `src/pages/VendorDashboard.tsx` - Vendor completion handling
- Supabase tables: `card_details`, `requests`, `vendor_requests`
