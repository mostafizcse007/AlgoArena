-- Migration: 20261101000000_production_factory_reset.sql
-- Description: Production launch cleanup script.
-- Wipes all ephemeral testing telemetry, match records, test submissions,
-- synthetic seed profiles, and auth users while preserving the core problem
-- catalog (`problems` and `problem_secret_tests`).
-- Note: Storage files are managed via Supabase Storage UI/API.

-- 1. Truncate ephemeral duel and matchmaking telemetry
TRUNCATE TABLE public.match_submissions CASCADE;
TRUNCATE TABLE public.match_hacks CASCADE;
TRUNCATE TABLE public.matchmaking_queue CASCADE;
TRUNCATE TABLE public.duel_activity CASCADE;
TRUNCATE TABLE public.matches CASCADE;

-- 2. Delete all profiles (including synthetic/seed profiles)
DELETE FROM public.profiles;

-- 3. Delete all auth users
DELETE FROM auth.users;
