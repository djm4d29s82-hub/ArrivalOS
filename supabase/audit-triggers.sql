-- ArrivalOS — Audit-Triggers
-- Automatisches Logging aller INSERT/UPDATE/DELETE auf kritischen Tabellen.
-- Schreibt in public.activity_logs (immutable per RLS).
--
-- Voraussetzung: rls-hardening.sql ist gelaufen (current_user_role etc.).

------------------------------------------------------------
-- 1. Generische Audit-Funktion
------------------------------------------------------------
create or replace function public.audit_log()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  entity_id_val text;
  user_email text;
  action_name text;
  diff_keys text[];
  old_val text;
  new_val text;
begin
  -- entity_id aus NEW oder OLD ziehen
  if (tg_op = 'DELETE') then
    entity_id_val := coalesce(OLD.id::text, '');
  else
    entity_id_val := coalesce(NEW.id::text, '');
  end if;

  -- Aktor ermitteln
  select email into user_email from public.users where id = auth.uid();
  user_email := coalesce(user_email, 'system');

  -- Action-Name
  action_name := lower(tg_table_name) || '.' || lower(tg_op);

  if (tg_op = 'UPDATE') then
    -- Status-Änderung speziell loggen
    if (NEW.status is distinct from OLD.status) then
      old_val := OLD.status;
      new_val := NEW.status;
      action_name := lower(tg_table_name) || '.status_changed';
    else
      old_val := null;
      new_val := null;
    end if;
  elsif (tg_op = 'INSERT') then
    new_val := coalesce(NEW.status, 'created');
  elsif (tg_op = 'DELETE') then
    old_val := coalesce(OLD.status, 'deleted');
  end if;

  insert into public.activity_logs (entity_type, entity_id, action, old_value, new_value, created_by, description, timestamp)
  values (
    tg_table_name,
    entity_id_val,
    action_name,
    old_val,
    new_val,
    user_email,
    case
      when tg_op = 'INSERT' then format('%s created', tg_table_name)
      when tg_op = 'UPDATE' then format('%s updated', tg_table_name)
      when tg_op = 'DELETE' then format('%s deleted', tg_table_name)
    end,
    now()
  );

  if (tg_op = 'DELETE') then return OLD; end if;
  return NEW;
end;
$$;

------------------------------------------------------------
-- 2. Trigger auf kritischen Tabellen
------------------------------------------------------------
do $$
declare t text;
begin
  -- NUR Tabellen mit status-Spalte (die generische audit_log()-Funktion liest NEW.status).
  -- 'companies' bewusst ausgenommen — hat keine status-Spalte (sonst Laufzeitfehler bei jedem Insert).
  for t in select unnest(array[
    'missions','candidates','greeter_profiles','documents','invoices','users'
  ])
  loop
    execute format('drop trigger if exists audit_%s on public.%I;', t, t);
    execute format(
      'create trigger audit_%s after insert or update or delete on public.%I
       for each row execute function public.audit_log();',
      t, t
    );
  end loop;
end $$;

------------------------------------------------------------
-- 3. activity_logs gegen Manipulation schützen
------------------------------------------------------------
-- Auch Admin darf nicht UPDATE/DELETE — append-only.
revoke update, delete on public.activity_logs from authenticated;
revoke update, delete on public.activity_logs from anon;

------------------------------------------------------------
-- 4. updated_at automatisch setzen
------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'users','companies','greeter_profiles','candidates','missions'
  ])
  loop
    execute format('drop trigger if exists touch_%s on public.%I;', t, t);
    execute format(
      'create trigger touch_%s before update on public.%I
       for each row execute function public.touch_updated_at();',
      t, t
    );
  end loop;
end $$;
