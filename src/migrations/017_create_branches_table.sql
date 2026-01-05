-- Migration: 017_create_branches_table
-- Purpose: Add branches table for dynamic branch management (Address, Phone, etc.)

CREATE TABLE IF NOT EXISTS public.branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Everyone (authenticated) can view branches
DROP POLICY IF EXISTS "Branches are viewable by authenticated users" ON public.branches;
CREATE POLICY "Branches are viewable by authenticated users" ON public.branches
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Admins and Managers can manage branches
DROP POLICY IF EXISTS "Admins and Managers can manage branches" ON public.branches;
CREATE POLICY "Admins and Managers can manage branches" ON public.branches
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Seed initial data based on current hardcoded values
INSERT INTO public.branches (name, address, phone, email, website)
VALUES 
('HYD', 'V.V.G Park View, H.No. 1-63/50, Plot No. 50, Kavuri Hills, Jubilee Hills, Hyderabad-500033, TG, India', '+91 89779 29563', 'hr@clovetech.com', 'www.clovetech.com'),
('VIZAG', 'Plot No.9, Hill No 2 APIIC IT & SEZ, Rushikonda Madhurawada, Visakhapatnam-530045, AP, India', '+91 87905 95566', 'hr@clovetech.com', 'www.clovetech.com')
ON CONFLICT (name) DO NOTHING;

-- Record migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
        INSERT INTO public.schema_migrations (version, name, executed_at) 
        VALUES ('017_create_branches_table', 'Create branches table for dynamic branch management', now())
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;
