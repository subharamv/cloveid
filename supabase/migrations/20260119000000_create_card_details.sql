-- Migration: create_card_details_table
CREATE TABLE IF NOT EXISTS public.card_details (
    id BIGSERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    blood_group TEXT,
    branch TEXT,
    emergency_contact TEXT,
    country_code TEXT DEFAULT '+91',
    photo_url TEXT,
    zip_url TEXT,
    status TEXT DEFAULT 'Pending',
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.card_details ENABLE ROW LEVEL SECURITY;

-- Allow public insert access
CREATE POLICY "Allow public insert access" ON public.card_details
    FOR INSERT WITH CHECK (true);

-- Allow public read access
CREATE POLICY "Allow public select access" ON public.card_details
    FOR SELECT USING (true);

-- Allow public update access
CREATE POLICY "Allow public update access" ON public.card_details
    FOR UPDATE USING (true);
