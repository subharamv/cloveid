# Unified Manage Requests - Implementation Summary

## Overview
Created a unified Manage Requests page that accepts and manages requests from:
1. **SingleCard Editor** (stored in `card_details` table)
2. **User Requests** via EmployeeForm (stored in `requests` table)

## Changes Made

### 1. Frontend Changes - ManageRequests.tsx

#### Updated Request Interface
```typescript
interface Request {
    id: number;
    name: string;
    employeeId: string;
    date: string;
    status: string;
    photo: string;
    photo_url?: string;
    bloodGroup: string;
    branch: string;
    emergencyContact: string;
    created_at: string;
    updated_at?: string;
    batch_id?: string;
    is_edited?: boolean;
    print_status?: string;
    type?: 'individual' | 'bulk';
    sourceTable?: 'requests' | 'card_details';  // ← NEW: tracks source table
}
```

#### Updated handleApprove Function
- Now checks `request.sourceTable` to determine which table to update
- Updates `card_details` table for SingleCard editor requests
- Updates `requests` table for user/bulk requests
- Added success/error toast notifications

#### Updated handleReject Function
- Same logic as handleApprove
- Properly updates the correct table based on source

#### fetchRequests Function
Already configured to:
- Fetch from both `requests` and `card_details` tables
- Map cards with `sourceTable: 'card_details'` property
- Map requests with `sourceTable: 'requests'` property

### 2. Database Changes (Optional)

Created migration file: `020_add_source_type_to_card_details.sql`

Adds to `card_details` table:
- `source_type` column (DEFAULT 'single_card_editor')
  - Values: 'single_card_editor', 'bulk_import', 'manual'
- `created_by` column (UUID reference to auth.users)
- Indexes for faster filtering and audit trails

**To apply migration:**
```sql
-- Copy the SQL from src/migrations/020_add_source_type_to_card_details.sql
-- Execute in Supabase SQL Editor
```

## How It Works

### Request Flow

#### From SingleCard Editor:
1. User edits photo in SingleCard page
2. Click "Save Details"
3. Data saved to `card_details` table with `sourceTable: 'card_details'`
4. In ManageRequests, click "Approve"
5. System detects source and updates `card_details` table

#### From EmployeeForm (User Requests):
1. User fills form and submits
2. Data saved to `requests` table
3. In ManageRequests, click "Approve"
4. System detects source and updates `requests` table

### Status Management
Both sources support same status transitions:
- Pending → Approved
- Pending → Rejected
- Approved → (print status tracking)

## Database Schema

### requests table
```sql
id | full_name | employee_id | status | photo_url | ... | batch_id | sourceTable: 'requests'
```

### card_details table
```sql
id | full_name | employee_id | status | photo_url | source_type | created_by | sourceTable: 'card_details'
```

## Testing Checklist

- [ ] Create card via SingleCard editor
- [ ] Navigate to Manage Requests
- [ ] View the card (should display with edited photo)
- [ ] Click Approve button
- [ ] Verify status changes to "Approved" in ManageRequests
- [ ] Refresh page - status persists
- [ ] Check Supabase `card_details` table for updated status

- [ ] Create user request via EmployeeForm
- [ ] Navigate to Manage Requests
- [ ] Click Approve button on user request
- [ ] Verify status changes to "Approved"
- [ ] Verify Supabase `requests` table shows updated status

## Files Modified
1. `src/pages/ManageRequests.tsx`
   - Request interface (added sourceTable)
   - handleApprove function (dynamic table selection)
   - handleReject function (dynamic table selection)

## Files Created
1. `src/migrations/020_add_source_type_to_card_details.sql`
   - Database schema enhancements (optional)

## No Breaking Changes
- Existing requests in `requests` table continue to work
- Existing cards in `card_details` table continue to work
- Both table schemas are backward compatible
- Frontend properly routes updates to correct tables
