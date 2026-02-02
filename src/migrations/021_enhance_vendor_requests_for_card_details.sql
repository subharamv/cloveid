-- Migration: 021_enhance_vendor_requests_for_card_details
-- Purpose: Enable vendor_requests to work with both 'requests' and 'card_details' tables
-- This allows single card editor cards to be sent to vendors for printing

DO $$
BEGIN
    -- 1. Add card_details_id column to reference card_details table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_requests' AND column_name = 'card_details_id') THEN
        ALTER TABLE public.vendor_requests ADD COLUMN card_details_id bigint REFERENCES public.card_details(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added card_details_id column to vendor_requests';
    END IF;

    -- 2. Add source_table column to track which table the request came from
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_requests' AND column_name = 'source_table') THEN
        ALTER TABLE public.vendor_requests ADD COLUMN source_table text DEFAULT 'requests' CHECK (source_table IN ('requests', 'card_details'));
        RAISE NOTICE 'Added source_table column to vendor_requests';
    END IF;

    -- 3. Create index for faster lookups by card_details_id
    CREATE INDEX IF NOT EXISTS idx_vendor_requests_card_details_id ON public.vendor_requests USING BTREE (card_details_id);

    -- 4. Create index for source_table filtering
    CREATE INDEX IF NOT EXISTS idx_vendor_requests_source_table ON public.vendor_requests USING BTREE (source_table);

    -- 5. Create composite index for common query patterns
    CREATE INDEX IF NOT EXISTS idx_vendor_requests_vendor_source ON public.vendor_requests USING BTREE (vendor_id, source_table);

END $$;

-- 6. Record migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
        INSERT INTO public.schema_migrations (version, name, executed_at) 
        VALUES ('021_enhance_vendor_requests_for_card_details', 'Enable vendor_requests to work with card_details table', now())
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;
