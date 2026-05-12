-- Migration 037: Auto-confirm user email when admin approves account
-- This SECURITY DEFINER function allows admins to confirm a user's email
-- when approving their account, eliminating the need for users to click
-- the email verification link. Called via supabase.rpc('confirm_user_email', { user_id })

CREATE OR REPLACE FUNCTION public.confirm_user_email(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE auth.users
  SET
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW(),
    confirmation_sent_at = COALESCE(confirmation_sent_at, NOW()),
    confirmation_token = NULL
  WHERE id = user_id;

  RETURN FOUND;
END;
$$;

-- Grant execute to authenticated users (admins logged in via frontend)
GRANT EXECUTE ON FUNCTION public.confirm_user_email TO authenticated;

-- Grant execute to service_role (for edge functions if needed)
GRANT EXECUTE ON FUNCTION public.confirm_user_email TO service_role;
