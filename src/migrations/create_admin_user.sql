-- =====================================================
-- Admin User Setup Script
-- Version: 1.0
-- Created: 2025-12-18
-- Description: Creates admin user profile after user is created through Supabase Auth
-- =====================================================

-- IMPORTANT: This script should be run AFTER creating the user through Supabase Auth
-- Do NOT run this as part of the main migration - run it separately

-- Create admin profile for user if it exists
DO $$
DECLARE
    admin_user_id uuid;
    user_count integer;
BEGIN
    -- Check if user exists in auth.users
    SELECT COUNT(id) INTO user_count
    FROM auth.users 
    WHERE email = 'subharam.v@clovetech.com';
    
    IF user_count = 0 THEN
        RAISE NOTICE '=== ADMIN USER SETUP REQUIRED ===';
        RAISE NOTICE 'User "subharam.v@clovetech.com" not found in auth.users';
        RAISE NOTICE '';
        RAISE NOTICE 'Please follow these steps:';
        RAISE NOTICE '1. Go to your Supabase Dashboard';
        RAISE NOTICE '2. Navigate to Authentication > Users';
        RAISE NOTICE '3. Click "Add user" and create the admin user';
        RAISE NOTICE '4. After creating the user, run this script again';
        RAISE NOTICE '';
        RAISE NOTICE 'Then re-run this script to create the admin profile.';
        RETURN;
    END IF;
    
    -- Get the user ID
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'subharam.v@clovetech.com';
    
    -- Create or update the profile
    INSERT INTO public.profiles (id, full_name, role, branch, is_active)
    VALUES (admin_user_id, 'Subharam V', 'admin', 'HYD', true)
    ON CONFLICT (id) 
    DO UPDATE SET 
        role = 'admin',
        full_name = 'Subharam V',
        branch = 'HYD',
        is_active = true,
        updated_at = now();
    
    RAISE NOTICE '✓ Admin profile created/updated successfully for user: %', admin_user_id;
END $$;

-- Verify the admin profile was created
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.branch,
    p.is_active,
    u.email,
    u.created_at as user_created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin'
AND u.email = 'subharam.v@clovetech.com';

-- Instructions for testing admin access
/*
To test the admin user setup:

1. Sign in to your application with:
   - Email: subharam.v@clovetech.com
   - Password: (the password you set when creating the user)

2. Verify admin privileges by checking:
   - Access to admin-only pages/routes
   - Ability to manage other users
   - Full CRUD operations on employees, cards, and batches

3. If you need to reset the admin user:
   - Delete the user from Supabase Dashboard > Authentication > Users
   - Recreate the user through Supabase Auth
   - Run this script again

Security Notes:
- Change the default password immediately after first login
- Consider implementing 2FA for admin accounts
- Regularly review admin access logs
- Limit admin user count to only necessary personnel
*/
