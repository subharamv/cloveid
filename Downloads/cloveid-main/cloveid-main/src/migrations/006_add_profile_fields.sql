-- Add employee_id and blood_group to profiles table

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employee_id text,
ADD COLUMN IF NOT EXISTS blood_group public.blood_group_enum;

-- Add index for employee_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles (employee_id);
