create table if not exists public.blog_import_logs (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid references public.profiles (id) on delete set null,
  imported_at timestamptz not null default timezone('utc', now()),
  file_name text,
  rows_created integer not null default 0,
  rows_updated integer not null default 0,
  rows_failed integer not null default 0
);

create index if not exists blog_import_logs_imported_at_idx
  on public.blog_import_logs (imported_at desc);

notify pgrst, 'reload schema';
