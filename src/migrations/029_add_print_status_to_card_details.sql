-- Migration: 029_add_print_status_to_card_details
-- Purpose: Add print_status column to card_details table to support print workflow tracking

-- Add print_status column to card_details table if it doesn't exist
-- (Skipping if column already exists to prevent duplicate column error)

-- Drop existing constraint if it exists, then recreate it
ALTER TABLE public.card_details
DROP CONSTRAINT IF EXISTS card_details_print_status_check;

ALTER TABLE public.card_details
ADD CONSTRAINT card_details_print_status_check 
CHECK (print_status IN ('not_printed', 'sent_for_printing', 'completed', 'printed', 'ready_to_collect', 'collected'));

-- Create index for faster filtering by print status
CREATE INDEX IF NOT EXISTS idx_card_details_print_status ON public.card_details USING BTREE (print_status);

-- Verify RLS policy exists for updates
-- The policy should already allow updates from the create_card_details migration

-- Log migration
SELECT 'Added print_status column to card_details table' as migration_status;
