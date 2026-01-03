-- Migration: 014_link_vendor_requests_to_batches
-- Purpose: Link requests and vendor_requests to card_batches to support cascading deletes.

-- 1. Add batch_id to requests table
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS batch_id text;

-- 2. Add foreign key constraint to requests
-- Note: batch_id in card_batches is unique and is type 'text'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'requests_batch_id_fkey'
    ) THEN
        ALTER TABLE public.requests
        ADD CONSTRAINT requests_batch_id_fkey 
        FOREIGN KEY (batch_id) 
        REFERENCES public.card_batches(batch_id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Add batch_id to vendor_requests table
ALTER TABLE public.vendor_requests 
ADD COLUMN IF NOT EXISTS batch_id text;

-- 4. Add foreign key constraint to vendor_requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'vendor_requests_batch_id_fkey'
    ) THEN
        ALTER TABLE public.vendor_requests
        ADD CONSTRAINT vendor_requests_batch_id_fkey 
        FOREIGN KEY (batch_id) 
        REFERENCES public.card_batches(batch_id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Update schema_migrations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
        INSERT INTO public.schema_migrations (version, name, executed_at) 
        VALUES ('014_link_vendor_requests_to_batches', 'Link requests and vendor_requests to batches with cascading deletes', now())
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;
