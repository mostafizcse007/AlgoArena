-- AlgoArena Core Schema Migration
-- Strictly adheres to PostgreSQL 17, RLS, and SECURITY DEFINER search_path standards

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  university text not null default 'Independent',
  bio text default 'Entering the arena...',
  avatar_url text,
  elo integer not null default 1200,
  peak_elo integer not null default 1200,
  tier text not null default 'Pupil',
  matches_played integer not null default 0,
  matches_won integer not null default 0,
  hacks_landed integer not null default 0,
  hacks_defended integer not null default 0,
  skills jsonb not null default '{"graphs": 1200, "dp": 1200, "greedy": 1200, "two_pointers": 1200, "data_structures": 1200}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tier calculation function
create or replace function public.calculate_tier(p_elo integer)
returns text as $$
begin
  if p_elo < 1200 then return 'Newbie';
  elsif p_elo < 1400 then return 'Pupil';
  elsif p_elo < 1600 then return 'Specialist';
  elsif p_elo < 1900 then return 'Expert';
  else return 'Grandmaster';
  end if;
end;
$$ language plpgsql immutable;

-- 2. PROBLEMS TABLE (With Sabotage & Visualizer Columns)
create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  category text not null check (category in ('graphs', 'dp', 'greedy', 'two_pointers', 'data_structures')),
  description text not null,
  constraints jsonb not null,
  public_samples jsonb not null,
  starter_code jsonb not null,
  oracle_solution text not null,
  visualizer_type text not null default 'graph' check (visualizer_type in ('graph', 'dp_grid', 'two_pointers')),
  buggy_sabotage_code text not null,
  input_validator text not null,
  created_at timestamptz not null default now()
);

-- 3. SECRET TESTS TABLE (RLS Locked - No Direct Client Access)
create table if not exists public.problem_secret_tests (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  input jsonb not null,
  expected_output jsonb not null,
  is_hidden boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. MATCHES TABLE (player2_id and player2_elo_before are NULLABLE for Custom Rooms & Demo Duels)
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id),
  player1_id uuid not null references public.profiles(id),
  player2_id uuid references public.profiles(id),
  mode text not null check (mode in ('ranked_1v1', 'custom_duel', 'sabotage')),
  room_code text,
  status text not null check (status in ('waiting', 'in_progress', 'completed', 'forfeited', 'cancelled')) default 'in_progress',
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  winner_id uuid references public.profiles(id),
  player1_elo_before integer not null,
  player2_elo_before integer,
  player1_elo_delta integer,
  player2_elo_delta integer,
  replay_trace jsonb,
  created_at timestamptz not null default now()
);

-- 5. MATCH SUBMISSIONS & HACKS
create table if not exists public.match_submissions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id),
  code text not null,
  status text not null check (status in ('pending', 'passed', 'failed', 'tle', 'error')),
  tests_passed integer not null default 0,
  total_tests integer not null default 0,
  execution_time_ms integer not null default 0,
  trace_summary jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.match_hacks (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  attacker_id uuid not null references public.profiles(id),
  defender_id uuid not null references public.profiles(id),
  adversarial_input jsonb not null,
  result text not null check (result in ('pending', 'successful_hack', 'defended_invalid', 'defended_passed')),
  attacker_oracle_output jsonb,
  defender_output jsonb,
  created_at timestamptz not null default now()
);

-- 6. MATCHMAKING QUEUE & DUEL ACTIVITY
create table if not exists public.matchmaking_queue (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  elo integer not null,
  search_band integer not null default 50,
  mode text not null default 'ranked_1v1',
  is_active boolean not null default true,
  enqueued_at timestamptz not null default now(),
  last_heartbeat timestamptz not null default now()
);

create table if not exists public.duel_activity (
  player_id uuid not null references public.profiles(id) on delete cascade,
  duel_date date not null default current_date,
  duel_count integer not null default 1,
  primary key (player_id, duel_date)
);

-- 7. PERFORMANCE INDEXES
create index if not exists idx_profiles_leaderboard on public.profiles (elo desc, matches_won desc);
create index if not exists idx_profiles_university on public.profiles (university, elo desc);
create index if not exists idx_matches_players on public.matches (player1_id, player2_id, created_at desc);
create index if not exists idx_matches_room_code on public.matches (room_code) where room_code is not null;
create index if not exists idx_matchmaking_queue_search on public.matchmaking_queue (mode, elo, search_band) where is_active = true;

-- 8. ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.problems enable row level security;
alter table public.problem_secret_tests enable row level security;
alter table public.matches enable row level security;
alter table public.match_submissions enable row level security;
alter table public.match_hacks enable row level security;
alter table public.matchmaking_queue enable row level security;
alter table public.duel_activity enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Problems Policies
create policy "Public problems are viewable by everyone" on public.problems for select using (true);

-- Matches Policies
create policy "Matches viewable by everyone" on public.matches for select using (true);
create policy "Authenticated users can insert matches" on public.matches for insert with check (auth.uid() = player1_id);
create policy "Participants can update matches" on public.matches for update using (
  auth.uid() = player1_id or auth.uid() = player2_id or status = 'waiting'
);

-- Submissions & Hacks Policies
create policy "Submissions viewable by participants" on public.match_submissions for select using (
  auth.uid() = player_id or exists (
    select 1 from public.matches m where m.id = match_id and (m.player1_id = auth.uid() or m.player2_id = auth.uid())
  )
);
create policy "Users can insert own submissions" on public.match_submissions for insert with check (auth.uid() = player_id);

create policy "Hacks viewable by match participants" on public.match_hacks for select using (
  auth.uid() = attacker_id or auth.uid() = defender_id
);
create policy "Users can insert hacks" on public.match_hacks for insert with check (auth.uid() = attacker_id);

-- Queue & Duel Activity Policies
create policy "Queue viewable and editable by owner" on public.matchmaking_queue for all using (auth.uid() = player_id);
create policy "Duel activity viewable by everyone" on public.duel_activity for select using (true);

-- 9. ATOMIC PL/PGSQL RPC FUNCTIONS (Strictly with SET search_path = public)

-- Check username availability
create or replace function public.check_username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(trim(p_username)) < 3 or length(trim(p_username)) > 20 then
    return false;
  end if;
  return not exists (
    select 1 from public.profiles where lower(username) = lower(trim(p_username))
  );
end;
$$;

-- Resolve email by username for dual login
create or replace function public.resolve_email_by_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select u.email into v_email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(trim(p_username));
  return v_email;
end;
$$;

-- Create custom duel private room
create or replace function public.create_custom_room(
  p_player_id uuid,
  p_problem_id uuid,
  p_mode text default 'custom_duel'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_code text;
  v_match_id uuid;
  v_p1_elo integer;
begin
  select elo into v_p1_elo from public.profiles where id = p_player_id;
  if not found then
    v_p1_elo := 1200;
  end if;

  v_room_code := 'ALGO-' || upper(substr(md5(random()::text), 1, 3));

  insert into public.matches (
    problem_id, player1_id, player2_id, mode, room_code, status,
    player1_elo_before, ends_at
  ) values (
    p_problem_id, p_player_id, null, p_mode, v_room_code, 'waiting',
    v_p1_elo, now() + interval '30 minutes'
  ) returning id into v_match_id;

  return jsonb_build_object(
    'match_id', v_match_id,
    'room_code', v_room_code
  );
end;
$$;

-- Join custom duel private room
create or replace function public.join_custom_room(
  p_player_id uuid,
  p_room_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_p2_elo integer;
begin
  select * into v_match
  from public.matches
  where upper(room_code) = upper(trim(p_room_code))
    and status = 'waiting'
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Room not found or match already started');
  end if;

  if v_match.player1_id = p_player_id then
    return jsonb_build_object('success', true, 'match_id', v_match.id, 'is_host', true);
  end if;

  select elo into v_p2_elo from public.profiles where id = p_player_id;
  if not found then
    v_p2_elo := 1200;
  end if;

  update public.matches
  set player2_id = p_player_id,
      player2_elo_before = v_p2_elo,
      status = 'in_progress',
      started_at = now(),
      ends_at = now() + interval '15 minutes'
  where id = v_match.id;

  return jsonb_build_object(
    'success', true,
    'match_id', v_match.id,
    'is_host', false
  );
end;
$$;

-- Atomic Matchmaking Queue Pairing
create or replace function public.matchmaking_join_or_pair(
  p_player_id uuid,
  p_elo integer,
  p_mode text default 'ranked_1v1'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opponent record;
  v_match_id uuid;
  v_problem_id uuid;
  v_ends_at timestamptz;
begin
  select * into v_opponent
  from public.matchmaking_queue
  where is_active = true
    and player_id <> p_player_id
    and mode = p_mode
    and abs(elo - p_elo) <= search_band
    and last_heartbeat > now() - interval '10 seconds'
  order by enqueued_at asc
  for update skip locked
  limit 1;

  if found then
    select id into v_problem_id from public.problems order by random() limit 1;
    v_ends_at := now() + interval '15 minutes';

    insert into public.matches (
      problem_id, player1_id, player2_id, mode, status,
      player1_elo_before, player2_elo_before, ends_at
    ) values (
      v_problem_id, v_opponent.player_id, p_player_id, p_mode, 'in_progress',
      v_opponent.elo, p_elo, v_ends_at
    ) returning id into v_match_id;

    update public.matchmaking_queue
    set is_active = false
    where player_id in (p_player_id, v_opponent.player_id);

    return jsonb_build_object(
      'matched', true,
      'match_id', v_match_id,
      'opponent_id', v_opponent.player_id
    );
  else
    insert into public.matchmaking_queue (player_id, elo, search_band, mode, is_active, enqueued_at, last_heartbeat)
    values (p_player_id, p_elo, 50, p_mode, true, now(), now())
    on conflict (player_id) do update set
      is_active = true,
      last_heartbeat = now(),
      search_band = excluded.search_band;

    return jsonb_build_object('matched', false);
  end if;
end;
$$;

-- Matchmaking Heartbeat with Band Widening
create or replace function public.matchmaking_heartbeat(
  p_player_id uuid,
  p_band_increment integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player record;
  v_opponent record;
  v_match_id uuid;
  v_problem_id uuid;
begin
  update public.matchmaking_queue
  set last_heartbeat = now(),
      search_band = least(search_band + p_band_increment, 500)
  where player_id = p_player_id and is_active = true
  returning * into v_player;

  if not found then
    select id into v_match_id from public.matches
    where (player1_id = p_player_id or player2_id = p_player_id)
      and status = 'in_progress'
      and created_at > now() - interval '30 seconds'
    order by created_at desc limit 1;

    if found then
      return jsonb_build_object('matched', true, 'match_id', v_match_id);
    else
      return jsonb_build_object('matched', false, 'status', 'not_in_queue');
    end if;
  end if;

  select * into v_opponent
  from public.matchmaking_queue
  where is_active = true
    and player_id <> p_player_id
    and mode = v_player.mode
    and abs(elo - v_player.elo) <= v_player.search_band
    and last_heartbeat > now() - interval '10 seconds'
  order by enqueued_at asc
  for update skip locked
  limit 1;

  if found then
    select id into v_problem_id from public.problems order by random() limit 1;
    insert into public.matches (
      problem_id, player1_id, player2_id, mode, status,
      player1_elo_before, player2_elo_before, ends_at
    ) values (
      v_problem_id, v_opponent.player_id, p_player_id, v_player.mode, 'in_progress',
      v_opponent.elo, v_player.elo, now() + interval '15 minutes'
    ) returning id into v_match_id;

    update public.matchmaking_queue
    set is_active = false
    where player_id in (p_player_id, v_opponent.player_id);

    return jsonb_build_object('matched', true, 'match_id', v_match_id);
  end if;

  return jsonb_build_object('matched', false, 'search_band', v_player.search_band);
end;
$$;

-- Leave matchmaking queue
create or replace function public.matchmaking_leave(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matchmaking_queue set is_active = false where player_id = p_player_id;
end;
$$;

-- Get Problem Eval Bundle
create or replace function public.get_problem_eval_bundle(p_problem_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prob record;
  v_secret_tests jsonb;
begin
  select * into v_prob from public.problems where id = p_problem_id;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'input', input,
    'expected_output', expected_output
  )), '[]'::jsonb)
  into v_secret_tests
  from public.problem_secret_tests
  where problem_id = p_problem_id;

  return jsonb_build_object(
    'id', v_prob.id,
    'title', v_prob.title,
    'category', v_prob.category,
    'difficulty', v_prob.difficulty,
    'visualizer_type', v_prob.visualizer_type,
    'oracle_solution', v_prob.oracle_solution,
    'buggy_sabotage_code', v_prob.buggy_sabotage_code,
    'input_validator', v_prob.input_validator,
    'public_samples', v_prob.public_samples,
    'secret_tests', v_secret_tests
  );
end;
$$;

-- Settle Match with Replay Trace, Category Skill Updates, Sabotage Stats, and Demo Support
create or replace function public.settle_match(
  p_match_id uuid,
  p_winner_id uuid default null,
  p_reason text default 'normal',
  p_replay_trace jsonb default '[]'::jsonb,
  p_category text default 'graphs'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
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
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Match not found');
  end if;

  if v_match.status = 'completed' then
    return jsonb_build_object('success', false, 'error', 'Match already completed');
  end if;

  select * into v_p1 from public.profiles where id = v_match.player1_id for update;

  -- Check if Single Player Demo or Practice Duel
  if v_match.player2_id is null then
    if p_winner_id = v_p1.id then
      v_delta1 := 15;
    else
      v_delta1 := 0;
    end if;

    v_new_elo1 := v_p1.elo + v_delta1;

    v_curr_skill1 := coalesce((v_p1.skills->>p_category)::integer, 1200);
    v_new_skill1 := greatest(100, v_curr_skill1 + v_delta1);

    update public.profiles set
      elo = v_new_elo1,
      peak_elo = greatest(peak_elo, v_new_elo1),
      tier = public.calculate_tier(v_new_elo1),
      matches_played = matches_played + 1,
      matches_won = case when p_winner_id = v_p1.id then matches_won + 1 else matches_won end,
      skills = jsonb_set(skills, array[p_category], to_jsonb(v_new_skill1)),
      hacks_landed = case when p_reason = 'successful_hack' and p_winner_id = v_p1.id then hacks_landed + 1 else hacks_landed end
    where id = v_p1.id;

    update public.matches set
      status = 'completed',
      winner_id = p_winner_id,
      player1_elo_delta = v_delta1,
      replay_trace = p_replay_trace
    where id = p_match_id;

    insert into public.duel_activity (player_id, duel_date, duel_count)
    values (v_p1.id, current_date, 1)
    on conflict (player_id, duel_date) do update set duel_count = duel_activity.duel_count + 1;

    return jsonb_build_object(
      'success', true,
      'is_demo', true,
      'player1_delta', v_delta1,
      'new_elo1', v_new_elo1
    );
  end if;

  -- 2-Player Match
  select * into v_p2 from public.profiles where id = v_match.player2_id for update;

  v_expected1 := 1.0 / (1.0 + power(10.0, (coalesce(v_match.player2_elo_before, v_p2.elo) - v_match.player1_elo_before)::float / 400.0));
  v_expected2 := 1.0 - v_expected1;

  if p_winner_id = v_match.player1_id then
    v_actual1 := 1.0; v_actual2 := 0.0;
  elsif p_winner_id = v_match.player2_id then
    v_actual1 := 0.0; v_actual2 := 1.0;
  else
    v_actual1 := 0.5; v_actual2 := 0.5;
  end if;

  v_delta1 := round(v_k * (v_actual1 - v_expected1));
  v_delta2 := round(v_k * (v_actual2 - v_expected2));

  v_new_elo1 := greatest(100, v_p1.elo + v_delta1);
  v_new_elo2 := greatest(100, v_p2.elo + v_delta2);

  v_curr_skill1 := coalesce((v_p1.skills->>p_category)::integer, 1200);
  v_curr_skill2 := coalesce((v_p2.skills->>p_category)::integer, 1200);
  v_new_skill1 := greatest(100, v_curr_skill1 + v_delta1);
  v_new_skill2 := greatest(100, v_curr_skill2 + v_delta2);

  update public.profiles set
    elo = v_new_elo1,
    peak_elo = greatest(peak_elo, v_new_elo1),
    tier = public.calculate_tier(v_new_elo1),
    matches_played = matches_played + 1,
    matches_won = case when p_winner_id = v_p1.id then matches_won + 1 else matches_won end,
    skills = jsonb_set(skills, array[p_category], to_jsonb(v_new_skill1)),
    hacks_landed = case when p_reason = 'successful_hack' and p_winner_id = v_p1.id then hacks_landed + 1 else hacks_landed end,
    hacks_defended = case when p_reason = 'defended_hack' and p_winner_id = v_p1.id then hacks_defended + 1 else hacks_defended end
  where id = v_p1.id;

  update public.profiles set
    elo = v_new_elo2,
    peak_elo = greatest(peak_elo, v_new_elo2),
    tier = public.calculate_tier(v_new_elo2),
    matches_played = matches_played + 1,
    matches_won = case when p_winner_id = v_p2.id then matches_won + 1 else matches_won end,
    skills = jsonb_set(skills, array[p_category], to_jsonb(v_new_skill2)),
    hacks_landed = case when p_reason = 'successful_hack' and p_winner_id = v_p2.id then hacks_landed + 1 else hacks_landed end,
    hacks_defended = case when p_reason = 'defended_hack' and p_winner_id = v_p2.id then hacks_defended + 1 else hacks_defended end
  where id = v_p2.id;

  update public.matches set
    status = 'completed',
    winner_id = p_winner_id,
    player1_elo_delta = v_delta1,
    player2_elo_delta = v_delta2,
    replay_trace = p_replay_trace
  where id = p_match_id;

  insert into public.duel_activity (player_id, duel_date, duel_count)
  values (v_p1.id, current_date, 1)
  on conflict (player_id, duel_date) do update set duel_count = duel_activity.duel_count + 1;

  insert into public.duel_activity (player_id, duel_date, duel_count)
  values (v_p2.id, current_date, 1)
  on conflict (player_id, duel_date) do update set duel_count = duel_activity.duel_count + 1;

  return jsonb_build_object(
    'success', true,
    'is_demo', false,
    'player1_delta', v_delta1,
    'player2_delta', v_delta2,
    'new_elo1', v_new_elo1,
    'new_elo2', v_new_elo2
  );
end;
$$;

-- User Creation Trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_univ text;
begin
  v_username := coalesce(new.raw_user_meta_data->>'username', 'coder_' || substr(new.id::text, 1, 8));
  v_univ := coalesce(new.raw_user_meta_data->>'university', 'Independent');

  insert into public.profiles (id, username, display_name, university, elo, peak_elo, tier)
  values (new.id, v_username, v_username, v_univ, 1200, 1200, 'Pupil')
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 10. STORAGE BUCKET & RLS POLICIES (Both INSERT and UPDATE for upsert: true)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own avatar"
  on storage.objects for update using (
    bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 11. SUPABASE REALTIME PUBLICATION
alter publication supabase_realtime add table
  public.matches,
  public.matchmaking_queue,
  public.match_submissions,
  public.match_hacks,
  public.profiles;
