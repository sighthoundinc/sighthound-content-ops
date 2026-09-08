-- Run only against an approved disposable database via psql.
-- Exercises actual database role privileges, not HTTP authentication.
\set ON_ERROR_STOP on
begin;

do $$
declare
  function_name text;
  caller text;
begin
  foreach function_name in array array[
    'public.transition_social_post_status(uuid,public.social_post_status,uuid,text)',
    'public.reopen_social_post_for_brief_edit(uuid,uuid,text)'
  ] loop
    foreach caller in array array['anon', 'authenticated'] loop
      if has_function_privilege(caller, function_name, 'EXECUTE') then
        raise exception '% can execute %', caller, function_name;
      end if;
    end loop;
    if not has_function_privilege('service_role', function_name, 'EXECUTE') then
      raise exception 'Server cannot execute %', function_name;
    end if;
  end loop;
end $$;

set local role anon;
do $$
begin
  begin
    perform public.transition_social_post_status(
      '20000000-0000-4000-8000-000000000001', 'in_review',
      '10000000-0000-4000-8000-000000000002', null);
    raise exception 'Anonymous transition was not denied';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.reopen_social_post_for_brief_edit(
      '20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002', null);
    raise exception 'Anonymous reopen was not denied';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
do $$
begin
  begin
    perform public.transition_social_post_status(
      '20000000-0000-4000-8000-000000000001', 'in_review',
      '10000000-0000-4000-8000-000000000002', null);
    raise exception 'Authenticated direct transition was not denied';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.reopen_social_post_for_brief_edit(
      '20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002', null);
    raise exception 'Authenticated direct reopen was not denied';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local request.jwt.claim.role = 'service_role';
set local request.jwt.claim.sub = '';
insert into auth.users (id,email,raw_user_meta_data)
values
 ('10000000-0000-4000-8000-000000000001','worker@workflow.invalid','{"full_name":"Probe Worker"}'),
 ('10000000-0000-4000-8000-000000000002','reviewer@workflow.invalid','{"full_name":"Probe Reviewer"}');
insert into public.social_posts
 (id,title,product,type,status,created_by,worker_user_id,reviewer_user_id,
  canva_url,caption,platforms,scheduled_date)
values
 ('20000000-0000-4000-8000-000000000001','RPC access regression','redactor','image','ready_to_publish',
  '10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002','https://www.canva.com/design/test',
  'Approved caption',array['linkedin']::public.social_platform[],'2026-09-08');
set local role service_role;
do $$
declare
  reopened public.social_posts;
begin
  reopened := public.reopen_social_post_for_brief_edit(
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002', 'Regression check');
  if reopened.status <> 'creative_approved' then
    raise exception 'Service-role reopen did not persist the expected status';
  end if;
end $$;
reset role;
rollback;
\echo 'PASS: privileged RPCs deny ordinary database roles and retain service-role access'
