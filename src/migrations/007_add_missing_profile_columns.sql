-- Add blood_group column to profiles table
-- We use text type here to ensure the column can be added even if the enum type has issues.
-- The application validates the input via the dropdown selection.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS blood_group text;

-- Ensure employee_id also exists as it is often required with profile updates
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employee_id text;

-- Add index for employee_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles (employee_id);
