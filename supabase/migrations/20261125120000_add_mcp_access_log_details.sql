-- JSON audit detail for MCP write tools: arguments, outcome, affected record.
-- Additive and nullable; reads and non-MCP events leave it null.
alter table public.access_logs
  add column if not exists details jsonb;

create index if not exists access_logs_mcp_changes_idx
  on public.access_logs (created_at desc)
  where details is not null;

notify pgrst, 'reload schema';
