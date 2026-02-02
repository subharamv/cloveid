# Fix: Unable to Mark Card as Ready to Collect

## Problem
When trying to mark a card (from `card_details` table) as ready to collect, the system fails with a 400 error:
```
Failed to mark card as ready to collect
AUTHZ CHECK Object - Failed to load resource
```

## Root Cause
The `card_details` table is missing the `print_status` column that the code is trying to update. The `handleMarkAsDone()` function in `ManageRequests.tsx` attempts to update `print_status` on both the `requests` and `card_details` tables, but `card_details` never had this column added.

## Solution
Two migrations have been created to add the missing `print_status` column:

### 1. Source migrations (src/migrations/)
**File:** `029_add_print_status_to_card_details.sql`

Adds to the src/migrations folder for project tracking.

### 2. Supabase migrations (supabase/migrations/)
**File:** `20260202000000_add_print_status_to_card_details.sql`

The actual migration that runs on Supabase to:
- Add `print_status` column to `card_details` table
- Set default value to `'not_printed'`
- Add check constraint for valid statuses
- Create index for performance

## Valid Print Statuses
- `not_printed` (default)
- `sent_for_printing`
- `completed`
- `printed`
- `ready_to_collect`

## What This Fixes
1. ✅ Marking single card requests as ready to collect
2. ✅ Cancelling print requests for cards
3. ✅ Updating print status for both `requests` and `card_details` tables uniformly
4. ✅ Proper status tracking for card_details originated requests

## How the Fix Works
The code already had logic to detect the source table:
```typescript
const tableName = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
```

Now both tables have the `print_status` column, so updates will succeed on both:
```typescript
const { data, error } = await supabase
    .from(tableName)
    .update({
        print_status: 'ready_to_collect',
        updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*');
```

## Schema Changes
### card_details Table
```sql
ALTER TABLE public.card_details
ADD COLUMN print_status CHARACTER VARYING DEFAULT 'not_printed';

ALTER TABLE public.card_details
ADD CONSTRAINT card_details_print_status_check 
CHECK (print_status IN ('not_printed', 'sent_for_printing', 'completed', 'printed', 'ready_to_collect'));

CREATE INDEX idx_card_details_print_status ON public.card_details USING BTREE (print_status);
```

## Testing
After applying the migration, test:
1. Create a single card via SingleCard Editor
2. Approve it
3. Send it for printing
4. Mark as ready to collect - should succeed without 400 error
5. Verify the card status updates in the database

## Related Code
- [ManageRequests.tsx](src/pages/ManageRequests.tsx#L673) - handleMarkAsDone function
- [ManageRequests.tsx](src/pages/ManageRequests.tsx#L698) - handleCancelPrint function
- Both functions now work with both `requests` and `card_details` tables
