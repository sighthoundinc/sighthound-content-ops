"""Real PostgreSQL sessions; requires an explicitly approved disposable container."""
import os
import re
import subprocess
import time
import uuid


def main():
    container = os.environ.get("WF_DISPOSABLE_DB_CONTAINER", "")
    if not re.fullmatch(r"supabase_db_content-relay-workflow\.[A-Za-z0-9]+", container):
        raise SystemExit("Set WF_DISPOSABLE_DB_CONTAINER to the approved disposable container.")
    command = ["docker", "exec", "-i", container, "psql", "-U", "postgres",
               "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1"]

    def sql(statement):
        return subprocess.run(command, input=statement, text=True,
                              capture_output=True, timeout=15)

    def checked(statement):
        result = sql(statement)
        if result.returncode:
            raise RuntimeError(result.stderr)
        return result.stdout.strip()

    actor, reviewer = str(uuid.uuid4()), str(uuid.uuid4())
    posts = [str(uuid.uuid4()), str(uuid.uuid4())]
    sessions = []
    try:
        checked(f"""
begin;
set local request.jwt.claim.role='service_role';
insert into auth.users(id,email,raw_user_meta_data) values
('{actor}','{actor}@workflow.invalid','{{"full_name":"Race Worker"}}'),
('{reviewer}','{reviewer}@workflow.invalid','{{"full_name":"Race Reviewer"}}');
insert into public.social_posts
(id,title,product,type,status,created_by,worker_user_id,reviewer_user_id,
 canva_url,caption,platforms,scheduled_date)
select id::uuid,'Race regression','redactor','image','awaiting_live_link',
 '{actor}','{actor}','{reviewer}','https://www.canva.com/design/test',
 'Approved',array['linkedin']::public.social_platform[],'2026-09-08'
from unnest(array['{posts[0]}','{posts[1]}']) id;
insert into public.social_post_links(social_post_id,platform,url,created_by)
select id,'linkedin','https://www.linkedin.com/posts/test','{actor}'
from public.social_posts where id in ('{posts[0]}','{posts[1]}');
commit;
""")
        for index, post_id in enumerate(posts):
            publish = f"update public.social_posts set status='published' where id='{post_id}';"
            delete = f"delete from public.social_post_links where social_post_id='{post_id}';"
            first, second = (publish, delete) if index == 0 else (delete, publish)
            app_name = f"wf-race-{uuid.uuid4().hex}"
            session = subprocess.Popen(command, stdin=subprocess.PIPE,
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            sessions.append(session)
            session.stdin.write(f"""
begin;
set local application_name='{app_name}';
set local request.jwt.claim.role='service_role';
{first}
select pg_sleep(3);
commit;
""")
            session.stdin.close()
            deadline = time.monotonic() + 8
            while time.monotonic() < deadline:
                if checked(f"select exists(select 1 from pg_stat_activity "
                           f"where application_name='{app_name}' and wait_event='PgSleep');") == "t":
                    break
                if session.poll() is not None:
                    raise RuntimeError("First session exited before the race barrier.")
                time.sleep(0.05)
            else:
                raise RuntimeError("Timed out waiting for the transaction race barrier.")
            result = sql("\\set VERBOSITY sqlstate\n"
                         "begin; set local request.jwt.claim.role='service_role';\n"
                         + second + "\ncommit;")
            session.wait(timeout=10)
            if session.returncode:
                raise RuntimeError(session.stderr.read())
            if result.returncode == 0 or not any(code in result.stderr for code in ("23514", "P0001")):
                raise AssertionError(f"Conflicting mutation was not rejected: {result.stderr}")
            state = checked(f"select status::text||':'||(select count(*) "
                            f"from public.social_post_links where social_post_id=sp.id) "
                            f"from public.social_posts sp where id='{post_id}';")
            expected = "published:1" if index == 0 else "awaiting_live_link:0"
            if state != expected:
                raise AssertionError(f"Expected {expected}, got {state}")
            print(f"PASS: {'publication' if index == 0 else 'deletion'} first: {state}")
    finally:
        for session in sessions:
            if session.poll() is None:
                session.wait(timeout=10)
        checked(f"""
begin;
delete from public.social_posts where id in ('{posts[0]}','{posts[1]}');
delete from auth.users where id in ('{actor}','{reviewer}');
commit;
""")


if __name__ == "__main__":
    main()
