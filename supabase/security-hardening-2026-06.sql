-- ArrivalOS — SECURITY HARDENING (Audit 2026-06-11, P0)
-- Paste-ready für den Supabase SQL Editor. Idempotent.
--
-- Behebt:
--   P0-1  Greeter-PII-Leak: IBAN / Steuer-ID / Anschrift waren über die offene
--         greeter_profiles-SELECT-Policy (using true) für JEDEN eingeloggten
--         Nutzer lesbar. → Sensible Spalten ziehen in eine eigene Tabelle
--         `greeter_private` (nur Admin + der Greeter selbst), die Spalten werden
--         aus greeter_profiles ENTFERNT.
--   P0-2  Missions-Manipulation: die UPDATE-Policy beschränkte keine Spalten —
--         ein Greeter konnte `pay`, `company_id`, `status` frei ändern (die
--         State Machine existierte nur im Client). → BEFORE-UPDATE-Trigger
--         erzwingt Spaltenschutz + legale Statusübergänge serverseitig.
--
-- Reihenfolge: NACH schema.sql + rls-hardening.sql ausführen.
-- Frontend-Gegenstück: GreeterEarnings.jsx liest/schreibt jetzt GreeterPrivate.

------------------------------------------------------------
-- P0-1a  Private Greeter-Daten in eigene Tabelle
------------------------------------------------------------
create table if not exists public.greeter_private (
  -- id = greeter_profiles.id (1:1), damit der generische Entity-Adapter
  -- (get/update über `id`) ohne Sonderfall funktioniert.
  id uuid primary key references public.greeter_profiles(id) on delete cascade,
  iban text,
  tax_id text,
  payout_address text,
  updated_at timestamptz default now()
);

alter table public.greeter_private enable row level security;

drop policy if exists "greeter_private_select" on public.greeter_private;
create policy "greeter_private_select" on public.greeter_private for select to authenticated
  using (public.is_admin() or id = public.current_greeter_id());

drop policy if exists "greeter_private_insert" on public.greeter_private;
create policy "greeter_private_insert" on public.greeter_private for insert to authenticated
  with check (public.is_admin() or id = public.current_greeter_id());

drop policy if exists "greeter_private_update" on public.greeter_private;
create policy "greeter_private_update" on public.greeter_private for update to authenticated
  using (public.is_admin() or id = public.current_greeter_id())
  with check (public.is_admin() or id = public.current_greeter_id());

drop policy if exists "greeter_private_delete_admin" on public.greeter_private;
create policy "greeter_private_delete_admin" on public.greeter_private for delete to authenticated
  using (public.is_admin());

-- updated_at-Pflege
create or replace function public.touch_greeter_private()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_touch_greeter_private on public.greeter_private;
create trigger trg_touch_greeter_private before update on public.greeter_private
  for each row execute function public.touch_greeter_private();

------------------------------------------------------------
-- P0-1b  Bestandsdaten migrieren, dann Leak-Spalten entfernen
------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'greeter_profiles' and column_name = 'iban') then
    insert into public.greeter_private (id, iban, tax_id, payout_address)
    select id, iban, tax_id, payout_address
      from public.greeter_profiles
     where coalesce(iban, tax_id, payout_address) is not null
    on conflict (id) do update
      set iban = excluded.iban,
          tax_id = excluded.tax_id,
          payout_address = excluded.payout_address;
  end if;
end $$;

alter table public.greeter_profiles drop column if exists iban;
alter table public.greeter_profiles drop column if exists tax_id;
alter table public.greeter_profiles drop column if exists payout_address;

------------------------------------------------------------
-- P0-2  Missions: Spaltenschutz + Statusmaschine serverseitig
------------------------------------------------------------
-- Regeln (Admin + service_role sind ausgenommen):
--   • pay, company_id, candidate_id, matched_greeters: unveränderlich
--   • greeter_id: nur der Greeter selbst darf annehmen (null → eigene id);
--     niemand sonst darf umhängen
--   • status: nur legale Übergänge (Union aus missionStateMachine.ts
--     VALID_TRANSITIONS + den Legacy-Pfaden open/matched/in_progress,
--     die das Ops-Center nutzt)
--   • Terminalzustände (completed, cancelled) sind eingefroren

create or replace function public.allowed_mission_transition(old_s text, new_s text)
returns boolean language sql immutable as $$
  select
    -- Problem melden: aus JEDEM nicht-terminalen Status erlaubt (Client: canReportIssue /
    -- reportMissionIssueAsync transitioniert von überall nach issue_open).
    (new_s in ('issue_open','issue_reported') and old_s not in ('completed','cancelled'))
    or case old_s
      when 'created'        then new_s in ('open','matched','assigned','cancelled')
      when 'open'           then new_s in ('matched','assigned','cancelled')
      when 'matched'        then new_s in ('open','assigned','cancelled')
      when 'assigned'       then new_s in ('accepted','cancelled')
      when 'accepted'       then new_s in ('on_the_way','cancelled')
      when 'on_the_way'     then new_s in ('arrived','in_progress','cancelled')
      when 'arrived'        then new_s in ('met_talent','in_progress','cancelled')
      when 'met_talent'     then new_s in ('completed','in_progress','cancelled')
      when 'in_progress'    then new_s in ('completed','arrived','met_talent','cancelled')
      when 'issue_open'     then new_s in ('in_progress','on_the_way','arrived','cancelled')
      when 'issue_reported' then new_s in ('on_the_way','arrived','met_talent','in_progress','cancelled')
      else false  -- completed / cancelled: terminal
    end;
$$;

create or replace function public.enforce_mission_update_rules()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  caller_role text;
begin
  -- service_role (Edge Functions, Cron) und Admin: keine Einschränkung.
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then return new; end if;
  if public.is_admin() then return new; end if;

  caller_role := public.current_user_role();

  -- Geschützte Spalten — für Nicht-Admins unveränderlich.
  if new.pay is distinct from old.pay then
    raise exception 'missions.pay darf nur von Admins geändert werden';
  end if;
  if new.company_id is distinct from old.company_id then
    raise exception 'missions.company_id darf nur von Admins geändert werden';
  end if;
  if new.candidate_id is distinct from old.candidate_id then
    raise exception 'missions.candidate_id darf nur von Admins geändert werden';
  end if;
  if new.matched_greeters is distinct from old.matched_greeters then
    raise exception 'missions.matched_greeters darf nur von Admins geändert werden';
  end if;

  -- greeter_id: nur Selbst-Annahme (null → eigene Profil-ID) durch einen Greeter.
  if new.greeter_id is distinct from old.greeter_id then
    if not (caller_role = 'greeter'
            and old.greeter_id is null
            and new.greeter_id = public.current_greeter_id()) then
      raise exception 'missions.greeter_id: nur Annahme durch den Greeter selbst oder Admin';
    end if;
  end if;

  -- Status: Terminalzustände eingefroren, sonst nur legale Übergänge.
  if new.status is distinct from old.status then
    if old.status in ('completed','cancelled') then
      raise exception 'Mission ist abgeschlossen/storniert und kann nicht mehr geändert werden';
    end if;
    if not public.allowed_mission_transition(old.status, new.status) then
      raise exception 'Ungültiger Statusübergang: % → %', old.status, new.status;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_mission_update on public.missions;
create trigger trg_enforce_mission_update
  before update on public.missions
  for each row execute function public.enforce_mission_update_rules();

------------------------------------------------------------
-- Verifikation (sollte 0 Zeilen liefern)
------------------------------------------------------------
-- 1) Keine PII-Spalten mehr auf greeter_profiles:
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'greeter_profiles'
   and column_name in ('iban','tax_id','payout_address');
-- 2) Trigger aktiv:
select tgname from pg_trigger where tgname = 'trg_enforce_mission_update';
