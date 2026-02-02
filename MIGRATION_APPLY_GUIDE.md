# Quick Migration Guide - Apply to Supabase

## Migration File
**Location**: `src/migrations/021_enhance_vendor_requests_for_card_details.sql`

## How to Apply

### Option 1: Using Supabase Dashboard (Recommended)

1. **Log in** to Supabase Dashboard
2. **Navigate** to your project
3. **Go to**: SQL Editor (left sidebar)
4. **Click**: New Query
5. **Copy & Paste** the entire content of `021_enhance_vendor_requests_for_card_details.sql`
6. **Click**: Run
7. **Verify**: No errors shown

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase migrations up

# Or manually
psql -h your-db-host -U postgres -d your-db-name < src/migrations/021_enhance_vendor_requests_for_card_details.sql
```

## What the Migration Does

Adds 3 new database features:

1. **`card_details_id` column**
   - Allows vendor_requests to reference card_details table
   - NULL by default (only set for single card editor cards)

2. **`source_table` column**
   - Tracks whether card came from 'requests' or 'card_details'
   - DEFAULT: 'requests'
   - Helps system route updates to correct table

3. **Performance Indexes**
   - `idx_vendor_requests_card_details_id` - Fast lookups by card ID
   - `idx_vendor_requests_source_table` - Fast filtering by source
   - `idx_vendor_requests_vendor_source` - Fast vendor queries

## Verification

After running migration, verify in SQL Editor:

```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vendor_requests' 
AND column_name IN ('card_details_id', 'source_table');

-- Should return 2 rows

-- Check indexes were created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'vendor_requests' 
AND indexname LIKE 'idx_vendor_requests_%';

-- Should return 3 rows
```

## Rollback (If Needed)

If you need to undo the migration:

```sql
-- Remove columns and indexes
DROP INDEX IF EXISTS idx_vendor_requests_vendor_source;
DROP INDEX IF EXISTS idx_vendor_requests_source_table;
DROP INDEX IF EXISTS idx_vendor_requests_card_details_id;
ALTER TABLE public.vendor_requests DROP COLUMN IF EXISTS card_details_id;
ALTER TABLE public.vendor_requests DROP COLUMN IF EXISTS source_table;
```

## No Data Loss

- ✅ No existing data will be deleted
- ✅ Existing vendor_requests records remain unchanged
- ✅ New columns are optional (NULL default)
- ✅ Fully backward compatible

---

**Migration Ready**: Apply before deploying the application fix
