-- Create access_logs table for tracking login and dashboard visits
-- Admin-only visibility

create table if not exists access_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('login', 'dashboard_visit')),
  created_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table access_logs enable row level security;

-- RLS Policy: Admin-only read access
create policy "Admin can view all access logs"
  on access_logs
  for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Create index for efficient querying
create index idx_access_logs_user_id on access_logs(user_id);
create index idx_access_logs_created_at on access_logs(created_at desc);
create index idx_access_logs_event_type on access_logs(event_type);
