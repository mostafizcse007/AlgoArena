-- Migration: 20261029000001_unconfirmed_users_username_fix.sql
-- Fix: Prevent unconfirmed / failed signup attempts from locking usernames permanently

-- 1. Update check_username_available to only treat CONFIRMED users or demo users as occupying a username
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
    select 1
    from public.profiles p
    left join auth.users u on u.id = p.id
    where lower(p.username) = lower(trim(p_username))
      and (u.email_confirmed_at is not null or u.id is null)
  );
end;
$$;

-- 2. Update resolve_email_by_username to prefer confirmed accounts
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
  where lower(p.username) = lower(trim(p_username))
  order by (u.email_confirmed_at is not null) desc, u.created_at desc
  limit 1;
  return v_email;
end;
$$;

-- 3. Update handle_new_user so that profiles are only created when email is confirmed
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_univ text;
  v_base_username text;
  v_counter integer := 1;
begin
  -- Only activate profile if email is confirmed (or in auto-confirm environments)
  if new.email_confirmed_at is null then
    return new;
  end if;

  v_base_username := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), 'coder_' || substr(new.id::text, 1, 8));
  v_username := v_base_username;
  v_univ := coalesce(nullif(trim(new.raw_user_meta_data->>'university'), ''), 'Independent');

  -- If any unconfirmed orphaned profile is holding this username, release it
  update public.profiles
  set username = 'unconfirmed_' || substr(id::text, 1, 8)
  where lower(username) = lower(v_username)
    and id in (
      select u.id from auth.users u where u.email_confirmed_at is null
    );

  -- In case another confirmed user already holds this exact username, generate unique suffix
  while exists (select 1 from public.profiles where lower(username) = lower(v_username) and id != new.id) loop
    v_username := v_base_username || '_' || v_counter;
    v_counter := v_counter + 1;
  end loop;

  insert into public.profiles (id, username, display_name, university, elo, peak_elo, tier)
  values (new.id, v_username, v_username, v_univ, 1200, 1200, 'Pupil')
  on conflict (id) do update set
    username = excluded.username,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    university = coalesce(public.profiles.university, excluded.university),
    updated_at = now();

  return new;
end;
$$;

-- 4. Update trigger to fire on INSERT and on UPDATE of email_confirmed_at
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.handle_new_user();

