-- ============================================================================
-- ArrivalOS — SETUP_ALL.sql  (EIN Durchlauf im Supabase SQL Editor)
-- ============================================================================
-- Setzt das public-Schema auf das App-Schema zurueck und wendet schema +
-- RLS-Hardening + Audit-Triggers + Rate-Limit an, dann Backfill der bereits
-- existierenden Auth-Accounts.
--
-- SICHER: Loescht NUR public (das Fehl-Schema). auth.users (Login-Accounts)
-- liegen im auth-Schema und bleiben unangetastet.
--
-- DANACH separat (siehe README): Storage-Bucket "documents" anlegen ->
-- storage-policies.sql ausfuehren -> Rollen per UPDATE setzen.
-- NICHT seed.sql in Produktion ausfuehren.
-- ============================================================================

-- 0. RESET public-Schema --------------------------------------------------
drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables    in schema public to postgres, anon, authenticated, service_role;
grant all on all routines  in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on routines  to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;



-- ===== BEGIN schema.sql =====

-- ArrivalOS / NeuLand — Supabase Schema
-- Run in: Supabase SQL Editor (https://app.supabase.com → SQL → New Query)
--
-- Reihenfolge:
--   1. Extensions
--   2. Tabellen (ohne RLS)
--   3. Triggers für updated_at
--   4. RLS-Policies aktivieren
--   5. Seed-Daten (optional)

------------------------------------------------------------
-- 1. Extensions
------------------------------------------------------------
create extension if not exists "uuid-ossp";

------------------------------------------------------------
-- 2. Tabellen
------------------------------------------------------------

-- Users (verknüpft mit auth.users via id)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'talent' check (role in ('admin','company','greeter','talent')),
  status text not null default 'active' check (status in ('active','pending_approval')),
  company_id uuid,
  candidate_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  industry text,
  city text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.greeter_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete set null,
  email text,
  full_name text not null,
  phone text,
  city text,
  languages text[] default '{}',
  availability text,
  status text default 'available' check (status in ('available','busy','offline')),
  rating numeric(2,1),
  completed_missions int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.candidates (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  origin text,
  country_of_origin text,
  role text,
  city text,
  company_id uuid references public.companies(id) on delete set null,
  arrival_date date,
  arrival_time timestamptz,
  flight_no text,
  languages text[] default '{}',
  phone text,
  notes text,
  status text default 'preparation' check (status in ('preparation','in_progress','completed','cancelled')),
  progress int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.missions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  company_id uuid references public.companies(id) on delete set null,
  candidate_id uuid references public.candidates(id) on delete set null,
  greeter_id uuid references public.greeter_profiles(id) on delete set null,
  status text default 'created' check (status in (
    'created','open','matched','assigned','accepted','on_the_way','arrived',
    'met_talent','in_progress','completed','issue_open','issue_reported','cancelled'
  )),
  greeter_stage text,
  has_issue boolean default false,
  issue_severity text,
  issue_message text,
  last_status_change timestamptz,
  last_updated_by text,
  eta_at timestamptz,
  checked_in_at timestamptz,
  city text,
  location text,
  datetime timestamptz,
  requirements jsonb default '{}',
  pay numeric(10,2),
  matched_greeters text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.journey_steps (
  id uuid primary key default uuid_generate_v4(),
  mission_id uuid references public.missions(id) on delete cascade,
  title text not null,
  description text,
  "order" int,
  status text default 'pending' check (status in ('pending','in_progress','completed','skipped')),
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references public.users(id) on delete set null,
  sender_name text,
  receiver_id uuid references public.users(id) on delete set null,
  mission_id uuid references public.missions(id) on delete cascade,
  content text not null,
  read boolean default false,
  timestamp timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_email text not null,
  title text not null,
  message text,
  type text default 'info',
  read boolean default false,
  link text,
  created_at timestamptz default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  old_value text,
  new_value text,
  created_by text,
  description text,
  timestamp timestamptz default now()
);

create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id) on delete set null,
  mission_id uuid references public.missions(id) on delete set null,
  amount numeric(10,2) not null,
  currency text default 'EUR',
  status text default 'pending' check (status in ('pending','paid','overdue','cancelled')),
  issued_at timestamptz default now(),
  due_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.settings (
  id text primary key,
  key text not null,
  value jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  company text,
  name text,
  email text not null,
  phone text,
  role_type text,
  volume text,
  message text,
  source text default 'landing',
  created_at timestamptz default now()
);

create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid references public.candidates(id) on delete cascade,
  title text not null,
  type text,
  status text default 'pending' check (status in ('pending','signed','verified','rejected')),
  verified boolean default false,
  storage_path text,
  uploaded_at timestamptz,
  created_at timestamptz default now()
);

-- Invites (Pre-User-State; eigene Lifecycle, NICHT gleich User)
create table if not exists public.invites (
  id uuid primary key default uuid_generate_v4(),
  token_hash text not null,
  email text,
  full_name text,
  role text not null check (role in ('admin','company','greeter','talent')),
  company_id uuid references public.companies(id) on delete set null,
  candidate_id uuid references public.candidates(id) on delete set null,
  city text,
  languages text[] default '{}',
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  invited_by uuid references public.users(id) on delete set null,
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_invites_token on public.invites(token_hash);

create table if not exists public.sops (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  title text not null,
  category text,
  steps int default 0,
  version text,
  body text,
  updated_at timestamptz default now()
);

------------------------------------------------------------
-- 2b. Idempotente Ergänzungen (falls Tabellen bereits existierten)
--     Spalten, die die App schreibt, + erweiterter Status-CHECK.
------------------------------------------------------------
alter table public.missions add column if not exists greeter_stage text;
alter table public.missions add column if not exists has_issue boolean default false;
alter table public.missions add column if not exists issue_severity text;
alter table public.missions add column if not exists issue_message text;
alter table public.missions add column if not exists last_status_change timestamptz;
alter table public.missions add column if not exists last_updated_by text;
alter table public.missions add column if not exists eta_at timestamptz;
alter table public.missions add column if not exists checked_in_at timestamptz;
alter table public.missions drop constraint if exists missions_status_check;
alter table public.missions add constraint missions_status_check check (status in (
  'created','open','matched','assigned','accepted','on_the_way','arrived',
  'met_talent','in_progress','completed','issue_open','issue_reported','cancelled'
));
alter table public.candidates add column if not exists country_of_origin text;
alter table public.candidates add column if not exists arrival_time timestamptz;
alter table public.candidates add column if not exists flight_no text;
alter table public.candidates add column if not exists languages text[] default '{}';
alter table public.candidates add column if not exists phone text;
alter table public.candidates add column if not exists notes text;
alter table public.greeter_profiles add column if not exists phone text;
alter table public.documents add column if not exists verified boolean default false;
alter table public.users add column if not exists status text not null default 'active';

------------------------------------------------------------
-- 3. Indexes
------------------------------------------------------------
create index if not exists idx_missions_company on public.missions(company_id);
create index if not exists idx_missions_greeter on public.missions(greeter_id);
create index if not exists idx_missions_status on public.missions(status);
create index if not exists idx_messages_mission on public.messages(mission_id);
create index if not exists idx_documents_candidate on public.documents(candidate_id);

------------------------------------------------------------
-- 4. RLS — pragmatischer Start
--    Admin sieht alles; Company sieht eigene Daten;
--    Greeter sieht eigene Missions; Talent sieht eigenes Profil.
--    Für Pilot: nur SELECT/INSERT für authenticated; refinement in Sprint 3.
------------------------------------------------------------
alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.greeter_profiles enable row level security;
alter table public.candidates enable row level security;
alter table public.missions enable row level security;
alter table public.journey_steps enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.invoices enable row level security;
alter table public.settings enable row level security;
alter table public.leads enable row level security;
alter table public.documents enable row level security;
alter table public.sops enable row level security;
alter table public.invites enable row level security;
-- invites bewusst NICHT in der permissiven Pilot-Schleife (per Default gesperrt;
-- echte Policies in rls-hardening.sql, Accept läuft über service_role).

-- Authenticated users dürfen lesen (Pilot-Phase)
do $$
declare t text;
begin
  for t in select unnest(array[
    'users','companies','greeter_profiles','candidates','missions','journey_steps',
    'messages','notifications','activity_logs','invoices','settings','documents','sops'
  ])
  loop
    execute format('drop policy if exists "auth_read_%s" on public.%I;', t, t);
    execute format('create policy "auth_read_%s" on public.%I for select to authenticated using (true);', t, t);
    execute format('drop policy if exists "auth_write_%s" on public.%I;', t, t);
    execute format('create policy "auth_write_%s" on public.%I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- Leads: anonymous insert (Kontaktformular)
drop policy if exists "anon_insert_leads" on public.leads;
create policy "anon_insert_leads" on public.leads for insert to anon with check (true);
drop policy if exists "auth_read_leads" on public.leads;
create policy "auth_read_leads" on public.leads for select to authenticated using (true);

------------------------------------------------------------
-- 5. Auto-Profile bei Auth-Signup
------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'talent')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------
-- 6. Storage Bucket für Dokumente (manuell in Supabase UI anlegen!):
--    Bucket: "documents", privat
--    Policy: authenticated read/write own folder (candidate_id-Prefix)
------------------------------------------------------------


-- ===== BEGIN rls-hardening.sql =====

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


-- ===== BEGIN audit-triggers.sql =====

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


-- ===== BEGIN rate-limit.sql =====

-- ArrivalOS — Rate-Limiting für öffentliche Endpoints
-- Schützt das Kontaktformular vor Spam / Brute-Force.
--
-- Strategie: Pro IP+Email max. 5 Inserts in 10 min, max. 20 pro Tag.
-- Implementiert als BEFORE INSERT-Trigger mit Counter-Check.

------------------------------------------------------------
-- 1. Rate-Limit-Tabelle
------------------------------------------------------------
create table if not exists public.rate_limits (
  id uuid primary key default uuid_generate_v4(),
  endpoint text not null,         -- z.B. 'leads.insert'
  identifier text not null,        -- IP oder Email
  count int not null default 1,
  window_start timestamptz not null default now(),
  created_at timestamptz default now()
);

create index if not exists idx_rate_limits_lookup
  on public.rate_limits(endpoint, identifier, window_start);

alter table public.rate_limits enable row level security;
-- nur service_role darf sehen, niemand schreiben (geht über Trigger)
drop policy if exists "rate_limits_no_select" on public.rate_limits;
create policy "rate_limits_no_select" on public.rate_limits for select to authenticated using (false);

------------------------------------------------------------
-- 2. Rate-Limit-Funktion
------------------------------------------------------------
create or replace function public.check_rate_limit(
  p_endpoint text,
  p_identifier text,
  p_max_count int,
  p_window_minutes int
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  current_count int;
begin
  -- alte Einträge aufräumen
  delete from public.rate_limits
   where window_start < now() - (p_window_minutes || ' minutes')::interval;

  -- aktuellen Count holen
  select coalesce(sum(count), 0) into current_count
    from public.rate_limits
   where endpoint = p_endpoint
     and identifier = p_identifier
     and window_start > now() - (p_window_minutes || ' minutes')::interval;

  if current_count >= p_max_count then
    return false;  -- abgelehnt
  end if;

  -- Counter erhöhen
  insert into public.rate_limits (endpoint, identifier, count)
  values (p_endpoint, p_identifier, 1);

  return true;
end;
$$;

------------------------------------------------------------
-- 3. Trigger auf leads
------------------------------------------------------------
create or replace function public.rate_limit_leads()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not public.check_rate_limit('leads.insert', lower(NEW.email), 5, 10) then
    raise exception 'Rate limit exceeded. Bitte versuchen Sie es in 10 Minuten erneut.'
      using errcode = 'P0001';
  end if;
  if not public.check_rate_limit('leads.insert.daily', lower(NEW.email), 20, 1440) then
    raise exception 'Daily limit exceeded.'
      using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

drop trigger if exists rate_limit_leads_trigger on public.leads;
create trigger rate_limit_leads_trigger
  before insert on public.leads
  for each row execute function public.rate_limit_leads();

------------------------------------------------------------
-- 4. Server-Side Validation
------------------------------------------------------------
create or replace function public.validate_lead()
returns trigger language plpgsql as $$
begin
  -- Email-Format prüfen
  if NEW.email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Ungültige Email-Adresse.' using errcode = 'P0001';
  end if;
  -- Honeypot / Länge
  if length(NEW.message) > 5000 then
    raise exception 'Nachricht zu lang.' using errcode = 'P0001';
  end if;
  if length(coalesce(NEW.name, '')) > 200 then
    raise exception 'Name zu lang.' using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

drop trigger if exists validate_lead_trigger on public.leads;
create trigger validate_lead_trigger
  before insert on public.leads
  for each row execute function public.validate_lead();


-- ===== BEGIN backfill (bestehende Auth-Accounts -> public.users) =====
-- Der handle_new_user-Trigger feuert nur bei NEUEN Signups; bereits vorhandene
-- auth.users bekommen hier wieder eine public.users-Zeile (Default-Rolle talent).
-- Rollen anschliessend per UPDATE setzen (siehe README §5b).
insert into public.users (id, email, role)
  select id, email, 'talent' from auth.users
  on conflict (id) do nothing;
