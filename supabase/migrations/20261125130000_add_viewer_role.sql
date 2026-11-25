-- Adds the read-only "viewer" role.
-- Run this file on its own BEFORE 20261125130100: Postgres will not let a new
-- enum value be used in the same transaction that adds it.
alter type public.app_role add value if not exists 'viewer';
