\set ON_ERROR_STOP on
begin;
do $$
declare
  sample record;
begin
  for sample in select * from (values
    ('linkedin','https://www.linkedin.com/posts/test',true),
    ('facebook','https://www.facebook.com/example/posts/123',true),
    ('instagram','https://www.instagram.com/p/ABC123/',true),
    ('linkedin','https://www.linkedin.com:443/posts/test',true),
    ('linkedin','https://linkedin.com/',false),
    ('linkedin','https://linkedin.com/?query=value',false),
    ('linkedin','https://linkedin.com.evil.invalid/posts/test',false),
    ('linkedin','https://user:password@linkedin.com/posts/test',false),
    ('linkedin','https://linkedin.com:8443/posts/test',false),
    ('linkedin','https://facebook.com/posts/test',false),
    ('linkedin','javascript:alert(1)',false),
    ('unknown','https://linkedin.com/posts/test',false),
    ('linkedin',null,false)
  ) as samples(platform,url,expected) loop
    if public.is_valid_social_live_link(sample.platform,sample.url)
      is distinct from sample.expected then
      raise exception 'Live-link SQL validator mismatch for platform %', sample.platform;
    end if;
  end loop;
end $$;
set local request.jwt.claim.role = 'service_role';
insert into auth.users (id,email,raw_user_meta_data)
values
 ('10000000-0000-4000-8000-000000000001','worker@workflow.invalid','{"full_name":"Probe Worker"}'),
 ('10000000-0000-4000-8000-000000000002','reviewer@workflow.invalid','{"full_name":"Probe Reviewer"}');
insert into public.social_posts
 (id,title,product,type,status,created_by,worker_user_id,reviewer_user_id,
  canva_url,caption,platforms,scheduled_date)
values
 ('20000000-0000-4000-8000-000000000001','Execution regression','redactor','image','ready_to_publish',
  '10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002','https://www.canva.com/design/test',
  'Approved caption',array['linkedin']::public.social_platform[],'2026-09-08');
set local role service_role;
do $$
begin
  begin
    update public.social_posts set status='awaiting_live_link',caption='Unreviewed'
    where id='20000000-0000-4000-8000-000000000001';
    raise exception 'Execution transition accepted a brief edit';
  exception when check_violation then null;
  end;
  if not exists (select 1 from public.social_posts
    where id='20000000-0000-4000-8000-000000000001'
      and status='ready_to_publish' and caption='Approved caption') then
    raise exception 'Rejected edit did not preserve state';
  end if;

  update public.social_posts set status='awaiting_live_link'
  where id='20000000-0000-4000-8000-000000000001';
  insert into public.social_post_links (social_post_id,platform,url,created_by)
  values ('20000000-0000-4000-8000-000000000001','linkedin',
    'https://example.invalid/not-linkedin','10000000-0000-4000-8000-000000000001');
  begin
    update public.social_posts set status='published'
    where id='20000000-0000-4000-8000-000000000001';
    raise exception 'Publication accepted wrong-platform link';
  exception when check_violation then null;
  end;
  update public.social_post_links set url='https://www.linkedin.com/posts/test'
  where social_post_id='20000000-0000-4000-8000-000000000001';
  update public.social_posts set status='published'
  where id='20000000-0000-4000-8000-000000000001';
  begin
    delete from public.social_post_links
    where social_post_id='20000000-0000-4000-8000-000000000001';
    raise exception 'Last valid published link was deleted';
  exception when check_violation then null;
  end;
  begin
    update public.social_post_links set url='https://example.invalid/wrong'
    where social_post_id='20000000-0000-4000-8000-000000000001';
    raise exception 'Last valid published link was invalidated';
  exception when check_violation then null;
  end;
end $$;
reset role;
rollback;
\echo 'PASS: execution edits denied, publication requires valid link, final valid link preserved'
