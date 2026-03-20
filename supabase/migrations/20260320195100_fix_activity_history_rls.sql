-- Disable RLS on activity history tables to allow admin cleanup via service_role
-- These are maintenance-only tables accessed by admins through server-side APIs
-- RLS prevents service_role deletions, so we disable it for these audit/history tables

alter table public.blog_assignment_history disable row level security;
alter table public.social_post_activity_history disable row level security;
alter table public.permission_audit_logs disable row level security;
alter table public.blog_comments disable row level security;
alter table public.social_post_comments disable row level security;
