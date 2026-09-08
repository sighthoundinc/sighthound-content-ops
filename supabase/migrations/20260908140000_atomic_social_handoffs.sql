alter table public.social_posts
  add column if not exists assigned_to_user_id uuid references public.profiles(id) on delete set null;

create or replace function public.social_stage_owner(
  p_status public.social_post_status, p_worker uuid, p_reviewer uuid
)
returns uuid language sql immutable set search_path = public
as $$
  select case p_status::text
    when 'draft' then p_worker
    when 'changes_requested' then p_worker
    when 'ready_to_publish' then p_worker
    when 'awaiting_live_link' then p_worker
    when 'in_review' then p_reviewer
    when 'creative_approved' then p_reviewer
    else null
  end;
$$;

-- Only backfill known owners. Never invent assignments for orphaned records.
update public.social_posts
set assigned_to_user_id = public.social_stage_owner(status,worker_user_id,reviewer_user_id)
where status::text <> 'published'
  and public.social_stage_owner(status,worker_user_id,reviewer_user_id) is not null
  and assigned_to_user_id is distinct from public.social_stage_owner(status,worker_user_id,reviewer_user_id);

create index if not exists social_posts_current_owner_idx
  on public.social_posts(assigned_to_user_id,status);

create or replace function public.enforce_social_handoff_authority()
returns trigger language plpgsql set search_path = public
as $$
declare
  status_changed boolean := tg_op = 'INSERT';
begin
  if tg_op = 'UPDATE' then
    status_changed := new.status is distinct from old.status;
    if new.created_by is distinct from old.created_by then
      raise exception using errcode='23514', message='Creator identity is immutable.';
    end if;
    if auth.role() is distinct from 'service_role' then
      if (new.worker_user_id is distinct from old.worker_user_id
        or new.reviewer_user_id is distinct from old.reviewer_user_id)
        and not coalesce(public.is_admin(),false) then
        raise exception using errcode='42501', message='Only admins can change social assignments.';
      end if;
      if status_changed and not coalesce(public.is_admin(),false)
        and public.social_stage_owner(old.status,old.worker_user_id,old.reviewer_user_id)
          is distinct from auth.uid() then
        raise exception using errcode='42501', message='Only the current stage owner can transition this post.';
      end if;
    end if;
  end if;

  new.assigned_to_user_id :=
    public.social_stage_owner(new.status,new.worker_user_id,new.reviewer_user_id);
  if new.status::text <> 'published' and new.assigned_to_user_id is null then
    raise exception using errcode='23514', message='Assign the next stage owner before continuing.';
  end if;

  if status_changed and new.status::text not in ('draft','changes_requested') then
    if new.product is null or new.type is null
      or coalesce(new.canva_url,'') !~* '^https?://[^/?#[:space:]]+([/?#][^[:space:]]*)?$' then
      raise exception using errcode='23514', message='Product, type, and a valid Canva URL are required.';
    end if;
    if new.status::text <> 'in_review' and (
      nullif(btrim(new.caption),'') is null
      or coalesce(cardinality(new.platforms),0) = 0
      or new.scheduled_date is null
    ) then
      raise exception using errcode='23514', message='Caption, platforms, and schedule are required.';
    end if;
  end if;
  return new;
end;
$$;

create trigger social_posts_handoff_authority
before insert or update on public.social_posts
for each row execute function public.enforce_social_handoff_authority();

create or replace function public.apply_social_post_transition(
  p_social_post_id uuid,
  p_from_status public.social_post_status,
  p_expected_updated_at timestamptz,
  p_to_status public.social_post_status,
  p_actor_id uuid,
  p_reason text default null,
  p_brief jsonb default '{}'::jsonb
)
returns public.social_posts
language plpgsql security definer set search_path = public
as $$
declare
  current_post public.social_posts;
  merged_post public.social_posts;
  result_post public.social_posts;
  actor_is_admin boolean;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode='42501', message='Server-only transition function.';
  end if;
  select * into current_post from public.social_posts
  where id=p_social_post_id for update;
  if not found then
    raise exception using errcode='P0002', message='Social post not found.';
  end if;
  if p_expected_updated_at is null
    or current_post.updated_at is distinct from p_expected_updated_at
    or current_post.status is distinct from p_from_status then
    raise exception using errcode='40001', message='Concurrent modification detected.';
  end if;
  select (p.role::text='admin' or 'admin'=any(coalesce(p.user_roles::text[],array[]::text[])))
  into actor_is_admin from public.profiles p
  where p.id=p_actor_id and p.is_active;
  if not found or p_actor_id is null then
    raise exception using errcode='42501', message='An active actor is required.';
  end if;
  if not coalesce(actor_is_admin,false)
    and public.social_stage_owner(current_post.status,current_post.worker_user_id,current_post.reviewer_user_id)
      is distinct from p_actor_id then
    raise exception using errcode='42501', message='Only the current stage owner can transition this post.';
  end if;
  if p_to_status is null or p_to_status = current_post.status then
    raise exception using errcode='23514', message='A different target status is required.';
  end if;
  if p_brief is null or jsonb_typeof(p_brief) <> 'object' then
    raise exception using errcode='23514', message='Invalid brief payload.';
  end if;
  if exists(select 1 from jsonb_object_keys(p_brief) k
    where k not in ('title','product','type','canva_url','canva_page','caption','platforms','scheduled_date','associated_blog_id')) then
    raise exception using errcode='23514', message='Unsupported brief field.';
  end if;
  if current_post.status::text in ('ready_to_publish','awaiting_live_link')
    and p_brief <> '{}'::jsonb then
    raise exception using errcode='23514', message='Execution brief fields are locked.';
  end if;
  merged_post := jsonb_populate_record(current_post,p_brief);
  perform set_config('app.social_transition_actor_id',p_actor_id::text,true);
  perform set_config('app.social_transition_reason',coalesce(nullif(btrim(p_reason),''),''),true);
  perform set_config('app.social_brief_reopen','false',true);
  update public.social_posts set
    status=p_to_status,
    title=merged_post.title, product=merged_post.product, type=merged_post.type,
    canva_url=merged_post.canva_url, canva_page=merged_post.canva_page,
    caption=merged_post.caption, platforms=merged_post.platforms,
    scheduled_date=merged_post.scheduled_date, associated_blog_id=merged_post.associated_blog_id
  where id=p_social_post_id returning * into result_post;
  -- Existing audit trigger writes actor, reason, and status in this transaction.
  return result_post;
end;
$$;

revoke all on function public.apply_social_post_transition(uuid,public.social_post_status,timestamptz,public.social_post_status,uuid,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_social_post_transition(uuid,public.social_post_status,timestamptz,public.social_post_status,uuid,text,jsonb)
  to service_role;
notify pgrst, 'reload schema';
