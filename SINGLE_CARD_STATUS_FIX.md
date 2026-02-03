# Single Card Details Status Update Fix

## Problem Summary

The Single Card Details section in the Manage Employee Requests page was not properly updating status and print status when a card was sent for printing and the vendor completed the work. Specifically:

1. **Status not updating after vendor completion**: When vendor downloaded/completed a card, the UI didn't reflect the change immediately
2. **Cancel button not changing to Done**: The button remained stuck on "Cancel" instead of changing to "Done" after vendor completion
3. **Print status not updating**: The `print_status` wasn't being properly updated to reflect the vendor's completion

## Root Causes Identified

### 1. Missing Real-Time Refresh
- `ManageRequests.tsx` was only fetching data on initial mount
- No mechanism to refresh data when the vendor updates the status
- No periodic refresh or focus listener

### 2. Incomplete Status Update in VendorDashboard
- When vendor marked a card as complete in `VendorDashboard.tsx`, the `updateRequestStatus()` function didn't properly handle cards from the `card_details` table
- The function only properly updated `requests` table or batch-related cards
- Single card details from `card_details` table were not being updated

### 3. Missing Source Table Tracking
- `VendorDashboard` wasn't storing which table (requests vs card_details) a card came from
- This made it impossible to update the correct table when vendor completed the work

## Solutions Implemented

### 1. **Added Auto-Refresh Mechanisms** (`ManageRequests.tsx`)

```typescript
// Added window focus listener to refresh when user returns to tab
const handleWindowFocus = () => {
    fetchRequests();
};
window.addEventListener('focus', handleWindowFocus);

// Added periodic refresh every 20 seconds
const refreshInterval = setInterval(fetchRequests, 20000);

// Cleanup on unmount
return () => {
    window.removeEventListener('focus', handleWindowFocus);
    clearInterval(refreshInterval);
};
```

**Benefits:**
- Data refreshes automatically when user switches back to the tab
- Periodic refresh ensures data stays in sync even without focus
- Ensures latest status is always displayed

### 2. **Enhanced VendorDashboard Status Tracking** (`VendorDashboard.tsx`)

Added source table and ID tracking to vendor requests:

```typescript
card_details_id: vr.card_details_id,
request_id: vr.request_id,
source_table: vr.source_table || (vr.card_details_id ? 'card_details' : 'requests'),
```

**Benefits:**
- Clearly identifies which table each card came from
- Enables proper updates to correct tables

### 3. **Fixed updateRequestStatus Function** (`VendorDashboard.tsx`)

Enhanced the function to properly handle both requests and card_details:

```typescript
const updateRequestStatus = async (request: any) => {
    // 1. Update vendor_requests status
    const { error: updateError } = await supabase
        .from('vendor_requests')
        .update({ status: 'completed' })
        .eq('id', request.vendor_request_id);

    // 2. Determine which table to update
    let sourceTable = request.source_table || 'requests';
    let updateId = request.request_id;

    // If source_table indicates card_details, use card_details_id
    if (sourceTable === 'card_details' && request.card_details_id) {
        updateId = request.card_details_id;
    } else if (!updateId && request.card_details && request.card_details.id) {
        // Fallback: check if card_details is an object with id
        sourceTable = 'card_details';
        updateId = request.card_details.id;
    }

    // 3. Update the correct table
    if (!request.batch_id && updateId) {
        const { error: recordUpdateError } = await supabase
            .from(sourceTable)
            .update({ status: 'Printed', print_status: 'printed' })
            .eq('id', updateId);
    }
    // ... batch handling
};
```

**Benefits:**
- Correctly updates single cards from card_details table
- Maintains backward compatibility with requests table
- Proper fallback logic for edge cases

### 4. **Added Status Display Fix** (`ManageRequests.tsx`)

Enhanced status className function to properly display "Sent for Print" status:

```typescript
const getStatusClassName = (request: Request) => {
    const displayStatus = getDisplayStatus(request);
    switch (displayStatus) {
        case 'Sent for Print':
            return 'bg-blue-100 text-blue-800';  // Added
        case 'Printed':
            return 'bg-green-100 text-green-800';
        // ... other cases
    }
};
```

**Benefits:**
- Better visual indication of "Sent for Print" status
- Consistent color scheme across the UI

## Status Update Flow (Now Fixed)

### Before Vendor Action:
1. **Admin sends to vendor**
   - `status`: "Approved" → "Sent for Print"
   - `print_status`: "not_printed" → "sent_for_printing"
   - Button: Approve/Reject → **Cancel** ✓

### After Vendor Completes:
2. **Vendor downloads/completes**
   - Updates `vendor_requests` status to "completed"
   - Updates `card_details` (or `requests`) table:
     - `status`: "Sent for Print" → "Printed"
     - `print_status`: "sent_for_printing" → "printed"
   - Button: **Cancel** → **Done** ✓ (NOW WORKS)

### After Admin Marks as Done:
3. **Admin clicks Done button**
   - `print_status`: "printed" → "ready_to_collect"
   - Button: **Done** → **Ready to Collect** badge ✓

## Testing the Fix

1. **Send a single card to vendor:**
   - Go to Manage Requests → Single Card Details
   - Select a card and send to vendor
   - Verify status shows "Sent for Print" with Cancel button

2. **Vendor completes the card:**
   - Go to Vendor Dashboard
   - Download/complete the card
   - Vendor status should update to "completed"

3. **Verify status refresh in ManageRequests:**
   - Switch away from the tab and back
   - Status should update to "Printed" with "Done" button visible
   - If periodic refresh is active (20 seconds), wait and verify automatic refresh

4. **Click Done:**
   - Click the Done button
   - Status should update to "Ready to Collect"

## Files Modified

1. **`src/pages/ManageRequests.tsx`**
   - Added window focus listener and periodic refresh (20s interval)
   - Fixed `getStatusClassName` to handle "Sent for Print" status

2. **`src/pages/VendorDashboard.tsx`**
   - Enhanced vendor request mapping with source table tracking
   - Fixed `updateRequestStatus()` to properly update card_details
   - Added fallback logic for identifying update table

## Key Changes Summary

| Component | Change | Impact |
|-----------|--------|--------|
| ManageRequests | Added auto-refresh on focus + 20s interval | UI stays in sync |
| ManageRequests | Fixed status className | Better visual feedback |
| VendorDashboard | Added source_table tracking | Correct table updates |
| VendorDashboard | Enhanced updateRequestStatus | Single cards now update properly |

## Notes

- The fix maintains backward compatibility with the existing requests table
- Card batches continue to work as before
- The periodic 20-second refresh can be adjusted by changing the interval value
- Focus listener ensures instant refresh when user switches tabs
