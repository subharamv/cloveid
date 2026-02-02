# Card Batches Implementation - Quick Reference

## Files Changed

### 1. Migration File (NEW)
**Path:** `src/migrations/030_create_card_batches_and_id_cards.sql`

Creates two new tables with automatic batch completion logic:
- `card_batches` - Batch management and status tracking
- `id_cards` - Individual card records linked to batches
- Includes 2 trigger functions for automatic updates
- Includes RLS policies for data security

### 2. Application Code (MODIFIED)
**Path:** `src/pages/ImportManagement.tsx`

**Changes Made:**
1. Added `checkAndUpdateBatchStatus()` helper function (line 69)
   - Checks if all cards in batch are printed
   - Updates batch status to 'completed' when done
   - Shows toast notification

2. Updated `handleDownload()` function (line ~305)
   - Now calls `checkAndUpdateBatchStatus()` after marking card printed
   - Single card download workflow complete

3. Updated `handleDownloadSelected()` function (line ~678)
   - Now calls `checkAndUpdateBatchStatus()` after bulk download
   - Multiple card download workflow complete

4. Existing functions already handle batch updates:
   - `confirmSendToPrint()` - Marks batch as 'sent_for_printing'
   - `handleMarkAsDone()` - Marks batch as 'completed' when all ready

---

## How It Works: Batch Completion Flow

### Scenario 1: Single Card Download
```
1. User clicks Download on a card
2. Card marked as print_status='printed'
3. checkAndUpdateBatchStatus() called
4. If all cards in batch are printed → batch status='completed'
5. Toast: "Batch marked as completed!"
```

### Scenario 2: Bulk Download
```
1. User selects multiple cards and clicks "Download Selected"
2. All selected cards marked as print_status='printed'
3. Cards downloaded in bulk ZIP
4. checkAndUpdateBatchStatus() called
5. If all cards in batch are printed → batch status='completed'
```

### Scenario 3: Manual Marking as Ready
```
1. User clicks "Mark as Ready to Collect" on a card
2. Card marked as print_status='ready_to_collect', status='completed'
3. Check if all cards in batch have same status
4. If yes → batch status='completed'
5. Toast: "Card marked as ready to collect!"
```

### Scenario 4: Send to Print
```
1. User selects cards and clicks "Send to Print"
2. Selects vendor from modal
3. Cards marked as status='sent_for_printing'
4. Vendor requests created in database
5. Check if all cards sent for printing
6. If yes → batch status='sent_for_printing'
```

---

## Database Schema Quick View

### card_batches Table
```
┌─────────────────────┬──────────────────────┐
│ Column              │ Type                 │
├─────────────────────┼──────────────────────┤
│ id (PK)             │ bigserial            │
│ batch_id (UNIQUE)   │ text (B-00001...)    │
│ name                │ text                 │
│ description         │ text                 │
│ status              │ enum                 │
│ total_cards         │ integer (auto-calc)  │
│ created_at          │ timestamp            │
│ updated_at          │ timestamp (auto)     │
│ created_by (FK)     │ uuid → auth.users    │
│ approved_by (FK)    │ uuid → auth.users    │
│ approved_at         │ timestamp            │
│ sent_for_printing_at│ timestamp            │
│ completed_at        │ timestamp            │
└─────────────────────┴──────────────────────┘
```

### id_cards Table
```
┌─────────────────────┬──────────────────────┐
│ Column              │ Type                 │
├─────────────────────┼──────────────────────┤
│ id (PK)             │ bigserial            │
│ employee_id (FK)    │ bigint               │
│ batch_id (FK)       │ text                 │
│ card_data           │ jsonb                │
│ status              │ enum                 │
│ print_status        │ varchar(50)          │
│ created_at          │ timestamp            │
│ updated_at          │ timestamp (auto)     │
│ created_by (FK)     │ uuid → auth.users    │
│ approved_by (FK)    │ uuid → auth.users    │
│ approved_at         │ timestamp            │
│ notes               │ text                 │
│ zip_url             │ text (URL)           │
│ photo_url           │ text (URL)           │
└─────────────────────┴──────────────────────┘
```

---

## Automatic Triggers

### 1. update_batch_card_count()
**When:** After INSERT/DELETE/UPDATE on id_cards
**What:** Automatically counts cards and updates `card_batches.total_cards`
**Example:**
```
Insert card 1 → total_cards = 1
Insert card 2 → total_cards = 2
Delete card 1 → total_cards = 1
```

### 2. check_batch_completion()
**When:** After UPDATE on id_cards (when status changes)
**What:** Checks if ALL cards have status='completed', marks batch complete
**Example:**
```
Card 1 status changed to completed
Card 2 status = completed (already)
All cards completed! → Batch status = completed, completed_at = NOW()
```

### 3. update_updated_at_column()
**When:** Before UPDATE on any table
**What:** Automatically updates the `updated_at` timestamp
**Applied to:** card_batches, id_cards

---

## Status Values

### Batch Status (card_status_enum)
- `pending` - Waiting for cards
- `in_editing` - Cards being edited
- `awaiting_approval` - Awaiting approval
- `approved` - Ready to send to vendor
- `sent_for_printing` - Sent to vendor
- `completed` - **All cards completed** ✓
- `rejected` - Rejected by approver

### Card Print Status
- `not_printed` - Initial state
- `sent_for_printing` - Sent to vendor
- `printed` - Downloaded (ready for collection)
- `ready_to_collect` - Final state

---

## Key Functions in ImportManagement.tsx

### checkAndUpdateBatchStatus(batchIdToCheck: string)
```javascript
async function checkAndUpdateBatchStatus(batchId) {
  // 1. Get all cards in batch
  const cards = await supabase
    .from('id_cards')
    .select('id, status, print_status')
    .eq('batch_id', batchId);
  
  // 2. Check if ALL cards are printed/ready_to_collect
  const allCompleted = cards.every(c => 
    c.print_status === 'printed' || c.print_status === 'ready_to_collect'
  );
  
  // 3. If yes, mark batch as completed
  if (allCompleted) {
    await supabase
      .from('card_batches')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('batch_id', batchId);
    
    toast.success('Batch marked as completed!');
  }
}
```

---

## Testing Checklist

✅ **Database Level**
- [ ] Migration file exists at `src/migrations/030_create_card_batches_and_id_cards.sql`
- [ ] Tables can be created without errors
- [ ] Constraints enforce batch_id format (B-00001 or higher)
- [ ] Cascade delete works (delete batch → delete cards)
- [ ] RLS policies are active
- [ ] Triggers fire automatically

✅ **Application Level**
- [ ] Single card download marks as printed
- [ ] Single card download checks batch status
- [ ] Bulk download marks all as printed
- [ ] Bulk download checks batch status
- [ ] Mark as ready to collect updates batch
- [ ] Send to print updates batch status
- [ ] Toast notifications appear correctly
- [ ] Batch not completed if any cards pending

✅ **Data Consistency**
- [ ] Card count updates correctly
- [ ] Batch status matches actual card statuses
- [ ] Timestamps are accurate (created_at, updated_at, completed_at)
- [ ] User tracking works (created_by, approved_by)

---

## Deployment Steps

1. **Deploy Migration**
   ```
   Run: src/migrations/030_create_card_batches_and_id_cards.sql
   ```

2. **Deploy Code Changes**
   - Deploy updated `src/pages/ImportManagement.tsx`

3. **Verify**
   - Check tables exist in database
   - Test single card download
   - Test bulk card download
   - Verify batch status updates

4. **Monitor**
   - Check logs for any errors
   - Monitor batch completion workflow
   - Verify timestamps are set correctly

---

## Troubleshooting

### Problem: Batch not marked as completed
**Solution:**
1. Check if all cards have `print_status` = 'printed' or 'ready_to_collect'
2. Verify `checkAndUpdateBatchStatus()` is being called
3. Check database triggers are active
4. Look at browser console for errors

### Problem: total_cards not updating
**Solution:**
1. Verify `update_batch_card_count` trigger exists
2. Check if cards are actually being inserted
3. Run: `SELECT * FROM card_batches WHERE batch_id = 'B-xxxxx';`

### Problem: Cascade delete not working
**Solution:**
1. Verify foreign key constraint: `CONSTRAINT id_cards_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES card_batches (batch_id) ON DELETE CASCADE`
2. Check RLS policies aren't blocking deletes

---

## Future Enhancements

1. **Batch Analytics Dashboard**
   - Show completion percentage per batch
   - Track average completion time
   - Identify bottlenecks

2. **Notification System**
   - Email when batch completed
   - Notify approvers of pending batches
   - Send vendor reminders

3. **Batch Approval Workflow**
   - Add approval step before sending to print
   - Track approval timeline
   - Add rejection reasons

4. **Advanced Filtering**
   - Filter batches by status/date range
   - Search by batch name
   - Sort by completion date

5. **Export & Reporting**
   - Export batch completion reports
   - Track metrics over time
   - Generate completion certificates
