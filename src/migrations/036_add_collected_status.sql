-- Migration: 036_add_collected_status
-- Purpose: Add 'collected' status to all tables that track print_status

-- Add 'collected' to requests table print_status (no constraint, so just a note)
-- The requests table uses VARCHAR without constraints, so any value is allowed

-- Verify card_details print_status constraint includes 'collected'
-- (Already updated in migration 029)

-- Add constraint check for id_cards print_status if not already present
-- id_cards uses VARCHAR(50) without explicit constraint, so any value is allowed

-- Create index for faster filtering by collected status if not exists
CREATE INDEX IF NOT EXISTS idx_requests_print_status ON public.requests USING BTREE (print_status);
CREATE INDEX IF NOT EXISTS idx_id_cards_collected_status ON public.id_cards USING BTREE (print_status) WHERE print_status = 'collected';

-- Log migration
SELECT 'Added collected status support across all print_status columns' as migration_status;

