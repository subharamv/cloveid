# Card Batches - Visual Implementation Guide

## 🎯 Implementation Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CARD BATCHES SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DATABASE LAYER                                                 │
│  ├─ card_batches (master batch records)                        │
│  ├─ id_cards (individual card records)                         │
│  ├─ Triggers (automatic status updates)                        │
│  └─ RLS Policies (data security)                               │
│                                                                 │
│  APPLICATION LAYER                                              │
│  ├─ ImportManagement.tsx                                        │
│  ├─ checkAndUpdateBatchStatus() function                       │
│  ├─ Updated handleDownload()                                   │
│  └─ Updated handleDownloadSelected()                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Table Relationships

```
                    auth.users
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    created_by    approved_by    approved_by
        │              │              │
        ▼              ▼              ▼
   card_batches                 id_cards
   ┌─────────────┐             ┌─────────────────┐
   │ batch_id    │─────────────▶│ batch_id (FK)   │
   │ name        │  1:N         │ card_data       │
   │ status      │              │ print_status    │
   │ total_cards │              └─────────────────┘
   │ created_at  │                      │
   │ completed_at│                      │
   └─────────────┘                      │
                                        │
                                    created_by
                                        │
                                        ▼
                                   employees
```

---

## 🔄 Card Completion Workflow

```
START: User Interface
│
├─ Download Single Card
│  └─► handleDownload()
│      ├─ Save print_status = 'printed'
│      ├─ Download ZIP
│      └─ Call checkAndUpdateBatchStatus()
│          ├─ Query: Count cards where print_status ≠ 'printed'
│          ├─ If all printed:
│          │  └─ Update batch status = 'completed'
│          │     └─ Show: "Batch marked as completed!"
│          └─ If some pending:
│             └─ Exit silently
│
├─ Download Multiple Cards
│  └─► handleDownloadSelected()
│      ├─ Save print_status = 'printed' (bulk)
│      ├─ Create master ZIP
│      ├─ Download ZIP
│      └─ Call checkAndUpdateBatchStatus()
│          └─ [Same logic as above]
│
├─ Mark as Ready to Collect
│  └─► handleMarkAsDone()
│      ├─ Save print_status = 'ready_to_collect'
│      ├─ Save status = 'completed'
│      └─ Check if all ready:
│          ├─ If yes: Update batch status = 'completed'
│          └─ If no: Exit
│
└─ Send to Print (Vendor)
   └─► confirmSendToPrint()
       ├─ Save status = 'sent_for_printing' (bulk)
       ├─ Create vendor_requests
       └─ Check if all sent:
           ├─ If yes: Update batch status = 'sent_for_printing'
           └─ If no: Exit

DATABASE: Automatic Triggers
│
├─ check_batch_completion trigger
│  └─ Monitors: UPDATE on id_cards.status
│     └─ If ALL cards = 'completed':
│        └─ Auto-update batch status = 'completed'
│
├─ update_batch_card_count trigger
│  └─ Monitors: INSERT/UPDATE/DELETE on id_cards
│     └─ Auto-count cards and update total_cards
│
└─ update_updated_at_column trigger
   └─ Monitors: UPDATE on any table
      └─ Auto-timestamp the row

END: Database Consistency
```

---

## 📈 Status State Machine

```
                    BATCH STATUS FLOW
                    
Created/Pending     In Editing        Awaiting          Approved
  (pending)    ──▶  (in_editing)  ──▶  Approval    ──▶  (approved)
      │                                (awaiting_                │
      │                                 approval)                │
      │                                                          ▼
      │                                              Sent for Printing
      │                                              (sent_for_printing)
      │                                                          │
      ▼──────────────────────────────────────────────────────────▼
      
                    COMPLETED ◀───────────────────────────
                   (completed)
                    
   Rejected
  (rejected)  ◀─ ─ ─ ─ ─ ─ ─ (from any state)


CARD PRINT STATUS FLOW

not_printed ──▶ sent_for_printing ──▶ printed ──▶ ready_to_collect
                        │                              ▲
                        │                              │
                        └──────────────────────────────┘

TRIGGERS:
• Auto-complete batch when ALL cards reach 'completed'
• Auto-count cards in batch when added/deleted
• Auto-timestamp all updates
```

---

## 🏗️ Database Schema Diagram

```
┌────────────────────────────────────────────────────────────┐
│                    card_batches                             │
├────────────────────────────────────────────────────────────┤
│ PK  id              : bigserial                             │
│ U   batch_id        : text (B-00001 format)                 │
│     name            : text                                  │
│     description     : text                                  │
│     status          : enum (7 values)                       │
│     total_cards     : integer (auto via trigger)            │
│     created_at      : timestamp (auto)                      │
│     updated_at      : timestamp (auto via trigger)          │
│ FK  created_by      : uuid ──────────────┐                  │
│ FK  approved_by     : uuid ──────────┐   │                  │
│     approved_at     : timestamp      │   │                  │
│     sent_for_printing_at : timestamp │   │                  │
│     completed_at    : timestamp      │   │                  │
├────────────────────────────────────────┼───┼────────────┐   │
│ Indexes (4):                           │   │            │   │
│  • idx_card_batches_batch_id          │   │            │   │
│  • idx_card_batches_status            │   │            │   │
│  • idx_card_batches_created_by        │   │            │   │
│  • idx_card_batches_created_at        │   │            │   │
└────────────────────────────────────────┼───┼────────────┘   │
                                         │   │                │
                                         │   └─────┐          │
                                         │         │          │
                                    auth.users     │          │
                                         │         │          │
                                         │         ▼          │
┌──────────────────────────────────────────────────────────────┤
│                       id_cards                                │
├──────────────────────────────────────────────────────────────┤
│ PK  id                : bigserial                             │
│ FK  employee_id       : bigint ──────▶ employees.id          │
│ FK  batch_id          : text ────────▶ card_batches.batch_id │
│     card_data         : jsonb (object)                       │
│     status            : enum (7 values)                      │
│     print_status      : varchar(50)                          │
│     created_at        : timestamp (auto)                     │
│     updated_at        : timestamp (auto via trigger)         │
│ FK  created_by        : uuid ──────────┐                    │
│ FK  approved_by       : uuid ──────┐   │                    │
│     approved_at       : timestamp  │   │                    │
│     notes             : text       │   │                    │
│     zip_url           : text       │   │                    │
│     photo_url         : text       │   │                    │
├──────────────────────────────────────┼───┼──────────────┐   │
│ Indexes (10):                        │   │              │   │
│  • idx_id_cards_batch_id            │   │              │   │
│  • idx_id_cards_employee_id         │   │              │   │
│  • idx_id_cards_status              │   │              │   │
│  • idx_id_cards_print_status        │   │              │   │
│  • idx_id_cards_created_by          │   │              │   │
│  • idx_id_cards_created_at          │   │              │   │
│  • idx_id_cards_card_data (GIN)     │   │              │   │
│                                     └───┴─────┐             │
└──────────────────────────────────────────────┼──────────────┤
                                        auth.users
```

---

## 🔧 Trigger Functions Architecture

```
┌─ DATABASE ─────────────────────────────────────────┐
│                                                     │
│  ┌─ TRIGGER: update_card_batches_updated_at       │
│  │ ├─ Event: BEFORE UPDATE on card_batches        │
│  │ ├─ Function: update_updated_at_column()        │
│  │ └─ Action: Set updated_at = NOW()              │
│  │                                                 │
│  ├─ TRIGGER: update_id_cards_updated_at           │
│  │ ├─ Event: BEFORE UPDATE on id_cards            │
│  │ ├─ Function: update_updated_at_column()        │
│  │ └─ Action: Set updated_at = NOW()              │
│  │                                                 │
│  ├─ TRIGGER: update_batch_card_count_trigger      │
│  │ ├─ Event: AFTER INSERT/UPDATE/DELETE on id_    │
│  │ │         cards                                 │
│  │ ├─ Function: update_batch_card_count()         │
│  │ └─ Action: Recalculate total_cards in batch    │
│  │                                                 │
│  └─ TRIGGER: check_batch_completion_trigger       │
│     ├─ Event: AFTER UPDATE on id_cards            │
│     │         (only when status changes)          │
│     ├─ Function: check_batch_completion()         │
│     └─ Action: If all cards completed:            │
│                Update batch status = 'completed'  │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 💻 Application Layer Integration

```
┌─ IMPORTMANAGEMENT.TSX ─────────────────────────────┐
│                                                     │
│  STATE                                              │
│  ├─ batchId: string | null                         │
│  ├─ cardIds: Record<number, number>                │
│  ├─ cardPrintStatuses: Record<number, string>      │
│  └─ csvData: string[][]                            │
│                                                     │
│  NEW FUNCTION                                       │
│  ├─ checkAndUpdateBatchStatus(batchId)             │
│  │  ├─ Query: Get all cards in batch               │
│  │  ├─ Check: Are all printed/ready_to_collect?    │
│  │  ├─ Update: If yes, set batch.status = completed│
│  │  └─ Notify: Show toast to user                  │
│  │                                                 │
│  UPDATED FUNCTIONS                                  │
│  ├─ handleDownload()                               │
│  │  └─ Added: await checkAndUpdateBatchStatus()    │
│  │                                                 │
│  ├─ handleDownloadSelected()                       │
│  │  └─ Added: await checkAndUpdateBatchStatus()    │
│  │                                                 │
│  EXISTING FUNCTIONS (no changes)                    │
│  ├─ confirmSendToPrint() - updates batch status    │
│  ├─ handleMarkAsDone() - updates batch status      │
│  └─ csvRowToEmployee() - helper                    │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

## 🔐 Row-Level Security Architecture

```
┌─ RLS POLICIES ──────────────────────────────────────┐
│                                                      │
│  card_batches                                        │
│  ├─ SELECT policy: All users can view               │
│  ├─ INSERT policy: Only (auth.uid() = created_by)   │
│  ├─ UPDATE policy: created_by OR approved_by        │
│  └─ DELETE policy: Only created_by                  │
│                                                      │
│  id_cards                                            │
│  ├─ SELECT policy: All users can view               │
│  ├─ INSERT policy: Only (auth.uid() = created_by)   │
│  ├─ UPDATE policy: created_by OR approved_by        │
│  └─ DELETE policy: Only created_by                  │
│                                                      │
└──────────────────────────────────────────────────────┘

┌─ SECURITY FLOW ─────────────────────────────────────┐
│                                                      │
│  User Request                                        │
│    │                                                 │
│    ▼                                                 │
│  Supabase Auth Check                                │
│    │                                                 │
│    ├─ Valid token? ──NO──▶ 401 Unauthorized        │
│    │                                                 │
│    └─ YES                                            │
│        ▼                                             │
│    Apply RLS Policies                               │
│        │                                             │
│        ├─ SELECT: Can see rows?                     │
│        ├─ INSERT: Can create rows?                  │
│        ├─ UPDATE: Can modify rows?                  │
│        └─ DELETE: Can remove rows?                  │
│        │                                             │
│        ├─ Authorized ──▶ Execute Query              │
│        └─ Denied ──▶ 403 Forbidden                  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

```
USER INTERFACE
     │
     ├─ Single Download
     │  └─▶ handleDownload()
     │     └─▶ [DB] Update id_cards.print_status='printed'
     │        └─▶ [APP] checkAndUpdateBatchStatus()
     │           └─▶ [DB] SELECT id_cards WHERE batch_id = ?
     │              └─▶ Check: all printed?
     │                 ├─ YES ──▶ [DB] UPDATE card_batches status='completed'
     │                 │          └─▶ [UI] Toast: "Batch completed!"
     │                 └─ NO  ──▶ [UI] Silent exit
     │
     ├─ Bulk Download
     │  └─▶ handleDownloadSelected()
     │     └─▶ [DB] UPDATE id_cards.print_status='printed' (bulk)
     │        └─▶ [APP] checkAndUpdateBatchStatus()
     │           └─▶ [DB] SELECT id_cards WHERE batch_id = ?
     │              └─▶ Check: all printed?
     │                 ├─ YES ──▶ [DB] UPDATE card_batches status='completed'
     │                 │          └─▶ [UI] Toast: "Batch completed!"
     │                 └─ NO  ──▶ [UI] Silent exit
     │
     ├─ Mark Ready
     │  └─▶ handleMarkAsDone()
     │     └─▶ [DB] UPDATE id_cards print_status='ready_to_collect'
     │        └─▶ Check: all ready?
     │           ├─ YES ──▶ [DB] UPDATE card_batches status='completed'
     │           │          └─▶ [UI] Toast: "Ready to collect!"
     │           └─ NO  ──▶ [UI] Toast: "Marked ready"
     │
     └─ Send to Print
        └─▶ confirmSendToPrint()
           └─▶ [DB] UPDATE id_cards status='sent_for_printing' (bulk)
              └─▶ [DB] INSERT vendor_requests
                 └─▶ Check: all sent?
                    ├─ YES ──▶ [DB] UPDATE card_batches status='sent_for_printing'
                    └─ NO  ──▶ [UI] Toast: "Sent to vendor"

DATABASE TRIGGERS (Automatic)
     │
     ├─ On id_cards INSERT/UPDATE/DELETE
     │  └─▶ update_batch_card_count()
     │     └─▶ Recalculate: total_cards = COUNT(*)
     │
     ├─ On id_cards UPDATE (status change)
     │  └─▶ check_batch_completion()
     │     └─▶ IF all cards = 'completed'
     │        └─▶ UPDATE card_batches status='completed'
     │
     └─ On any UPDATE
        └─▶ update_updated_at_column()
           └─▶ SET updated_at = NOW()
```

---

## 🚀 Performance Optimization

```
┌─ INDEXES FOR COMMON QUERIES ──────────────────────────┐
│                                                         │
│  card_batches Indexes                                  │
│  ├─ idx_card_batches_batch_id (BTREE)                 │
│  │  └─ Query: SELECT * FROM card_batches WHERE batch_id = ?
│  │     └─ Time: O(log n)                              │
│  │                                                     │
│  ├─ idx_card_batches_status (BTREE)                   │
│  │  └─ Query: SELECT * FROM card_batches WHERE status = ?
│  │     └─ Time: O(log n)                              │
│  │                                                     │
│  ├─ idx_card_batches_created_by (BTREE)               │
│  │  └─ Query: SELECT * FROM card_batches WHERE created_by = ?
│  │     └─ Time: O(log n)                              │
│  │                                                     │
│  └─ idx_card_batches_created_at (BTREE)               │
│     └─ Query: SELECT * FROM card_batches WHERE created_at > ?
│        └─ Time: O(log n)                              │
│                                                         │
│  id_cards Indexes                                      │
│  ├─ idx_id_cards_batch_id (BTREE)                     │
│  │  └─ Query: SELECT * FROM id_cards WHERE batch_id = ?
│  │     └─ Time: O(log n)                              │
│  │     └─ Used by: checkAndUpdateBatchStatus()        │
│  │                                                     │
│  ├─ idx_id_cards_employee_id (BTREE)                  │
│  ├─ idx_id_cards_status (BTREE)                       │
│  ├─ idx_id_cards_print_status (BTREE)                 │
│  ├─ idx_id_cards_created_by (BTREE)                   │
│  ├─ idx_id_cards_created_at (BTREE)                   │
│  │  └─ All used for filtering operations              │
│  │                                                     │
│  ├─ idx_id_cards_card_data (GIN)                      │
│  │  └─ Query: SELECT * FROM id_cards WHERE card_data @> ?
│  │     └─ Time: O(n) → O(log n) with index            │
│  │     └─ Used for JSONB queries                      │
│  │                                                     │
│  └─ Result: All common queries O(log n) time          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Implementation Checklist

```
PHASE 1: Database Migration
├─ [ ] Create migration file 030_create_card_batches_and_id_cards.sql
├─ [ ] Define card_batches table schema
├─ [ ] Define id_cards table schema
├─ [ ] Create 14 indexes
├─ [ ] Create 3 trigger functions
├─ [ ] Add 8 RLS policies
└─ [ ] Test migration execution

PHASE 2: Application Code
├─ [ ] Add checkAndUpdateBatchStatus() function
├─ [ ] Update handleDownload() function
├─ [ ] Update handleDownloadSelected() function
├─ [ ] Test single card download
├─ [ ] Test bulk card download
└─ [ ] Verify toast notifications

PHASE 3: Testing
├─ [ ] Database: Tables created correctly
├─ [ ] Database: Indexes created
├─ [ ] Database: Triggers active
├─ [ ] Database: RLS policies enforced
├─ [ ] Application: No TypeScript errors
├─ [ ] Application: No runtime errors
├─ [ ] Workflow: Single download → batch complete
├─ [ ] Workflow: Bulk download → batch complete
├─ [ ] Workflow: Mark ready → batch complete
├─ [ ] Workflow: Partial completion → batch pending
└─ [ ] Data: Audit trail maintained

PHASE 4: Deployment
├─ [ ] Deploy migration
├─ [ ] Deploy code changes
├─ [ ] Verify tables in database
├─ [ ] Monitor logs for errors
├─ [ ] Test in production
└─ [ ] Document completion
```

---

## 📚 Documentation Map

```
START HERE
    │
    ├─▶ CARD_BATCHES_IMPLEMENTATION_SUMMARY.md
    │   └─ Overview & quick facts
    │
    ├─▶ CARD_BATCHES_QUICK_REFERENCE.md
    │   └─ Common tasks & troubleshooting
    │
    ├─▶ CARD_BATCHES_IMPLEMENTATION.md
    │   └─ Complete technical reference
    │
    ├─▶ CARD_BATCHES_CODE_CHANGES.md
    │   └─ Detailed code modifications
    │
    └─▶ 030_create_card_batches_and_id_cards.sql
        └─ Database migration
```

---

**Visual Guide Complete** ✅

Use this diagram when explaining the system to:
- Developers (understand code flow)
- DBAs (understand schema)
- Project Managers (understand workflow)
- QA (understand testing points)
