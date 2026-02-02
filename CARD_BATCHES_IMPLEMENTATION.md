# Card Batches and ID Cards Implementation

## Overview
This implementation adds support for managing card batches with automatic status tracking when all cards in a batch are completed.

## Database Schema Changes

### New Tables Created

#### 1. **card_batches** Table
Manages batches of ID cards with status tracking.

**Columns:**
- `id` - Primary key (bigserial)
- `batch_id` - Unique batch identifier (format: B-[0-9]{5,})
- `name` - Batch name (text)
- `description` - Optional batch description (text)
- `status` - Batch status (enum: pending, in_editing, awaiting_approval, approved, sent_for_printing, completed, rejected)
- `total_cards` - Count of cards in batch (auto-updated via trigger)
- `created_at` - Timestamp when batch was created
- `updated_at` - Auto-updated timestamp
- `created_by` - User ID who created the batch (UUID)
- `approved_by` - User ID who approved the batch (UUID)
- `approved_at` - Approval timestamp
- `sent_for_printing_at` - When batch was sent to printing
- `completed_at` - When all cards in batch were completed

**Indexes:**
- `idx_card_batches_batch_id` - BTREE on batch_id (unique lookup)
- `idx_card_batches_status` - BTREE on status (filter by status)
- `idx_card_batches_created_by` - BTREE on created_by (owner lookup)
- `idx_card_batches_created_at` - BTREE on created_at (time-based queries)

**Constraints:**
- `card_batches_pkey` - Primary key
- `card_batches_batch_id_key` - Unique batch_id
- `card_batches_batch_id_format` - Validates format B-00001 or higher
- `card_batches_total_cards_check` - Ensures count >= 0
- Foreign keys to auth.users for created_by and approved_by

---

#### 2. **id_cards** Table
Stores individual ID card records linked to employees and batches.

**Columns:**
- `id` - Primary key (bigserial)
- `employee_id` - Foreign key to employees table
- `batch_id` - Foreign key to card_batches table (text, allows CASCADE delete)
- `card_data` - JSONB object storing card details
- `status` - Card status (enum: pending, in_editing, awaiting_approval, approved, sent_for_printing, completed, rejected)
- `print_status` - Print workflow status (not_printed, sent_for_printing, printed, ready_to_collect)
- `created_at` - Card creation timestamp
- `updated_at` - Auto-updated timestamp
- `created_by` - User ID who created card
- `approved_by` - User ID who approved card
- `approved_at` - Approval timestamp
- `notes` - Optional notes
- `zip_url` - URL to downloadable ZIP file
- `photo_url` - URL to card photo

**Indexes:**
- `idx_id_cards_created_at` - Filter by creation date
- `idx_id_cards_created_by` - Filter by creator
- `idx_id_cards_card_data` - GIN index for JSONB queries
- `idx_id_cards_employee_id` - Lookup by employee
- `idx_id_cards_status` - Filter by card status
- `idx_id_cards_batch_id` - Filter by batch
- `idx_id_cards_print_status` - Filter by print workflow status

**Constraints:**
- `id_cards_pkey` - Primary key
- `id_cards_card_data_check` - Validates card_data is a JSON object
- Foreign keys to auth.users, employees, and card_batches

---

## Triggers and Functions

### 1. `update_updated_at_column()`
Automatically updates the `updated_at` timestamp on row modifications.

**Applied to:**
- `card_batches` - `update_card_batches_updated_at` trigger (BEFORE UPDATE)
- `id_cards` - `update_id_cards_updated_at` trigger (BEFORE UPDATE)

---

### 2. `update_batch_card_count()`
Automatically maintains the `total_cards` count in card_batches when cards are inserted, updated, or deleted.

**Trigger:** `update_batch_card_count_trigger` (AFTER INSERT/DELETE/UPDATE on id_cards)

**Logic:**
- When a card is added: Increments total_cards count
- When a card is deleted: Decrements total_cards count
- When a card is updated: Recalculates count for that batch

---

### 3. `check_batch_completion()`
Automatically marks a batch as "completed" when all cards in the batch reach "completed" status.

**Trigger:** `check_batch_completion_trigger` (AFTER UPDATE on id_cards, only when status changes)

**Logic:**
```
IF all cards in batch have status = 'completed' THEN
  UPDATE card_batches SET status = 'completed', completed_at = NOW()
END IF
```

---

## Application Integration

### ImportManagement.tsx Updates

#### New Helper Function: `checkAndUpdateBatchStatus()`
Checks if all cards in a batch have been printed and marks the batch as completed.

**Location:** Added after `fetchVendors()` function

**Functionality:**
- Fetches all cards in the batch
- Checks if all cards have `print_status` of 'printed' or 'ready_to_collect'
- If all are completed, updates batch status to 'completed' with timestamp
- Shows success toast to user

**Used in:**
1. `handleDownload()` - After single card download marked as printed
2. `handleDownloadSelected()` - After bulk download marks cards as printed

#### Existing Batch Status Management
The following existing functions already handle batch status updates:

1. **`confirmSendToPrint()`** (line 960)
   - Updates individual cards to `sent_for_printing` status
   - Updates batch status to `sent_for_printing` when all cards sent

2. **`handleMarkAsDone()`** (line 880)
   - Marks card as `ready_to_collect`
   - Checks if all cards ready to collect
   - Updates batch status to `completed` when all done

---

## Workflow: Card Completion Process

### Step 1: Cards Download (Vendor/Admin)
```
Card Print Status: not_printed → printed
Card Status: pending → (triggered update)
Batch Status: (check if all completed)
```

### Step 2: Cards Ready for Collection
```
Card Print Status: printed → ready_to_collect
Card Status: (updated) → completed
Batch Status: pending/sent_for_printing → completed
```

### Step 3: Automatic Batch Completion
When all cards in a batch reach "completed" status:
- **Trigger:** Database trigger `check_batch_completion` fires
- **Action:** Batch status updated to "completed"
- **Timestamp:** `completed_at` field set to current time

When manually marking cards ready to collect:
- **Check:** If all cards have `print_status` = 'ready_to_collect'
- **Action:** Batch status updated to "completed"
- **UI:** Success notification shown to user

---

## Data Integrity & Row-Level Security

### RLS Policies Enabled
- `card_batches` - Full RLS enabled
- `id_cards` - Full RLS enabled

### RLS Rules
**For card_batches:**
- SELECT: Public (all authenticated users can view)
- INSERT: Only by creator (`auth.uid() = created_by`)
- UPDATE: By creator or approver
- DELETE: Only by creator

**For id_cards:**
- SELECT: Public (all authenticated users can view)
- INSERT: Only by creator (`auth.uid() = created_by`)
- UPDATE: By creator or approver
- DELETE: Only by creator

---

## Database Migration

### File Location
`src/migrations/030_create_card_batches_and_id_cards.sql`

### Execution Order
This migration should be run AFTER all existing migrations, as it depends on:
- `auth.users` table (Supabase auth)
- `employees` table (from earlier migration)
- `card_status_enum` (from migration 001)

### Migration Contains
1. card_batches table creation
2. id_cards table creation
3. All indexes (14 total)
4. Trigger function `update_batch_card_count()`
5. Trigger function `check_batch_completion()`
6. RLS policies for both tables

---

## Status Enums Reference

### card_status_enum Values
- `pending` - Initial state, waiting for first edit
- `in_editing` - Currently being edited
- `awaiting_approval` - Submitted for approval
- `approved` - Approved and ready to send
- `sent_for_printing` - Sent to vendor for printing
- `completed` - Fully completed by vendor
- `rejected` - Rejected by approver

### print_status Values (id_cards specific)
- `not_printed` - Default, waiting to be printed
- `sent_for_printing` - Sent to vendor
- `printed` - Downloaded/ready for collection
- `ready_to_collect` - Final state, ready for employee pickup

---

## Key Features

✅ **Automatic Batch Status Tracking**
- Batch status updates automatically when cards change
- No manual batch status updates needed

✅ **Card Count Maintenance**
- Total card count in batch automatically calculated
- Updates on card insert, update, or delete

✅ **Batch Completion Detection**
- Automatically detects when all cards are completed
- Records completion timestamp

✅ **Foreign Key Integrity**
- Cascade delete support (cards deleted when batch deleted)
- Referential integrity with employees table

✅ **Performance Optimized**
- Strategic indexes on frequently queried columns
- JSONB GIN index for card_data searches
- BTREE indexes for filtering and sorting

✅ **Audit Trail**
- created_at / updated_at timestamps
- created_by / approved_by tracking
- sent_for_printing_at and completed_at timestamps

---

## Usage Examples

### Query: Get all cards in a batch
```sql
SELECT ic.* FROM id_cards ic
WHERE ic.batch_id = 'B-00001'
ORDER BY ic.created_at DESC;
```

### Query: Find batches ready for completion
```sql
SELECT cb.* FROM card_batches cb
WHERE cb.status = 'sent_for_printing'
AND (SELECT COUNT(*) FROM id_cards WHERE batch_id = cb.batch_id AND print_status NOT IN ('printed', 'ready_to_collect')) = 0;
```

### Query: Get batch statistics
```sql
SELECT 
  cb.batch_id,
  cb.name,
  cb.total_cards,
  COUNT(ic.id) as card_count,
  COUNT(CASE WHEN ic.print_status = 'ready_to_collect' THEN 1 END) as ready_to_collect_count,
  cb.status,
  cb.completed_at
FROM card_batches cb
LEFT JOIN id_cards ic ON ic.batch_id = cb.batch_id
GROUP BY cb.batch_id, cb.name, cb.total_cards, cb.status, cb.completed_at;
```

---

## Testing Checklist

- [ ] Migration runs successfully without errors
- [ ] card_batches table created with all columns and constraints
- [ ] id_cards table created with all columns and constraints
- [ ] All indexes created successfully
- [ ] RLS policies enabled and working
- [ ] Single card download marks as printed and checks batch
- [ ] Bulk download marks all as printed and checks batch
- [ ] Manual "ready to collect" marks batch as completed
- [ ] All triggers fire correctly
- [ ] Batch count auto-updates when cards added/deleted
- [ ] Batch status auto-updates when all cards completed
- [ ] Batch ID format validation works (B-00001 format)

---

## Notes

1. **Backward Compatibility**: The migration uses `CREATE TABLE IF NOT EXISTS` to allow safe re-running
2. **Cascade Delete**: Deleting a batch will cascade delete all related id_cards
3. **Status Synchronization**: The `check_batch_completion` trigger ensures database consistency
4. **Performance**: Indexes are strategically placed to optimize common queries
5. **Audit Trail**: All operations are timestamped and attributed to users for compliance

---

## Related Files Modified

- **[src/pages/ImportManagement.tsx](src/pages/ImportManagement.tsx)**
  - Added `checkAndUpdateBatchStatus()` function (line 69-108)
  - Updated `handleDownload()` to call batch check (line ~305)
  - Updated `handleDownloadSelected()` to call batch check (line ~678)
  - Existing functions already handle batch status for "send to print" and "ready to collect"
