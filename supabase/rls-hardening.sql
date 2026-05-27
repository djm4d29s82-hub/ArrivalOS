-- ArrivalOS — RLS Hardening
-- Ersetzt die permissive "auth_read/write_*" Policies aus schema.sql
-- mit rollenbasierter Isolation.
--
-- Reihenfolge:
--   1. Helper-Funktionen (current role, current company_id, current candidate_id)
--   2. Bestehende permissive Policies droppen
--   3. Per-Tabelle: SELECT/INSERT/UPDATE/DELETE pro Rolle definieren
--
-- Wichtig: Diese Policies setzen voraus, dass public.users richtig befüllt ist
-- (entweder durch handle_new_user-Trigger oder manuell durch Admin).

------------------------------------------------------------
-- 1. Helper-Funktionen
------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.current_company_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select company_id from public.users where id = auth.uid();
$$;

create or replace function public.current_candidate_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select candidate_id from public.users where id = auth.uid();
$$;

create or replace function public.current_greeter_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.greeter_profiles where user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(role = 'admin', false) from public.users where id = auth.uid();
$$;

------------------------------------------------------------
-- 2. Permissive Policies droppen
------------------------------------------------------------
do $$
declare t text;
begin
  for t in select unnest(array[
    'users','companies','greeter_profiles','candidates','missions','journey_steps',
    'messages','notifications','activity_logs','invoices','settings','documents','sops'
  ])
  loop
    execute format('drop policy if exists "auth_read_%s" on public.%I;', t, t);
    execute format('drop policy if exists "auth_write_%s" on public.%I;', t, t);
  end loop;
end $$;

------------------------------------------------------------
-- 3. Per-Tabelle: rollenbasierte Policies
------------------------------------------------------------

-- USERS
-- jeder sieht sich selbst; Admin sieht alles; Company sieht eigene Mitarbeiter
create policy "users_select_self_or_admin" on public.users for select to authenticated
  using (id = auth.uid() or public.is_admin() or (public.current_user_role() = 'company' and company_id = public.current_company_id()));
create policy "users_update_self" on public.users for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "users_insert_admin" on public.users for insert to authenticated
  with check (public.is_admin());
create policy "users_delete_admin" on public.users for delete to authenticated
  using (public.is_admin());

-- COMPANIES
-- Admin alles; Company sieht/ändert eigene
create policy "companies_select" on public.companies for select to authenticated
  using (public.is_admin() or id = public.current_company_id());
create policy "companies_modify_admin" on public.companies for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- GREETER_PROFILES
-- alle authenticated dürfen Greeter sehen (Matching);
-- Greeter selbst kann sein eigenes Profil ändern; Admin alles
create policy "greeter_profiles_select" on public.greeter_profiles for select to authenticated
  using (true);
create policy "greeter_profiles_update_self" on public.greeter_profiles for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy "greeter_profiles_insert_admin" on public.greeter_profiles for insert to authenticated
  with check (public.is_admin() or user_id = auth.uid());
create policy "greeter_profiles_delete_admin" on public.greeter_profiles for delete to authenticated
  using (public.is_admin());

-- CANDIDATES
-- Admin alles; Company nur eigene; Talent nur sich selbst
create policy "candidates_select" on public.candidates for select to authenticated
  using (
    public.is_admin()
    or (public.current_user_role() = 'company' and company_id = public.current_company_id())
    or (public.current_user_role() = 'talent' and id = public.current_candidate_id())
    or (public.current_user_role() = 'greeter' and exists (
        select 1 from public.missions m
        where m.candidate_id = candidates.id and m.greeter_id = public.current_greeter_id()))
  );
create policy "candidates_insert" on public.candidates for insert to authenticated
  with check (public.is_admin() or (public.current_user_role() = 'company' and company_id = public.current_company_id()));
create policy "candidates_update" on public.candidates for update to authenticated
  using (public.is_admin() or (public.current_user_role() = 'company' and company_id = public.current_company_id()))
  with check (public.is_admin() or (public.current_user_role() = 'company' and company_id = public.current_company_id()));
create policy "candidates_delete_admin" on public.candidates for delete to authenticated
  using (public.is_admin());

-- MISSIONS
-- Admin alles; Company nur eigene; Greeter nur zugewiesene/gematchte; Talent nur eigene
create policy "missions_select" on public.missions for select to authenticated
  using (
    public.is_admin()
    or (public.current_user_role() = 'company' and company_id = public.current_company_id())
    or (public.current_user_role() = 'greeter' and (greeter_id = public.current_greeter_id() or public.current_greeter_id() = any (
         (select array_agg(g::uuid) from unnest(matched_greeters) g)
       )))
    or (public.current_user_role() = 'talent' and candidate_id = public.current_candidate_id())
  );
create policy "missions_insert" on public.missions for insert to authenticated
  with check (public.is_admin() or (public.current_user_role() = 'company' and company_id = public.current_company_id()));
create policy "missions_update" on public.missions for update to authenticated
  using (
    public.is_admin()
    or (public.current_user_role() = 'company' and company_id = public.current_company_id())
    or (public.current_user_role() = 'greeter' and greeter_id = public.current_greeter_id())
  );
create policy "missions_delete_admin" on public.missions for delete to authenticated
  using (public.is_admin());

-- JOURNEY_STEPS — Sichtbarkeit folgt Mission
create policy "journey_steps_select" on public.journey_steps for select to authenticated
  using (exists (select 1 from public.missions m where m.id = mission_id));
create policy "journey_steps_modify" on public.journey_steps for all to authenticated
  using (exists (select 1 from public.missions m where m.id = mission_id))
  with check (exists (select 1 from public.missions m where m.id = mission_id));

-- MESSAGES — nur Teilnehmer derselben Mission
create policy "messages_select" on public.messages for select to authenticated
  using (
    public.is_admin()
    or sender_id = auth.uid()
    or receiver_id = auth.uid()
    or exists (select 1 from public.missions m where m.id = mission_id)
  );
create policy "messages_insert" on public.messages for insert to authenticated
  with check (sender_id = auth.uid());
create policy "messages_update_own" on public.messages for update to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid() or public.is_admin())
  with check (sender_id = auth.uid() or receiver_id = auth.uid() or public.is_admin());

-- NOTIFICATIONS — pro user_email
create policy "notifications_select" on public.notifications for select to authenticated
  using (user_email = (select email from public.users where id = auth.uid()) or public.is_admin());
create policy "notifications_update" on public.notifications for update to authenticated
  using (user_email = (select email from public.users where id = auth.uid()))
  with check (user_email = (select email from public.users where id = auth.uid()));
create policy "notifications_insert_admin" on public.notifications for insert to authenticated
  with check (public.is_admin());

-- ACTIVITY_LOGS — append-only, nur Admin lesen
create policy "activity_logs_select_admin" on public.activity_logs for select to authenticated
  using (public.is_admin());
create policy "activity_logs_insert" on public.activity_logs for insert to authenticated
  with check (true);
-- kein UPDATE/DELETE (immutable)

-- INVOICES — Company sieht eigene; Admin alles
create policy "invoices_select" on public.invoices for select to authenticated
  using (public.is_admin() or (public.current_user_role() = 'company' and company_id = public.current_company_id()));
create policy "invoices_modify_admin" on public.invoices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- SETTINGS — public lesen, Admin schreiben
create policy "settings_select_public" on public.settings for select to authenticated
  using (true);
create policy "settings_modify_admin" on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- DOCUMENTS — Admin alles; Talent eigene; Company eigene Kandidaten; Greeter zugewiesene Kandidaten
create policy "documents_select" on public.documents for select to authenticated
  using (
    public.is_admin()
    or (public.current_user_role() = 'talent' and candidate_id = public.current_candidate_id())
    or (public.current_user_role() = 'company' and exists (
        select 1 from public.candidates c where c.id = candidate_id and c.company_id = public.current_company_id()))
    or (public.current_user_role() = 'greeter' and exists (
        select 1 from public.missions m where m.candidate_id = documents.candidate_id and m.greeter_id = public.current_greeter_id()))
  );
create policy "documents_insert" on public.documents for insert to authenticated
  with check (
    public.is_admin()
    or (public.current_user_role() = 'talent' and candidate_id = public.current_candidate_id())
    or (public.current_user_role() = 'company' and exists (
        select 1 from public.candidates c where c.id = candidate_id and c.company_id = public.current_company_id()))
  );
create policy "documents_update" on public.documents for update to authenticated
  using (
    public.is_admin()
    or (public.current_user_role() = 'talent' and candidate_id = public.current_candidate_id())
  );
create policy "documents_delete" on public.documents for delete to authenticated
  using (
    public.is_admin()
    or (public.current_user_role() = 'talent' and candidate_id = public.current_candidate_id())
  );

-- LEADS — anon insert, nur Admin lesen
drop policy if exists "auth_read_leads" on public.leads;
create policy "leads_select_admin" on public.leads for select to authenticated
  using (public.is_admin());

-- SOPS — alle authenticated lesen, nur Admin schreiben
create policy "sops_select" on public.sops for select to authenticated using (true);
create policy "sops_modify_admin" on public.sops for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- INVITES — Admin alles; Company eigene; Accept läuft per service_role (umgeht RLS).
-- Kein anon/talent-Zugriff: Token-Validierung passiert serverseitig in der Edge-Function.
create policy "invites_select" on public.invites for select to authenticated
  using (public.is_admin() or (public.current_user_role() = 'company' and company_id = public.current_company_id()));
create policy "invites_insert" on public.invites for insert to authenticated
  with check (public.is_admin() or (public.current_user_role() = 'company' and company_id = public.current_company_id()));
create policy "invites_update_admin" on public.invites for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

------------------------------------------------------------
-- Realtime aktivieren für messages + notifications
------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
