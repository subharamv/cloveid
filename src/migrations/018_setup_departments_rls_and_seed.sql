-- Migration: 018_setup_departments_rls_and_seed
-- Purpose: Enable RLS on departments and allow public (anon) access for registration.

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 1. Allow everyone (including unauthenticated users) to view departments
-- This is necessary for the registration form
DROP POLICY IF EXISTS "Departments are viewable by everyone" ON public.departments;
CREATE POLICY "Departments are viewable by everyone" ON public.departments
    FOR SELECT
    USING (true);

-- 2. Allow Admins and Managers to manage departments
DROP POLICY IF EXISTS "Admins and Managers can manage departments" ON public.departments;
CREATE POLICY "Admins and Managers can manage departments" ON public.departments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Seed initial departments if table is empty
INSERT INTO public.departments (name)
VALUES 
('Administration'),
('Arch Illus'),
('Architectural'),
('Built Design 2D'),
('Built Design 3D'),
('CAD'),
('Client Management'),
('Data Acquisition'),
('Finance'),
('GIS'),
('Human Resources'),
('IT Support'),
('Marketing'),
('Solution Engineering Hub'),
('Unit Head')
ON CONFLICT (name) DO NOTHING;

-- Record migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
        INSERT INTO public.schema_migrations (version, name, executed_at) 
        VALUES ('018_setup_departments_rls_and_seed', 'Setup RLS for departments and seed initial data', now())
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;
