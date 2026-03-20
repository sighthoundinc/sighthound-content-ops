-- Add username column to profiles table for user name matching during imports
alter table public.profiles
  add column if not exists username text unique;

-- Create index on username for faster lookups
create index if not exists profiles_username_idx on public.profiles (username);

-- Temporarily disable trigger to allow system-level update
alter table public.profiles disable trigger profiles_enforce_update_permissions;

-- Populate username from email for existing users (username = part before @)
update public.profiles
set username = split_part(email, '@', 1)
where username is null and email is not null;

-- Re-enable trigger
alter table public.profiles enable trigger profiles_enforce_update_permissions;

notify pgrst, 'reload schema';
