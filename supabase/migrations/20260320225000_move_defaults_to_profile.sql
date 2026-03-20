-- Add week_start and stale_draft_days to profiles table
alter table public.profiles
add column if not exists week_start smallint default 1 not null,
add column if not exists stale_draft_days integer default 10 not null;

-- Add constraints
alter table public.profiles
add constraint profiles_week_start_valid check (week_start between 0 and 6),
add constraint profiles_stale_draft_days_valid check (stale_draft_days between 1 and 120);
