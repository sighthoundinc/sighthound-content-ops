-- Diagnostic helper for auth user creation failures.
-- Exposes auth.users trigger/constraint/hook metadata through a service-role RPC.

create or replace function public.inspect_auth_user_creation_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  trigger_rows jsonb := '[]'::jsonb;
  constraint_rows jsonb := '[]'::jsonb;
  hook_rows jsonb := '[]'::jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'trigger_name', t.tgname,
        'enabled', t.tgenabled,
        'is_internal', t.tgisinternal,
        'function_schema', pn.nspname,
        'function_name', p.proname,
        'function_definition', pg_get_functiondef(p.oid)
      )
      order by t.tgname
    ),
    '[]'::jsonb
  )
  into trigger_rows
  from pg_trigger t
  join pg_proc p
    on p.oid = t.tgfoid
  join pg_namespace pn
    on pn.oid = p.pronamespace
  where t.tgrelid = 'auth.users'::regclass
    and not t.tgisinternal;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'constraint_name', c.conname,
        'constraint_type', c.contype,
        'definition', pg_get_constraintdef(c.oid)
      )
      order by c.conname
    ),
    '[]'::jsonb
  )
  into constraint_rows
  from pg_constraint c
  where c.conrelid = 'auth.users'::regclass;

  if to_regclass('auth.hooks') is not null then
    select coalesce(
      jsonb_agg(to_jsonb(h) order by h.hook_name),
      '[]'::jsonb
    )
    into hook_rows
    from auth.hooks h;
  end if;

  return jsonb_build_object(
    'auth_users_triggers', trigger_rows,
    'auth_users_constraints', constraint_rows,
    'auth_hooks', hook_rows
  );
end;
$$;

revoke all on function public.inspect_auth_user_creation_state() from public;
revoke all on function public.inspect_auth_user_creation_state() from anon;
revoke all on function public.inspect_auth_user_creation_state() from authenticated;
grant execute on function public.inspect_auth_user_creation_state() to service_role;

notify pgrst, 'reload schema';
