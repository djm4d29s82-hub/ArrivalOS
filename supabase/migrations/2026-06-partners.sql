-- P3 Partner ecosystem — Phase A foundation.
-- A directory of REAL signed partners (bank, insurance, housing, language…) + the columns that link a
-- per-arrival service to a partner, capture talent consent (GDPR), and track revenue-share commission.
-- Honesty: a category with no signed partner stays "Netzwerk im Aufbau" — nothing is faked.

create table if not exists public.partners (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,                 -- serviceCatalog key: wohnung|bank|sim|kv|visa|versicherung|sprache|steuer
  contact_email text,
  contact_phone text,
  website text,
  regions text[] default '{}',            -- cities/regions served (empty = überall)
  commission_pct numeric(5,2),            -- revenue-share % (nullable)
  commission_flat numeric(10,2),          -- or a flat referral fee (nullable)
  status text not null default 'active' check (status in ('active','inactive')),
  notes text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_partners_category on public.partners(category);

-- Commission terms are commercially sensitive → admin-only.
alter table public.partners enable row level security;
drop policy if exists "partners_admin_all" on public.partners;
create policy "partners_admin_all" on public.partners for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Link a per-arrival service to a partner + consent + booking + commission.
-- (mission_services.provider already exists for the talent-visible provider name.)
alter table public.mission_services add column if not exists partner_id uuid references public.partners(id) on delete set null;
alter table public.mission_services add column if not exists provider_type text default 'ag_partner';  -- ag_partner|company_provided|self
alter table public.mission_services add column if not exists consent_at timestamptz;                    -- talent consent to share data with the partner
alter table public.mission_services add column if not exists booking_ref text;                          -- partner booking reference (Phase B)
alter table public.mission_services add column if not exists commission_amount numeric(10,2);           -- revenue-share recorded for reporting
