alter table public.profiles
add column if not exists timezone text default 'America/New_York' not null;
