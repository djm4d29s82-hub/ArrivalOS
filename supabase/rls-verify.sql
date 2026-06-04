-- RLS verification gate — run AFTER schema.sql + rls-hardening.sql.
-- Hard-fails (raise exception) if the permissive Pilot policies survived, i.e. if
-- rls-hardening.sql was skipped. This turns "forgot to harden the DB" from a silent
-- data-exposure into a loud, blocking error.
--
-- Run in: Supabase SQL Editor. Expected output on a hardened DB: "RLS OK".
do $$
declare
  open_count int;
  unprotected text;
begin
  -- 1) No leftover open Pilot policies (auth_read_* / auth_write_* with USING(true)).
  select count(*) into open_count
  from pg_policies
  where schemaname = 'public'
    and (policyname like 'auth_read_%' or policyname like 'auth_write_%');

  if open_count > 0 then
    raise exception
      'RLS NOT HARDENED: % permissive auth_read_/auth_write_ policy(ies) still exist. Run rls-hardening.sql before going live.',
      open_count;
  end if;

  -- 2) Every public table that has RLS enabled must have at least one policy
  --    (RLS enabled + zero policies = accidental full lock or, worse, a gap).
  select string_agg(c.relname, ', ') into unprotected
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = true
    and not exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = c.relname
    );

  if unprotected is not null then
    raise exception 'RLS GAP: table(s) with RLS enabled but no policies: %', unprotected;
  end if;

  raise notice 'RLS OK — no open Pilot policies, every RLS table has policies.';
end $$;
