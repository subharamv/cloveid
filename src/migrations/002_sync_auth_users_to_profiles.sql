-- =================================================================
-- SYNC AUTH.USERS TO PROFILES AND EMPLOYEES
--
-- This script creates triggers to synchronize new user sign-ups and updates
-- from `auth.users` to the `public.profiles` and `public.employees` tables.
--
-- It also provides a backfill script to sync existing users.
-- =================================================================

-- 1. Function to handle new user creation
-- =================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile record, do nothing if it already exists.
  INSERT INTO public.profiles (id, full_name, branch)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->>'branch')::public.branch_enum
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert a new employee record if employee_id is present, do nothing if it already exists.
  IF NEW.raw_user_meta_data->>'employee_id' IS NOT NULL THEN
    INSERT INTO public.employees (name, employee_id, branch, email, created_by)
    VALUES (
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'employee_id',
      (NEW.raw_user_meta_data->>'branch')::public.branch_enum,
      NEW.email,
      NEW.id
    ) ON CONFLICT (employee_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger to execute the function on new user creation
-- =================================================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Function to handle user updates
-- =================================================================
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.raw_user_meta_data <> NEW.raw_user_meta_data OR OLD.email <> NEW.email THEN
    -- Update the corresponding profile record
    UPDATE public.profiles
    SET
      full_name = NEW.raw_user_meta_data->>'full_name',
      branch = (NEW.raw_user_meta_data->>'branch')::public.branch_enum
    WHERE id = NEW.id;

    -- Update the corresponding employee record
    UPDATE public.employees
    SET
      name = NEW.raw_user_meta_data->>'full_name',
      branch = (NEW.raw_user_meta_data->>'branch')::public.branch_enum,
      email = NEW.email
    WHERE created_by = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger to execute the function on user update
-- =================================================================
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_update();

-- 5. Backfill script for existing users
-- =================================================================
-- This script will insert profiles and employees for any users in auth.users that
-- do not yet have a corresponding record in public.profiles or public.employees.
--
-- Run this manually after applying the migration.
-- -----------------------------------------------------------------

-- Backfill profiles
INSERT INTO public.profiles (id, full_name, branch)
SELECT
  u.id,
  u.raw_user_meta_data->>'full_name',
  (u.raw_user_meta_data->>'branch')::public.branch_enum
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Backfill employees
INSERT INTO public.employees (name, employee_id, branch, email, created_by)
SELECT
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'employee_id',
  (u.raw_user_meta_data->>'branch')::public.branch_enum,
  u.email,
  u.id
FROM auth.users u
WHERE u.raw_user_meta_data->>'employee_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.employees e WHERE e.employee_id = u.raw_user_meta_data->>'employee_id'
  )
ON CONFLICT (employee_id) DO NOTHING;


-- =================================================================
-- MIGRATION METADATA
-- =================================================================
-- Insert migration record for tracking
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
    ) THEN
        INSERT INTO public.schema_migrations (version, name, executed_at) 
        VALUES ('002_sync_auth_users_to_profiles', 'Sync auth.users to profiles and employees', now())
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

COMMENT ON SCHEMA public IS 'CLOVE ID Maker Database - Auth Sync Applied';