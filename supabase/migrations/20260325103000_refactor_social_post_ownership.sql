-- Clean ownership model for social posts
-- Before: editor_user_id was overloaded (sometimes worker, sometimes reviewer depending on creator role)
-- After: Explicit worker_user_id and reviewer_user_id

-- 1. Add new explicit ownership fields
alter table public.social_posts
  add column if not exists worker_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists reviewer_user_id uuid references public.profiles (id) on delete set null;

-- 2. Backfill data based on creator role
-- Case 1: If creator is admin → editor_user_id becomes worker_user_id, creator becomes reviewer
-- Case 2: If creator is non-admin → created_by becomes worker_user_id, editor_user_id becomes reviewer
update public.social_posts sp
set
  worker_user_id = case
    when p.role = 'admin' then sp.editor_user_id  -- admin created: assigned person is the worker
    else sp.created_by                             -- non-admin created: they are the worker
  end,
  reviewer_user_id = case
    when p.role = 'admin' then sp.created_by       -- admin created: admin is the reviewer
    else sp.editor_user_id                         -- non-admin created: assigned admin is the reviewer
  end
from public.profiles p
where p.id = sp.created_by;

-- 3. Add indexes for common queries
create index if not exists social_posts_worker_user_idx
  on public.social_posts (worker_user_id, status, updated_at desc);
create index if not exists social_posts_reviewer_user_idx
  on public.social_posts (reviewer_user_id, status, updated_at desc);

-- 4. Add comments to clarify the model
comment on column public.social_posts.created_by is 'Who created the post (admin or non-admin)';
comment on column public.social_posts.worker_user_id is 'Who executes the work (creator if non-admin, assigned if admin-created)';
comment on column public.social_posts.reviewer_user_id is 'Who reviews and approves (always admin)';
comment on column public.social_posts.editor_user_id is '[DEPRECATED] Use worker_user_id and reviewer_user_id instead';
comment on column public.social_posts.admin_owner_id is '[DEPRECATED] No longer used, kept for backward compatibility';

-- 5. Update the activity history comment to reflect new model
comment on table public.social_post_activity_history is 'Audit trail for social post changes. Uses worker_user_id and reviewer_user_id for clear ownership tracking.';
