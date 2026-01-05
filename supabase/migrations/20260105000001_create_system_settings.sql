-- Migration: create_system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON public.system_settings
    FOR SELECT USING (true);

-- Allow authenticated admins to update
CREATE POLICY "Allow admins to manage settings" ON public.system_settings
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
    ));

-- Insert default values (empty or placeholders)
INSERT INTO public.system_settings (key, value) VALUES 
('logo_header', null),
('logo_id_front', null),
('logo_id_back', null),
('logo_login', null)
ON CONFLICT (key) DO NOTHING;
