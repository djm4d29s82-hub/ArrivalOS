-- ArrivalOS — SECURITY HARDENING 2 / RLS (Audit 2026-06-11: S8, S6, S5)
-- Paste-ready für den Supabase SQL Editor. Idempotent.
--
-- Reihenfolge: NACH schema.sql + rls-hardening.sql (+ security-hardening-2026-06.sql) ausführen.
-- Setzt die Helper aus rls-hardening.sql voraus:
--   is_admin(), current_greeter_id(), current_company_id(), current_candidate_id()
--
-- Behebt:
--   S8 (P0-#6)  Notifications-Insert war admin-only (notifications_insert_admin) → die App erzeugt
--               Notifications rollenübergreifend (Talent→Greeter, Greeter→Admin, Greeter→self) und
--               scheiterte in Prod still. → SECURITY-DEFINER-RPC app_create_notification als
--               sanktionierter Pfad: nur Mission-Teilnehmer oder Admin dürfen erzeugen.
--   S6 (P0-#14) journey_steps waren von JEDEM beschreibbar, der die Mission nur sehen konnte (auch
--               Talent/Company). → Schreibrecht auf Admin + den zugewiesenen Greeter der Mission.
--   S5 (P0-#15) activity_logs.created_by war frei wählbar (Insert with check(true)). → BEFORE-INSERT-
--               Trigger stempelt created_by mit der echten E-Mail des eingeloggten Nutzers.

------------------------------------------------------------
-- S8  Notifications: sanktionierter Insert-Pfad (RPC)
------------------------------------------------------------
-- Direkte INSERTs bleiben admin-only (notifications_insert_admin aus rls-hardening.sql).
-- Alles andere läuft über diese Funktion. SECURITY DEFINER → umgeht die Insert-Policy, prüft die
-- Berechtigung aber selbst: Aufrufer muss Admin sein ODER Teilnehmer der referenzierten Mission.
create or replace function public.app_create_notification(
  p_user_email text,
  p_title      text,
  p_message    text,
  p_type       text default 'info',
  p_link       text default '',
  p_mission_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_ok boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert.';
  end if;

  if public.is_admin() then
    v_ok := true;
  elsif p_mission_id is not null then
    -- Aufrufer ist Teilnehmer der Mission (Greeter / Company / Talent)?
    select exists (
      select 1 from public.missions m
       where m.id = p_mission_id
         and (
              m.greeter_id   = public.current_greeter_id()
           or m.company_id   = public.current_company_id()
           or m.candidate_id = public.current_candidate_id()
         )
    ) into v_ok;
  end if;

  if not v_ok then
    raise exception 'Keine Berechtigung, eine Benachrichtigung zu erstellen.';
  end if;

  insert into public.notifications (user_email, title, message, type, link, read)
  values (p_user_email, p_title, p_message, coalesce(p_type, 'info'), coalesce(p_link, ''), false)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.app_create_notification(text, text, text, text, text, uuid) to authenticated;

------------------------------------------------------------
-- S6  journey_steps: Schreibrecht eingrenzen
------------------------------------------------------------
-- Sichtbarkeit (journey_steps_select) folgt weiterhin der Mission und bleibt unverändert.
-- Schreiben (insert/update/delete) nur durch Admin oder den zugewiesenen Greeter der Mission.
-- (Greeter-Annahme setzt mission.greeter_id VOR dem Default-Step-bulkCreate → Policy greift;
--  Admin nutzt den Step-Planner über is_admin().) Talent/Company können Schritte nur lesen.
drop policy if exists "journey_steps_modify" on public.journey_steps;
drop policy if exists "journey_steps_write"  on public.journey_steps;
create policy "journey_steps_write" on public.journey_steps for all to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.missions m where m.id = mission_id and m.greeter_id = public.current_greeter_id())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.missions m where m.id = mission_id and m.greeter_id = public.current_greeter_id())
  );

------------------------------------------------------------
-- S5  activity_logs: created_by fälschungssicher stempeln
------------------------------------------------------------
-- Eingeloggte Nutzer können created_by nicht mehr frei setzen — der Trigger überschreibt es mit ihrer
-- echten E-Mail. service_role / interne Pfade (auth.uid() null) behalten den übergebenen Wert ('system').
create or replace function public.enforce_activity_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.created_by := coalesce((select email from public.users where id = auth.uid()), new.created_by);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_activity_actor on public.activity_logs;
create trigger trg_enforce_activity_actor
  before insert on public.activity_logs
  for each row execute function public.enforce_activity_actor();

------------------------------------------------------------
-- Verifikation
------------------------------------------------------------
-- RPC vorhanden + nur authenticated darf ausführen:
select proname from pg_proc where proname = 'app_create_notification';
-- journey_steps-Schreibpolicy aktiv, alte weg:
select policyname from pg_policies where tablename = 'journey_steps';
-- Actor-Trigger aktiv:
select tgname from pg_trigger where tgname = 'trg_enforce_activity_actor';
