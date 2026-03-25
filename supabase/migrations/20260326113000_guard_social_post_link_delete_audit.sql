create or replace function public.audit_social_post_link_changes()
returns trigger
language plpgsql
as $$
declare
  post_id uuid;
  effective_actor uuid;
begin
  effective_actor := coalesce(public.get_social_transition_actor(), auth.uid());

  if tg_op = 'INSERT' then
    post_id := new.social_post_id;
    perform public.log_social_post_activity(
      post_id,
      effective_actor,
      'social_post_live_link_submitted',
      new.platform::text,
      null,
      new.url
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    post_id := new.social_post_id;
    if new.url is distinct from old.url then
      perform public.log_social_post_activity(
        post_id,
        effective_actor,
        'social_post_live_link_submitted',
        new.platform::text,
        old.url,
        new.url
      );
    end if;
    return new;
  end if;

  post_id := old.social_post_id;

  -- Cascading deletes from social_posts can remove the parent row before this
  -- child-row delete trigger logs activity. Skip orphan logging to prevent FK failures.
  if exists (
    select 1
    from public.social_posts
    where id = post_id
  ) then
    perform public.log_social_post_activity(
      post_id,
      effective_actor,
      'social_post_live_link_removed',
      old.platform::text,
      old.url,
      null
    );
  end if;

  return old;
end
$$;

notify pgrst, 'reload schema';
