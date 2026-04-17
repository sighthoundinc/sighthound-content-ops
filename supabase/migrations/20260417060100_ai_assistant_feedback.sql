-- Ask AI feedback table.
-- One row per user thumbs-up / thumbs-down on a response.
-- Users can only see / insert their own rows; admins can read everything.

create table if not exists public.ai_assistant_feedback (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null,
  entity_id uuid null,
  intent text null,
  response_source text null,
  thumbs text not null check (thumbs in ('up', 'down')),
  comment text null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_assistant_feedback_created_at_idx
  on public.ai_assistant_feedback (created_at desc);
create index if not exists ai_assistant_feedback_user_id_idx
  on public.ai_assistant_feedback (user_id);

alter table public.ai_assistant_feedback enable row level security;

drop policy if exists "ai_assistant_feedback_self_read" on public.ai_assistant_feedback;
create policy "ai_assistant_feedback_self_read"
  on public.ai_assistant_feedback
  for select
  to authenticated
  using (user_id = auth.uid() or public.has_profile_role('admin'::public.app_role));

drop policy if exists "ai_assistant_feedback_self_insert" on public.ai_assistant_feedback;
create policy "ai_assistant_feedback_self_insert"
  on public.ai_assistant_feedback
  for insert
  to authenticated
  with check (user_id = auth.uid());
