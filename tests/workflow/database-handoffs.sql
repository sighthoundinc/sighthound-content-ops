\set ON_ERROR_STOP on
begin;
set local request.jwt.claim.role='service_role';
insert into auth.users(id,email,raw_user_meta_data) values
('10000000-0000-4000-8000-000000000001','worker@workflow.invalid','{"full_name":"Worker"}'),
('10000000-0000-4000-8000-000000000002','reviewer@workflow.invalid','{"full_name":"Reviewer"}'),
('10000000-0000-4000-8000-000000000003','stranger@workflow.invalid','{"full_name":"Stranger"}');
update public.profiles set role='writer',user_roles='{}',is_admin=false
where id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003');
update public.profiles set role='admin',user_roles='{admin}',is_admin=true
where id='10000000-0000-4000-8000-000000000002';
insert into public.social_posts
(id,title,product,type,status,created_by,worker_user_id,reviewer_user_id,
canva_url,caption,platforms,scheduled_date) values
('20000000-0000-4000-8000-000000000001','Handoff regression','redactor','image','draft',
'10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
'10000000-0000-4000-8000-000000000002','https://www.canva.com/design/test',
'Approved',array['linkedin']::public.social_platform[],'2026-09-08');
set local role service_role;
do $$
declare
  row_before public.social_posts;
  result_row public.social_posts;
  next_status text;
  expected_owner uuid;
  worker constant uuid := '10000000-0000-4000-8000-000000000001';
  reviewer constant uuid := '10000000-0000-4000-8000-000000000002';
  post_id constant uuid := '20000000-0000-4000-8000-000000000001';
begin
  select * into row_before from public.social_posts where id=post_id;
  if row_before.assigned_to_user_id is distinct from worker then
    raise exception 'Draft ownership not persisted';
  end if;
  begin
    perform public.apply_social_post_transition(post_id,'draft',row_before.updated_at,'in_review',
      '10000000-0000-4000-8000-000000000003');
    raise exception 'Stranger transitioned the post';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.apply_social_post_transition(post_id,'draft','2000-01-01','in_review',worker);
    raise exception 'Stale version accepted';
  exception when serialization_failure then null;
  end;
  begin
    perform public.apply_social_post_transition(post_id,'draft',row_before.updated_at,'in_review',
      worker,null,'{"canva_url":null}');
    raise exception 'Missing required Canva URL accepted';
  exception when check_violation then null;
  end;
  update public.social_posts set reviewer_user_id=null where id=post_id;
  select * into row_before from public.social_posts where id=post_id;
  begin
    perform public.apply_social_post_transition(post_id,'draft',row_before.updated_at,'in_review',worker);
    raise exception 'Missing next owner accepted';
  exception when check_violation then null;
  end;
  update public.social_posts set reviewer_user_id=reviewer where id=post_id;

  foreach next_status in array array[
    'in_review','changes_requested','in_review','creative_approved','ready_to_publish',
    'changes_requested','in_review','creative_approved','ready_to_publish','awaiting_live_link',
    'changes_requested','in_review','creative_approved','ready_to_publish','awaiting_live_link','published'
  ] loop
    select * into row_before from public.social_posts where id=post_id;
    if next_status='published' then
      insert into public.social_post_links(social_post_id,platform,url,created_by)
      values(post_id,'linkedin','https://www.linkedin.com/posts/test',worker);
    end if;
    result_row := public.apply_social_post_transition(
      post_id,row_before.status,row_before.updated_at,next_status::public.social_post_status,
      row_before.assigned_to_user_id,
      case when next_status='changes_requested' then 'Regression rollback' else null end);
    expected_owner := case when next_status='published' then null
      when next_status in ('in_review','creative_approved') then reviewer else worker end;
    if result_row.status::text <> next_status
      or result_row.assigned_to_user_id is distinct from expected_owner then
      raise exception 'Incorrect persisted handoff to %',next_status;
    end if;
    if not exists(select 1 from public.social_post_activity_history
      where social_post_id=post_id and changed_by=row_before.assigned_to_user_id
        and event_type='social_post_status_changed' and old_value=row_before.status::text
        and new_value=next_status
        and (next_status<>'changes_requested' or metadata->>'reason'='Regression rollback')) then
      raise exception 'Missing transaction history for %',next_status;
    end if;
  end loop;
end $$;
reset role;
rollback;
\echo 'PASS: atomic ownership, rollback reason/history, actor checks, required fields, and stale versions'
