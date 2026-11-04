-- Migration: 20261104000000_fix_seed_emails_and_matchmaking.sql
-- Description: 
-- 1. Correct test user email assignments for antu and mostafiz
-- 2. Restrict Elo rating updates strictly to Ranked 1v1 matches (prevent Demo & Private room Elo farming)
-- 3. Prevent repeat-opponent matchmaking pairings and Elo win-trading within 30 minutes
-- 4. Update starter_code JSON to include blank signatures for all problem categories

-- 1. Fix seed emails
UPDATE auth.users 
SET 
  email = 'antu@algoarena.dev',
  raw_user_meta_data = jsonb_set(raw_user_meta_data, '{email}', '"antu@algoarena.dev"')
WHERE id = '22a63a90-1edf-4b76-b42f-a499c96f2ae3';

UPDATE auth.users 
SET 
  email = 'juniormostafiz@gmail.com',
  raw_user_meta_data = jsonb_set(raw_user_meta_data, '{email}', '"juniormostafiz@gmail.com"')
WHERE id = 'e620d3a0-8c4f-4349-b3e7-bd920cb6e885';

-- 2. Update problem starter_code JSON to include 'blank' key
UPDATE public.problems
SET starter_code = starter_code || jsonb_build_object('blank', starter_code->>'javascript')
WHERE starter_code IS NOT NULL;

-- 3. Settle match with strict ranked Elo gating and repeat-opponent K-factor protection
CREATE OR REPLACE FUNCTION public.settle_match(
  p_match_id uuid,
  p_winner_id uuid default null,
  p_reason text default 'normal',
  p_replay_trace jsonb default '[]'::jsonb,
  p_category text default 'graphs'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match record;
  v_p1 record;
  v_p2 record;
  v_k integer := 32;
  v_expected1 float;
  v_expected2 float;
  v_actual1 float;
  v_actual2 float;
  v_delta1 integer := 0;
  v_delta2 integer := 0;
  v_new_elo1 integer;
  v_new_elo2 integer;
  v_curr_skill1 integer;
  v_curr_skill2 integer;
  v_new_skill1 integer;
  v_new_skill2 integer;
  v_repeat_count integer := 0;
  v_is_ranked boolean;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;

  IF v_match.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match already completed');
  END IF;

  SELECT * INTO v_p1 FROM public.profiles WHERE id = v_match.player1_id FOR UPDATE;

  v_is_ranked := (v_match.mode IN ('ranked', 'ranked_1v1') AND v_match.player2_id IS NOT NULL);

  -- For Demo (single player) or unrated / private room matches:
  IF NOT v_is_ranked THEN
    UPDATE public.matches SET
      status = 'completed',
      winner_id = p_winner_id,
      player1_elo_delta = 0,
      player2_elo_delta = 0,
      replay_trace = p_replay_trace
    WHERE id = p_match_id;

    IF v_p1.id IS NOT NULL THEN
      UPDATE public.profiles SET
        matches_played = matches_played + 1,
        matches_won = CASE WHEN p_winner_id = v_p1.id THEN matches_won + 1 ELSE matches_won END,
        hacks_landed = CASE WHEN p_reason = 'successful_hack' AND p_winner_id = v_p1.id THEN hacks_landed + 1 ELSE hacks_landed END
      WHERE id = v_p1.id;

      INSERT INTO public.duel_activity (player_id, duel_date, duel_count)
      VALUES (v_p1.id, current_date, 1)
      ON CONFLICT (player_id, duel_date) DO UPDATE SET duel_count = duel_activity.duel_count + 1;
    END IF;

    IF v_match.player2_id IS NOT NULL THEN
      UPDATE public.profiles SET
        matches_played = matches_played + 1,
        matches_won = CASE WHEN p_winner_id = v_match.player2_id THEN matches_won + 1 ELSE matches_won END,
        hacks_landed = CASE WHEN p_reason = 'successful_hack' AND p_winner_id = v_match.player2_id THEN hacks_landed + 1 ELSE hacks_landed END
      WHERE id = v_match.player2_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'is_unrated', true,
      'player1_delta', 0,
      'player2_delta', 0,
      'new_elo1', v_p1.elo,
      'new_peak_elo1', v_p1.peak_elo
    );
  END IF;

  -- 2-Player Ranked Match
  SELECT * INTO v_p2 FROM public.profiles WHERE id = v_match.player2_id FOR UPDATE;

  -- Repeat-opponent check within last 30 minutes to prevent win trading / farming
  SELECT count(*) INTO v_repeat_count
  FROM public.matches
  WHERE status = 'completed'
    AND mode IN ('ranked', 'ranked_1v1')
    AND created_at > now() - interval '30 minutes'
    AND id <> p_match_id
    AND (
      (player1_id = v_match.player1_id AND player2_id = v_match.player2_id)
      OR (player1_id = v_match.player2_id AND player2_id = v_match.player1_id)
    );

  IF v_repeat_count >= 2 THEN
    v_k := 0; -- Scale K-factor to 0 to prevent Elo farming
  ELSIF v_repeat_count = 1 THEN
    v_k := 12; -- Scale K-factor down
  ELSE
    v_k := 32;
  END IF;

  v_expected1 := 1.0 / (1.0 + power(10.0, (coalesce(v_match.player2_elo_before, v_p2.elo) - v_match.player1_elo_before)::float / 400.0));
  v_expected2 := 1.0 - v_expected1;

  IF p_winner_id = v_match.player1_id THEN
    v_actual1 := 1.0; v_actual2 := 0.0;
  ELSIF p_winner_id = v_match.player2_id THEN
    v_actual1 := 0.0; v_actual2 := 1.0;
  ELSE
    v_actual1 := 0.5; v_actual2 := 0.5;
  END IF;

  v_delta1 := round(v_k * (v_actual1 - v_expected1));
  v_delta2 := round(v_k * (v_actual2 - v_expected2));

  v_new_elo1 := greatest(100, v_p1.elo + v_delta1);
  v_new_elo2 := greatest(100, v_p2.elo + v_delta2);

  v_curr_skill1 := coalesce((v_p1.skills->>p_category)::integer, 1200);
  v_curr_skill2 := coalesce((v_p2.skills->>p_category)::integer, 1200);
  v_new_skill1 := greatest(100, v_curr_skill1 + v_delta1);
  v_new_skill2 := greatest(100, v_curr_skill2 + v_delta2);

  UPDATE public.profiles SET
    elo = v_new_elo1,
    peak_elo = greatest(peak_elo, v_new_elo1),
    tier = public.calculate_tier(v_new_elo1),
    matches_played = matches_played + 1,
    matches_won = CASE WHEN p_winner_id = v_p1.id THEN matches_won + 1 ELSE matches_won END,
    skills = jsonb_set(skills, array[p_category], to_jsonb(v_new_skill1)),
    hacks_landed = CASE WHEN p_reason = 'successful_hack' AND p_winner_id = v_p1.id THEN hacks_landed + 1 ELSE hacks_landed END,
    hacks_defended = CASE WHEN p_reason = 'defended_hack' AND p_winner_id = v_p1.id THEN hacks_defended + 1 ELSE hacks_defended END
  WHERE id = v_p1.id;

  UPDATE public.profiles SET
    elo = v_new_elo2,
    peak_elo = greatest(peak_elo, v_new_elo2),
    tier = public.calculate_tier(v_new_elo2),
    matches_played = matches_played + 1,
    matches_won = CASE WHEN p_winner_id = v_p2.id THEN matches_won + 1 ELSE matches_won END,
    skills = jsonb_set(skills, array[p_category], to_jsonb(v_new_skill2)),
    hacks_landed = CASE WHEN p_reason = 'successful_hack' AND p_winner_id = v_p2.id THEN hacks_landed + 1 ELSE hacks_landed END,
    hacks_defended = CASE WHEN p_reason = 'defended_hack' AND p_winner_id = v_p2.id THEN hacks_defended + 1 ELSE hacks_defended END
  WHERE id = v_p2.id;

  UPDATE public.matches SET
    status = 'completed',
    winner_id = p_winner_id,
    player1_elo_delta = v_delta1,
    player2_elo_delta = v_delta2,
    replay_trace = p_replay_trace
  WHERE id = p_match_id;

  INSERT INTO public.duel_activity (player_id, duel_date, duel_count)
  VALUES (v_p1.id, current_date, 1)
  ON CONFLICT (player_id, duel_date) DO UPDATE SET duel_count = duel_activity.duel_count + 1;

  INSERT INTO public.duel_activity (player_id, duel_date, duel_count)
  VALUES (v_p2.id, current_date, 1)
  ON CONFLICT (player_id, duel_date) DO UPDATE SET duel_count = duel_activity.duel_count + 1;

  RETURN jsonb_build_object(
    'success', true,
    'player1_delta', v_delta1,
    'player2_delta', v_delta2,
    'new_elo1', v_new_elo1,
    'new_peak_elo1', greatest(v_p1.peak_elo, v_new_elo1),
    'new_elo2', v_new_elo2,
    'new_peak_elo2', greatest(v_p2.peak_elo, v_new_elo2)
  );
END;
$$;

-- 4. Matchmaking join or pair with repeat-opponent check
CREATE OR REPLACE FUNCTION public.matchmaking_join_or_pair(
  p_player_id uuid,
  p_elo integer,
  p_mode text default 'ranked_1v1'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opponent record;
  v_match_id uuid;
  v_problem_id uuid;
  v_ends_at timestamptz;
BEGIN
  SELECT * INTO v_opponent
  FROM public.matchmaking_queue mq
  WHERE mq.is_active = true
    AND mq.player_id <> p_player_id
    AND mq.mode = p_mode
    AND abs(mq.elo - p_elo) <= mq.search_band
    AND mq.last_heartbeat > now() - interval '10 seconds'
    AND NOT EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.status = 'completed'
        AND m.mode IN ('ranked', 'ranked_1v1')
        AND m.created_at > now() - interval '30 minutes'
        AND (
          (m.player1_id = p_player_id AND m.player2_id = mq.player_id)
          OR (m.player1_id = mq.player_id AND m.player2_id = p_player_id)
        )
    )
  ORDER BY mq.enqueued_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF FOUND THEN
    SELECT id INTO v_problem_id FROM public.problems ORDER BY random() LIMIT 1;
    v_ends_at := now() + interval '15 minutes';

    INSERT INTO public.matches (
      problem_id, player1_id, player2_id, mode, status,
      player1_elo_before, player2_elo_before, ends_at
    ) VALUES (
      v_problem_id, v_opponent.player_id, p_player_id, p_mode, 'in_progress',
      v_opponent.elo, p_elo, v_ends_at
    ) RETURNING id INTO v_match_id;

    UPDATE public.matchmaking_queue
    SET is_active = false
    WHERE player_id IN (p_player_id, v_opponent.player_id);

    RETURN jsonb_build_object(
      'matched', true,
      'match_id', v_match_id,
      'opponent_id', v_opponent.player_id
    );
  ELSE
    INSERT INTO public.matchmaking_queue (player_id, elo, search_band, mode, is_active, enqueued_at, last_heartbeat)
    VALUES (p_player_id, p_elo, 50, p_mode, true, now(), now())
    ON CONFLICT (player_id) DO UPDATE SET
      is_active = true,
      last_heartbeat = now(),
      search_band = excluded.search_band;

    RETURN jsonb_build_object('matched', false);
  END IF;
END;
$$;

-- 5. Matchmaking heartbeat with repeat-opponent check
CREATE OR REPLACE FUNCTION public.matchmaking_heartbeat(
  p_player_id uuid,
  p_band_increment integer default 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player record;
  v_opponent record;
  v_match_id uuid;
  v_problem_id uuid;
BEGIN
  UPDATE public.matchmaking_queue
  SET last_heartbeat = now(),
      search_band = least(search_band + p_band_increment, 500)
  WHERE player_id = p_player_id AND is_active = true
  RETURNING * INTO v_player;

  IF NOT FOUND THEN
    SELECT id INTO v_match_id FROM public.matches
    WHERE (player1_id = p_player_id OR player2_id = p_player_id)
      AND status = 'in_progress'
      AND created_at > now() - interval '30 seconds'
    ORDER BY created_at DESC LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object('matched', true, 'match_id', v_match_id);
    ELSE
      RETURN jsonb_build_object('matched', false, 'status', 'not_in_queue');
    END IF;
  END IF;

  SELECT * INTO v_opponent
  FROM public.matchmaking_queue mq
  WHERE mq.is_active = true
    AND mq.player_id <> p_player_id
    AND mq.mode = v_player.mode
    AND abs(mq.elo - v_player.elo) <= v_player.search_band
    AND mq.last_heartbeat > now() - interval '10 seconds'
    AND NOT EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.status = 'completed'
        AND m.mode IN ('ranked', 'ranked_1v1')
        AND m.created_at > now() - interval '30 minutes'
        AND (
          (m.player1_id = p_player_id AND m.player2_id = mq.player_id)
          OR (m.player1_id = mq.player_id AND m.player2_id = p_player_id)
        )
    )
  ORDER BY mq.enqueued_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF FOUND THEN
    SELECT id INTO v_problem_id FROM public.problems ORDER BY random() LIMIT 1;
    INSERT INTO public.matches (
      problem_id, player1_id, player2_id, mode, status,
      player1_elo_before, player2_elo_before, ends_at
    ) VALUES (
      v_problem_id, v_opponent.player_id, p_player_id, v_player.mode, 'in_progress',
      v_opponent.elo, v_player.elo, now() + interval '15 minutes'
    ) RETURNING id INTO v_match_id;

    UPDATE public.matchmaking_queue
    SET is_active = false
    WHERE player_id IN (p_player_id, v_opponent.player_id);

    RETURN jsonb_build_object('matched', true, 'match_id', v_match_id);
  END IF;

  RETURN jsonb_build_object('matched', false, 'search_band', v_player.search_band);
END;
$$;

