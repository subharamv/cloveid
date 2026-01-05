-- 1. Add 'vendor' to user_role_enum
ALTER TYPE public.user_role_enum ADD VALUE IF NOT EXISTS 'vendor';