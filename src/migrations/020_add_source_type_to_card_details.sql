-- Add source_type column to card_details table to track requests from single card editor
-- This helps distinguish between requests created via the SingleCard editor vs other sources

ALTER TABLE public.card_details 
ADD COLUMN source_type text DEFAULT 'single_card_editor' CHECK (source_type IN ('single_card_editor', 'bulk_import', 'manual'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_card_details_source_type ON public.card_details USING BTREE (source_type);

-- Add created_by column to track which user created the card (if needed for audit)
ALTER TABLE public.card_details
ADD COLUMN created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for user tracking
CREATE INDEX IF NOT EXISTS idx_card_details_created_by ON public.card_details USING BTREE (created_by);
