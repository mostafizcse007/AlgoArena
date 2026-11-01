-- Migration: 20261101000001_fix_orphaned_profiles_and_cascade.sql
-- Description:
-- 1. Remove orphaned profiles where no corresponding auth.users record exists
-- 2. Add ON DELETE CASCADE foreign key from public.profiles(id) to auth.users(id)
-- 3. Update check_username_available to only block if an active confirmed user exists

-- Step 1: Remove any orphaned profiles without an active auth user
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 2: Enforce foreign key with cascade deletion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Ensure check_username_available only considers confirmed auth users
CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(trim(p_username)) < 3 OR length(trim(p_username)) > 20 THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE lower(p.username) = lower(trim(p_username))
      AND u.email_confirmed_at IS NOT NULL
  );
END;
$$;

