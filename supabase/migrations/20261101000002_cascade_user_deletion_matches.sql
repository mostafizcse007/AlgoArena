-- Migration: 20261101000002_cascade_user_deletion_matches.sql
-- Description: Enable ON DELETE CASCADE for matches, submissions, and hacks so deleting a user cleanly deletes their match telemetry without foreign key violations.

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_player1_id_fkey,
  ADD CONSTRAINT matches_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_player2_id_fkey,
  ADD CONSTRAINT matches_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_winner_id_fkey,
  ADD CONSTRAINT matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.match_submissions
  DROP CONSTRAINT IF EXISTS match_submissions_player_id_fkey,
  ADD CONSTRAINT match_submissions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.match_hacks
  DROP CONSTRAINT IF EXISTS match_hacks_attacker_id_fkey,
  ADD CONSTRAINT match_hacks_attacker_id_fkey FOREIGN KEY (attacker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.match_hacks
  DROP CONSTRAINT IF EXISTS match_hacks_defender_id_fkey,
  ADD CONSTRAINT match_hacks_defender_id_fkey FOREIGN KEY (defender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

