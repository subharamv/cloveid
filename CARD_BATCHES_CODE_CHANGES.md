# Card Batches Implementation - Code Changes Detail

## Summary of Changes

This document provides detailed information about all code changes made to implement card batch management and automatic completion tracking.

---

## File 1: Database Migration

### Location
`src/migrations/030_create_card_batches_and_id_cards.sql`

### Status
✅ **CREATED** - New file

### Purpose
Defines the database schema for managing ID card batches with automatic status tracking.

### Contents

#### Tables Created (2)
1. **card_batches** - Master batch records
2. **id_cards** - Individual card records

#### Indexes Created (14)
- 4 indexes on card_batches
- 10 indexes on id_cards

#### Trigger Functions (3)
1. `update_batch_card_count()` - Auto-count cards in batch
2. `check_batch_completion()` - Auto-mark batch complete when all cards done
3. `update_updated_at_column()` - Auto-timestamp updates

#### RLS Policies (8)
- 4 policies on card_batches (SELECT, INSERT, UPDATE, DELETE)
- 4 policies on id_cards (SELECT, INSERT, UPDATE, DELETE)

### Key SQL Snippets

**Table: card_batches**
```sql
CREATE TABLE IF NOT EXISTS public.card_batches (
  id bigserial NOT NULL,
  batch_id text NOT NULL UNIQUE,
  name text NOT NULL,
  status public.card_status_enum NOT NULL DEFAULT 'pending'::card_status_enum,
  total_cards integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id),
  approved_by uuid NULL REFERENCES auth.users(id),
  approved_at timestamp with time zone NULL,
  sent_for_printing_at timestamp with time zone NULL,
  completed_at timestamp with time zone NULL,
  CONSTRAINT card_batches_batch_id_format CHECK (batch_id ~* '^B-[0-9]{5,}$'::text),
  CONSTRAINT card_batches_total_cards_check CHECK (total_cards >= 0),
  CONSTRAINT card_batches_pkey PRIMARY KEY (id),
  CONSTRAINT card_batches_batch_id_key UNIQUE (batch_id)
);
```

**Table: id_cards**
```sql
CREATE TABLE IF NOT EXISTS public.id_cards (
  id bigserial NOT NULL,
  employee_id bigint NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  batch_id text NULL REFERENCES card_batches(batch_id) ON DELETE CASCADE,
  card_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.card_status_enum NOT NULL DEFAULT 'pending'::card_status_enum,
  print_status character varying(50) NULL DEFAULT 'not_printed'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id),
  approved_by uuid NULL REFERENCES auth.users(id),
  approved_at timestamp with time zone NULL,
  notes text NULL,
  zip_url text NULL,
  photo_url text NULL,
  CONSTRAINT id_cards_pkey PRIMARY KEY (id),
  CONSTRAINT id_cards_card_data_check CHECK (jsonb_typeof(card_data) = 'object'::text)
);
```

**Trigger Function: check_batch_completion()**
```sql
CREATE OR REPLACE FUNCTION check_batch_completion()
RETURNS TRIGGER AS $$
DECLARE
  batch_status card_status_enum;
  completed_count INT;
  total_count INT;
BEGIN
  -- Check if all cards in the batch are marked as "completed"
  SELECT COUNT(*) INTO total_count FROM id_cards WHERE batch_id = NEW.batch_id;
  SELECT COUNT(*) INTO completed_count FROM id_cards 
  WHERE batch_id = NEW.batch_id AND status = 'completed'::card_status_enum;
  
  -- If all cards are completed and total > 0, update batch status to completed
  IF total_count > 0 AND completed_count = total_count THEN
    UPDATE card_batches 
    SET status = 'completed'::card_status_enum, 
        completed_at = NOW()
    WHERE batch_id = NEW.batch_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## File 2: Application Code Changes

### Location
`src/pages/ImportManagement.tsx`

### Status
✅ **MODIFIED** - 2 functions updated, 1 new function added

### Changes Overview

#### Change 1: New Function Added (Lines 69-108)

**Function Name:** `checkAndUpdateBatchStatus()`

**Location:** After `fetchVendors()` function

**Purpose:** Checks if all cards in a batch are printed and marks the batch as completed.

**Code:**
```typescript
const checkAndUpdateBatchStatus = async (batchIdToCheck: string) => {
    if (!batchIdToCheck) return;

    try {
        // Get all cards in this batch and check if all are completed
        const { data: cards, error: cardsError } = await supabase
            .from('id_cards')
            .select('id, status, print_status')
            .eq('batch_id', batchIdToCheck);

        if (cardsError) {
            console.error('Error fetching cards for batch status check:', cardsError);
            return;
        }

        if (!cards || cards.length === 0) {
            return;
        }

        // Check if all cards have print_status as 'printed' or 'ready_to_collect'
        const allCompleted = cards.every(card => 
            card.print_status === 'printed' || card.print_status === 'ready_to_collect'
        );

        if (allCompleted) {
            // Update batch status to 'completed'
            const { error: updateError } = await supabase
                .from('card_batches')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('batch_id', batchIdToCheck);

            if (updateError) {
                console.error('Error updating batch status:', updateError);
            } else {
                toast.success('Batch marked as completed!');
            }
        }
    } catch (error) {
        console.error('Error in checkAndUpdateBatchStatus:', error);
    }
};
```

**Parameters:**
- `batchIdToCheck: string` - The batch ID to check (e.g., "B-00001")

**Returns:** `Promise<void>`

**Error Handling:**
- Silently returns if batchIdToCheck is empty
- Logs errors to console
- Shows success toast on batch completion
- Continues operation if batch has no cards

---

#### Change 2: Updated handleDownload() Function (Line ~305)

**Location:** After ZIP file is downloaded

**Change Type:** Added 4 lines of code

**Added Code:**
```typescript
// Check if batch is now complete
if (batchId) {
    await checkAndUpdateBatchStatus(batchId);
}
```

**Before (Original):**
```typescript
link.click();
document.body.removeChild(link);
toast.success('Download started and status updated to printed!');
```

**After (Updated):**
```typescript
link.click();
document.body.removeChild(link);

// Check if batch is now complete
if (batchId) {
    await checkAndUpdateBatchStatus(batchId);
}

toast.success('Download started and status updated to printed!');
```

**Purpose:** Checks batch completion after a single card is downloaded and marked as printed.

**Flow:**
1. User clicks "Download" on a card row
2. Card's `print_status` updated to 'printed'
3. ZIP file downloaded to user's computer
4. **NEW:** `checkAndUpdateBatchStatus(batchId)` is called
5. If all cards in batch are printed → batch marked as 'completed'
6. Toast notification shown

---

#### Change 3: Updated handleDownloadSelected() Function (Line ~678)

**Location:** After bulk ZIP file is downloaded

**Change Type:** Added 5 lines of code

**Added Code:**
```typescript
// Check if batch is now complete
if (batchId) {
    await checkAndUpdateBatchStatus(batchId);
}
```

**Before (Original):**
```typescript
URL.revokeObjectURL(link.href);
toast.success('Download started and statuses updated to printed!');
```

**After (Updated):**
```typescript
URL.revokeObjectURL(link.href);

// Check if batch is now complete
if (batchId) {
    await checkAndUpdateBatchStatus(batchId);
}

toast.success('Download started and statuses updated to printed!');
```

**Purpose:** Checks batch completion after multiple cards are downloaded and marked as printed.

**Flow:**
1. User selects multiple card rows (checkboxes)
2. User clicks "Download Selected (X)"
3. All selected cards' `print_status` updated to 'printed'
4. Master ZIP file created and downloaded
5. **NEW:** `checkAndUpdateBatchStatus(batchId)` is called
6. If all cards in batch are printed → batch marked as 'completed'
7. Toast notification shown

---

## Existing Functions (No Changes Required)

The following existing functions already handle batch status updates correctly:

### Function: confirmSendToPrint() (Line ~960)
**Status:** ✓ Already handles batch updates
**What it does:**
- Sends selected cards to a vendor
- Updates each card's `status` to 'sent_for_printing'
- Updates batch `status` to 'sent_for_printing' when all cards sent
- **No changes needed**

### Function: handleMarkAsDone() (Line ~880)
**Status:** ✓ Already handles batch updates
**What it does:**
- Marks a card as ready to collect
- Updates card's `print_status` to 'ready_to_collect'
- Checks if ALL cards in batch are ready to collect
- If yes: Updates batch `status` to 'completed'
- **No changes needed**

---

## Data Flow Diagram

```
User Actions (ImportManagement.tsx)
    │
    ├─→ Download Single Card
    │   └─→ handleDownload()
    │       ├─ Update id_cards.print_status = 'printed'
    │       ├─ Download ZIP
    │       └─ [NEW] checkAndUpdateBatchStatus()
    │           └─ If all printed → card_batches.status = 'completed'
    │
    ├─→ Download Multiple Cards
    │   └─→ handleDownloadSelected()
    │       ├─ Update id_cards.print_status = 'printed' (bulk)
    │       ├─ Download Master ZIP
    │       └─ [NEW] checkAndUpdateBatchStatus()
    │           └─ If all printed → card_batches.status = 'completed'
    │
    ├─→ Mark as Ready to Collect
    │   └─→ handleMarkAsDone()
    │       ├─ Update id_cards.print_status = 'ready_to_collect'
    │       ├─ Check all ready
    │       └─ If yes → card_batches.status = 'completed'
    │
    └─→ Send to Print (Vendor)
        └─→ confirmSendToPrint()
            ├─ Update id_cards.status = 'sent_for_printing'
            ├─ Create vendor_requests records
            └─ If all sent → card_batches.status = 'sent_for_printing'

Database Layer (Supabase)
    │
    ├─→ trigger: check_batch_completion
    │   └─ Auto-mark batch complete when all cards = 'completed'
    │
    ├─→ trigger: update_batch_card_count
    │   └─ Auto-update total_cards count
    │
    └─→ trigger: update_updated_at_column
        └─ Auto-update timestamps
```

---

## State Management Changes

### New State Usage
No new state variables were added. The function uses existing state:
- `batchId` - Current batch identifier (already exists)
- `cardIds` - Mapping of row index to card ID (already exists)
- `cardPrintStatuses` - Mapping of row index to print status (already exists)

### No State Mutations
The `checkAndUpdateBatchStatus()` function:
- Does NOT modify React state
- Makes direct Supabase database updates
- Relies on database triggers for state consistency

---

## Error Handling Strategy

### In checkAndUpdateBatchStatus()
```typescript
try {
    // 1. Validate input
    if (!batchIdToCheck) return;
    
    // 2. Fetch data with error check
    if (cardsError) {
        console.error('Error fetching cards for batch status check:', cardsError);
        return;
    }
    
    // 3. Handle empty results
    if (!cards || cards.length === 0) {
        return;
    }
    
    // 4. Check completion status
    const allCompleted = cards.every(...);
    
    // 5. Update with error check
    if (updateError) {
        console.error('Error updating batch status:', updateError);
    } else {
        toast.success('Batch marked as completed!');
    }
} catch (error) {
    console.error('Error in checkAndUpdateBatchStatus:', error);
}
```

**Error Scenarios Handled:**
1. Invalid/empty batch ID → Silent return
2. Database fetch error → Logged, operation skipped
3. No cards in batch → Silent return
4. Update error → Logged, user not notified
5. Unexpected error → Caught and logged
6. Success → User notified with toast

---

## Testing Strategy

### Unit Test Cases

**Test 1: Single card completion**
```javascript
// Given: 1 card in batch, other 1 card
// When: Download card 1 (mark as printed)
// Then: Batch status = 'completed'
```

**Test 2: Partial completion**
```javascript
// Given: 3 cards in batch
// When: Download 2 cards (mark as printed)
// Then: Batch status = 'sent_for_printing' (not changed)
```

**Test 3: Full batch completion**
```javascript
// Given: 3 cards in batch
// When: Download all 3 cards
// Then: Batch status = 'completed'
```

**Test 4: Batch with no cards**
```javascript
// Given: Batch created but no cards
// When: Try to complete batch
// Then: Silent return (no error)
```

### Integration Test Cases

**Test 1: Download → Batch Complete → Email**
```javascript
// Full workflow from download to batch completion
// Verify: All statuses updated correctly
// Verify: Timestamps are accurate
// Verify: User notifications appear
```

**Test 2: Mixed statuses**
```javascript
// Given: Some cards 'printed', some 'ready_to_collect'
// When: Check batch completion
// Then: Batch marked complete (both statuses count as done)
```

---

## Performance Considerations

### Database Queries
- `checkAndUpdateBatchStatus()` makes 2 queries:
  1. SELECT - fetch cards from batch (should hit `idx_id_cards_batch_id`)
  2. UPDATE - update batch status (should hit `idx_card_batches_batch_id`)
- Both queries are indexed and should be fast

### Async/Await Pattern
- Function is async to allow database operations
- Called with await to ensure completion before proceeding
- Does not block UI (non-critical operation)

### Recommended Indexes (Already Defined)
```sql
CREATE INDEX idx_id_cards_batch_id ON id_cards USING btree (batch_id);
CREATE INDEX idx_card_batches_batch_id ON card_batches USING btree (batch_id);
```

---

## Security Considerations

### RLS Policies
Both tables have Row Level Security enabled:
```sql
-- card_batches policies
SELECT: Public (all users)
INSERT: Only by creator (auth.uid() = created_by)
UPDATE: By creator or approver
DELETE: Only by creator

-- id_cards policies
SELECT: Public (all users)
INSERT: Only by creator
UPDATE: By creator or approver
DELETE: Only by creator
```

### No Direct SQL Injection Risk
- Uses Supabase query builder (parameterized)
- No string concatenation for queries
- No eval() or dynamic code execution

### Audit Trail
- All operations tracked via created_by, created_at
- Update timestamps maintained automatically
- Completion tracked via completed_at timestamp

---

## Backward Compatibility

### Migration Compatibility
- Uses `CREATE TABLE IF NOT EXISTS`
- Can be re-run safely without errors
- Does not modify existing tables

### Code Compatibility
- New function doesn't depend on new state
- Checks for null batchId gracefully
- Silently skips if conditions not met
- No breaking changes to existing functions

### Data Compatibility
- Works with existing id_cards records
- Works with existing employees records
- Works with existing auth.users records

---

## Deployment Checklist

- [ ] Migration file reviewed and approved
- [ ] Migration tested in development database
- [ ] ImportManagement.tsx changes reviewed
- [ ] Code compiles without errors
- [ ] All TypeScript types are correct
- [ ] No console errors on page load
- [ ] Single card download works
- [ ] Bulk card download works
- [ ] Batch status updates correctly
- [ ] Toast notifications appear
- [ ] Database indexes are created
- [ ] RLS policies are active
- [ ] Triggers are firing
- [ ] Tests passing

---

## Related Documentation

- See `CARD_BATCHES_IMPLEMENTATION.md` for complete schema details
- See `CARD_BATCHES_QUICK_REFERENCE.md` for quick lookup
- See migration file `030_create_card_batches_and_id_cards.sql` for full SQL

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-02 | 1.0 | Initial implementation |
| | | - Created card_batches table |
| | | - Created id_cards table |
| | | - Added checkAndUpdateBatchStatus() function |
| | | - Updated handleDownload() |
| | | - Updated handleDownloadSelected() |
