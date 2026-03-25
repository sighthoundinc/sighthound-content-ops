-- Re-enable RLS on public operational and audit tables.
-- service_role already bypasses RLS, so maintenance APIs remain functional.

alter table public.blog_assignment_history enable row level security;
alter table public.blog_comments enable row level security;
alter table public.permission_audit_logs enable row level security;
alter table public.social_post_activity_history enable row level security;
alter table public.social_post_comments enable row level security;
alter table public.blog_import_logs enable row level security;

drop policy if exists "Blog import logs readable by system log viewers" on public.blog_import_logs;
create policy "Blog import logs readable by system log viewers"
on public.blog_import_logs
for select
to authenticated
using (public.has_permission('view_system_logs'));

drop policy if exists "Blog import logs insertable by import runners" on public.blog_import_logs;
create policy "Blog import logs insertable by import runners"
on public.blog_import_logs
for insert
to authenticated
with check (
  public.has_permission('run_data_import')
  and coalesce(imported_by, auth.uid()) = auth.uid()
);

notify pgrst, 'reload schema';
