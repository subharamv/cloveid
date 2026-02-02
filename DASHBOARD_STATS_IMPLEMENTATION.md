# Dashboard Stats Implementation Summary

## Overview
Implemented a complete solution to fix dashboard statistics updates when vendors download/complete card printing. The solution includes database triggers, helper functions, and frontend hooks.

## Database Migrations

### Migration 025: `025_sync_vendor_completion_to_requests.sql`
- **Purpose**: Sync vendor request completion status to requests table
- **Key Features**:
  - Trigger fires when `vendor_requests.status` changes to `'completed'`
  - Updates corresponding `requests` table:
    - `print_status` → `'completed'`
    - `status` → `'Printed'`
    - `updated_at` → current timestamp
  - Uses `SECURITY DEFINER` to bypass RLS policies
  - Includes error handling and logging

### Migration 026: `026_add_unified_stats_functions.sql`
- **Purpose**: Create reusable stats calculation functions
- **Functions Created**:
  
  1. **`get_request_stats()`**
     - Returns request status counts
     - Categories:
       - In Editing: `status = 'Pending' AND is_edited = false`
       - Awaiting Approval: `status = 'Pending' AND is_edited = true`
       - Approved: `status = 'Approved'`
       - Sent for Printing: `status = 'Printed'`

  2. **`get_print_status_stats()`**
     - Returns batch card statistics
     - Categories:
       - Pending: `print_status = 'not_printed'`
       - Sent for Printing: `print_status = 'sent_for_printing'`
       - Printed: `print_status = 'completed'`
       - Ready to Collect: `print_status = 'ready_to_collect'`

  3. **`get_dashboard_stats()`**
     - Unified function returning all stats grouped by category
     - Returns: `stat_group`, `stat_key`, `stat_value`

  4. **`v_dashboard_stats` View**
     - Easy-to-query view for dashboard data

### Migration 027: `027_add_print_status_completion_workflow.sql`
- **Purpose**: Helper functions for print status workflow
- **Functions Created**:
  1. `mark_cards_ready_for_collection(bigint[])` - Bulk update to ready state
  2. `update_request_print_status(bigint, varchar)` - Single request update
  3. `sync_vendor_request_status_batch(bigint[])` - Batch sync from vendor_requests

## Frontend Implementation

### New Hook: `useDashboardStats.ts`
Location: `src/hooks/useDashboardStats.ts`

**Features**:
- Provides real-time stats calculations
- Auto-refreshes on any request table changes
- Implements Supabase real-time subscriptions
- Returns stats, batchCardStats, loading state, and refetch function
- Types: `DashboardStats`, `BatchCardStats`

**Usage**:
```typescript
const { stats, batchCardStats, loading, error, refetch } = useDashboardStats();
```

### Updated Component: `Dashboard.tsx`
- Integrated `useDashboardStats` hook
- Removed manual stats calculation
- Now uses hook for automatic stat updates
- Real-time data with subscription support

## Data Flow

### Vendor Completes Card:
```
1. Vendor updates vendor_requests.status to 'completed'
   ↓
2. Trigger fires: sync_vendor_completion_to_requests_fn()
   ↓
3. Updates requests table:
   - print_status = 'completed'
   - status = 'Printed'
   ↓
4. Real-time subscription detects change
   ↓
5. useDashboardStats refetches and updates frontend
   ↓
6. Dashboard displays updated stats
```

## Status Mappings

### Request Status (Manage Requests)
| Display Name | Database Condition |
|---|---|
| In Editing | `status = 'Pending' AND is_edited = false` |
| Awaiting Approval | `status = 'Pending' AND is_edited = true` |
| Approved | `status = 'Approved'` |
| Sent for Printing | `status = 'Printed'` |

### Print Status (Batch Card Statistics)
| Display Name | Database Field |
|---|---|
| Pending | `print_status = 'not_printed'` |
| Sent for Printing | `print_status = 'sent_for_printing'` |
| Printed | `print_status = 'completed'` |
| Ready to Collect | `print_status = 'ready_to_collect'` |

## Testing Checklist

- [ ] Apply migrations 025, 026, 027 to Supabase
- [ ] Create a test vendor request and mark as completed
- [ ] Verify requests table updates automatically
- [ ] Check Dashboard stats update in real-time
- [ ] Verify ManageRequests page displays correct status
- [ ] Test with multiple concurrent requests
- [ ] Check browser console for errors

## SQL Queries for Manual Testing

```sql
-- Check vendor_requests
SELECT id, request_id, status FROM public.vendor_requests 
ORDER BY created_at DESC LIMIT 10;

-- Check corresponding requests
SELECT id, status, print_status FROM public.requests 
WHERE id IN (SELECT request_id FROM public.vendor_requests) 
ORDER BY updated_at DESC;

-- Get dashboard stats
SELECT * FROM get_request_stats();
SELECT * FROM get_print_status_stats();
```

## Important Notes

1. **SECURITY DEFINER**: Trigger functions use `SECURITY DEFINER` to ensure they can update requests even when RLS policies would block direct updates
2. **Real-time Updates**: The `useDashboardStats` hook includes Supabase real-time subscriptions for automatic updates
3. **Backward Compatible**: Changes don't affect existing data or APIs
4. **Transaction Safety**: Trigger operations are atomic and safe
