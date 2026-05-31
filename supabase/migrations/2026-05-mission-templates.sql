-- Reusable journey-step templates, editable by admins in the UI (no code deploy).
-- The "Vorlage…" picker in the mission step planner merges these DB rows with the
-- code-side built-ins (src/lib/missionTemplates.js). Each row's `steps` is a JSON
-- array of { key, title, description, offsetDays, bring:text[] }.
create table if not exists public.mission_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  steps jsonb not null default '[]',
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Admin-only managed table (mirrors the is_admin() pattern in rls-hardening.sql).
alter table public.mission_templates enable row level security;

drop policy if exists "mission_templates_select" on public.mission_templates;
create policy "mission_templates_select" on public.mission_templates for select to authenticated
  using (public.is_admin());

drop policy if exists "mission_templates_modify" on public.mission_templates;
create policy "mission_templates_modify" on public.mission_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
