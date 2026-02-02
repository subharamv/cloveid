-- Fix vendor profile access - allow vendors to read their own profile
-- This migration ensures vendors can log in by reading their own profile row

-- Step 1: Add email column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Step 2: Populate email from auth.users for existing profiles
UPDATE public.profiles
SET email = au.email
FROM auth.users au
WHERE profiles.id = au.id AND profiles.email IS NULL;

-- Step 3: Ensure profiles table has proper RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies that might be blocking vendors
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create proper read policy: Everyone can read (used at login time before auth is set)
CREATE POLICY "Profiles readable by anyone during auth" ON public.profiles
    FOR SELECT TO anon, authenticated USING (true);

-- Create update policy: Users can update their own profile only
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Create insert policy: New users created by triggers
CREATE POLICY "Users can insert own profile via trigger" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id OR id IS NULL);

-- Step 4: Ensure profiles has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Step 5: Update trigger to sync email from auth.users
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync email when auth.users changes
DROP TRIGGER IF EXISTS on_auth_user_updated_sync_email ON auth.users;
CREATE TRIGGER on_auth_user_updated_sync_email
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();

-- Log migration
SELECT 'Vendor profile RLS fixed - email column added and synced from auth.users' as migration_status;
