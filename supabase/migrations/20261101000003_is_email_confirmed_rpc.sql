-- Migration: 20261101000003_is_email_confirmed_rpc.sql
-- Description: Create security definer RPC to verify if an email address is confirmed in auth.users

CREATE OR REPLACE FUNCTION public.is_email_confirmed(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = lower(trim(p_email))
      AND email_confirmed_at IS NOT NULL
  );
END;
$$;
