-- Ask AI telemetry table.
-- Minimal observability signal — no prompt text, no answer text, no PII beyond user_id.
-- Admins can read the full table; non-admin users have no read access.
-- Inserts come exclusively from the service role (see src/app/api/ai/utils/telemetry.ts).

create table if not exists public.ai_assistant_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null,
  entity_id uuid null,
  intent text not null,
  response_source text not null check (response_source in ('deterministic', 'gemini', 'cache')),
  model text null,
  latency_ms integer not null default 0,
  had_error boolean not null default false,
  cached boolean not null default false,
  validator_failed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_assistant_events_created_at_idx
  on public.ai_assistant_events (created_at desc);
create index if not exists ai_assistant_events_user_id_idx
  on public.ai_assistant_events (user_id);
create index if not exists ai_assistant_events_intent_idx
  on public.ai_assistant_events (intent);

alter table public.ai_assistant_events enable row level security;

-- Admins can read everything.
drop policy if exists "ai_assistant_events_admin_read" on public.ai_assistant_events;
create policy "ai_assistant_events_admin_read"
  on public.ai_assistant_events
  for select
  to authenticated
  using (public.has_profile_role('admin'::public.app_role));

-- No insert / update / delete policies — writes come via service role only.
