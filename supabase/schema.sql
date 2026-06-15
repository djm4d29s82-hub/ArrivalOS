-- ArrivalOS / NeuLand — Supabase Schema
-- Run in: Supabase SQL Editor (https://app.supabase.com → SQL → New Query)
--
-- ┌──────────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  SECURITY — THIS SCRIPT SHIPS AN *OPEN* DATABASE (Pilot-RLS).               │
-- │ The policy loop near the bottom grants every authenticated user read+write on  │
-- │ every table (using(true)). You MUST run, IN ORDER, immediately after this:     │
-- │   1) rls-hardening.sql   (role-based isolation — replaces the open policies)    │
-- │   2) rls-verify.sql      (hard-fails if any open policy survived)               │
-- │ Never expose the database publicly between step 0 and step 2. See GO_LIVE.md.  │
-- └──────────────────────────────────────────────────────────────────────────────┘
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
  package_tier text default 'professional',   -- starter|professional|enterprise (per-candidate price tier)
  street text,                                 -- Rechnungsadresse (§14 Empfängerblock)
  zip text,
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
  weekly_slots jsonb not null default '{}'::jsonb,  -- { "<Day>_<Slot>": true }; honoured by the matching engine
  status text default 'available' check (status in ('available','busy','offline')),
  rating numeric(2,1),
  completed_missions int default 0,
  -- iban/tax_id/payout_address leben NICHT mehr hier: greeter_profiles ist für Matching breit
  -- lesbar. Sensible Auszahlungsdaten → public.greeter_private (security-hardening-2026-06.sql).
  contract_status text default 'pending',   -- freelancer agreement: pending|accepted
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
  flight_number text,
  requirements jsonb default '{}',
  pay numeric(10,2),
  matched_greeters text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Idempotent: ensure flight_number exists on databases created before 2026-05
-- (flight-tracker edge function). Mirrors migrations/2026-05-mission-flight-number.sql.
alter table public.missions add column if not exists flight_number text;
-- Flight delay awareness. Mirrors migrations/2026-06-flight-status.sql.
alter table public.missions add column if not exists flight_status text;       -- null|on_time|delayed|landed
alter table public.missions add column if not exists flight_delay_note text;

create table if not exists public.journey_steps (
  id uuid primary key default uuid_generate_v4(),
  mission_id uuid references public.missions(id) on delete cascade,
  title text not null,
  description text,
  "order" int,
  status text default 'pending' check (status in ('pending','in_progress','completed','skipped')),
  completed_at timestamptz,
  scheduled_at timestamptz,
  created_at timestamptz default now()
);

-- Idempotent: ensure scheduled_at exists on databases created before 2026-05
-- (MissionStepPlanner / talent timeline). Mirrors migrations/2026-05-journey-step-scheduled-at.sql.
alter table public.journey_steps add column if not exists scheduled_at timestamptz;

-- Idempotent: per-step "Was mitbringen" checklist (override; defaults live in journeySteps.js).
-- Mirrors migrations/2026-05-journey-step-bring-items.sql.
alter table public.journey_steps add column if not exists bring_items text[] default '{}';

-- Reusable journey-step templates, admin-editable in the UI (no code deploy).
-- Mirrors migrations/2026-05-mission-templates.sql. RLS policies live in rls-hardening.sql.
create table if not exists public.mission_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  steps jsonb not null default '[]',
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Services Marketplace: partner services activated/tracked per arrival.
-- Mirrors migrations/2026-06-mission-services.sql. RLS policies live in rls-hardening.sql.
create table if not exists public.mission_services (
  id uuid primary key default uuid_generate_v4(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  category text not null,
  status text not null default 'requested',
  provider text,
  notes text,
  due_at timestamptz,
  partner_id uuid,                         -- → partners.id (Phase A); mirrors migrations/2026-06-partners.sql
  provider_type text default 'ag_partner', -- ag_partner|company_provided|self
  consent_at timestamptz,
  booking_ref text,
  commission_amount numeric(10,2),
  referral_sent_at timestamptz,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_mission_services_mission on public.mission_services(mission_id);
create index if not exists idx_mission_services_due on public.mission_services(due_at);

-- Partner directory (real signed partners). Mirrors migrations/2026-06-partners.sql. RLS: admin-only.
create table if not exists public.partners (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  contact_email text,
  contact_phone text,
  website text,
  regions text[] default '{}',
  commission_pct numeric(5,2),
  commission_flat numeric(10,2),
  status text not null default 'active' check (status in ('active','inactive')),
  notes text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_partners_category on public.partners(category);

-- Talent consent to share data with a partner. Mirrors migrations/2026-06-service-consents.sql.
create table if not exists public.service_consents (
  id uuid primary key default uuid_generate_v4(),
  mission_service_id uuid not null references public.mission_services(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete set null,
  consent_at timestamptz default now(),
  created_by text,
  created_at timestamptz default now()
);
create index if not exists idx_service_consents_service on public.service_consents(mission_service_id);

-- Web Push subscriptions. Mirrors migrations/2026-06-push-subscriptions.sql.
create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_email text not null,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz default now()
);
create index if not exists idx_push_subscriptions_email on public.push_subscriptions(user_email);

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
  status text default 'pending' check (status in ('draft','pending','paid','overdue','cancelled')),
  issued_at timestamptz default now(),
  due_at timestamptz,
  invoice_number text unique,   -- fortlaufende Rechnungsnummer (§14), bei Ausstellung vergeben
  created_at timestamptz default now()
);

-- Fortlaufende Rechnungsnummer (§14 UStG) — vergeben beim Übergang draft → Nicht-Entwurf.
-- Vollständige Definition + Trigger in migration 2026-06-invoice-number.sql.
create sequence if not exists public.invoice_number_seq start 1001;
create or replace function public.assign_invoice_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.invoice_number is null and coalesce(new.status, '') <> 'draft' then
    new.invoice_number := 'AG-' || nextval('public.invoice_number_seq');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_assign_invoice_number on public.invoices;
create trigger trg_assign_invoice_number
  before insert or update on public.invoices
  for each row execute function public.assign_invoice_number();

-- Greeter pass-through expenses (Spesen/Tickets) forwarded onto the company invoice.
-- Policies + triggers live in migration 2026-06-mission-expenses.sql.
alter table public.invoices add column if not exists base_amount numeric(10,2);
alter table public.invoices add column if not exists expenses_amount numeric(10,2) default 0;
create table if not exists public.mission_expenses (
  id uuid primary key default uuid_generate_v4(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  greeter_id uuid references public.greeter_profiles(id) on delete set null,
  category text not null default 'other',
  amount numeric(10,2) not null,
  note text,
  receipt_url text,
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  submitted_at timestamptz default now(),
  decided_at timestamptz,
  decided_by text,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists public.settings (
  id text primary key,
  key text not null,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Mission-based greeter payouts (one per completed mission). Mirrors migrations/2026-06-billing-payout.sql.
create table if not exists public.payouts (
  id uuid primary key default uuid_generate_v4(),
  mission_id uuid references public.missions(id) on delete cascade,
  greeter_id uuid references public.greeter_profiles(id) on delete cascade,
  amount numeric(10,2),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  paid_at timestamptz,
  created_at timestamptz default now()
);
create unique index if not exists uq_payouts_mission on public.payouts(mission_id);
create index if not exists idx_payouts_greeter on public.payouts(greeter_id);

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

-- Idempotent: link a document to a journey step (Anmeldung/Bankkonto/Visa …).
-- Mirrors migrations/2026-05-document-step-link.sql.
alter table public.documents add column if not exists step_id uuid
  references public.journey_steps(id) on delete set null;

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

-- ⚠️ PILOT-ONLY OPEN POLICIES — every authenticated user can read+write every row.
-- This is NOT safe for production. rls-hardening.sql DROPS these and installs role-based
-- isolation; rls-verify.sql fails the deploy if these survive. Do not stop here.
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
