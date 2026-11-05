alter table public.access_logs
  add column if not exists tool_name text;

alter table public.access_logs
  drop constraint if exists access_logs_event_type_check;

alter table public.access_logs
  add constraint access_logs_event_type_check
  check (event_type in ('login', 'dashboard_visit', 'mcp_tool_call'));

alter table public.access_logs
  drop constraint if exists access_logs_tool_name_check;

alter table public.access_logs
  add constraint access_logs_tool_name_check
  check (
    (
      event_type = 'mcp_tool_call'
      and tool_name is not null
      and char_length(trim(tool_name)) between 1 and 64
    )
    or (
      event_type <> 'mcp_tool_call'
      and tool_name is null
    )
  );

create index if not exists access_logs_tool_name_created_at_idx
  on public.access_logs (tool_name, created_at desc);
