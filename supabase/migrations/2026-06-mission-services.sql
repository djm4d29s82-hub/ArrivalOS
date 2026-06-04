-- Services Marketplace v1 — partner services activated/tracked per arrival (mission).
-- Mirrors the journey_steps "visibility follows the mission" model. The catalog of
-- categories lives in code (src/lib/serviceCatalog.js); each row is a real status record.
-- Admin manages; the owning company can manage too; everyone who can see the mission can read.
create table if not exists public.mission_services (
  id uuid primary key default uuid_generate_v4(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  category text not null,                    -- catalog key: wohnung|bank|sim|kv|visa|versicherung|sprache|steuer
  status text not null default 'requested',  -- requested|in_progress|active|done|skipped
  provider text,                             -- optional partner name (null in v1 — network in progress)
  notes text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_mission_services_mission on public.mission_services(mission_id);

alter table public.mission_services enable row level security;

-- SELECT follows the mission (mirrors journey_steps_select): anyone who can see the mission sees its services.
drop policy if exists "mission_services_select" on public.mission_services;
create policy "mission_services_select" on public.mission_services for select to authenticated
  using (exists (select 1 from public.missions m where m.id = mission_id));

-- MODIFY: admin, or the owning company (the buyers).
drop policy if exists "mission_services_modify" on public.mission_services;
create policy "mission_services_modify" on public.mission_services for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.missions m
      where m.id = mission_id
        and public.current_user_role() = 'company'
        and m.company_id = public.current_company_id()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.missions m
      where m.id = mission_id
        and public.current_user_role() = 'company'
        and m.company_id = public.current_company_id()
    )
  );
