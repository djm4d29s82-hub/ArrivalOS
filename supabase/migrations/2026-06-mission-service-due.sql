-- Per-service deadline (optional) for the Services Marketplace.
-- A target date per mission_service so Operations/Company can see which services
-- are overdue or due soon (surfaced in CompanySLA + the KI-Briefing). Nullable —
-- existing rows and the rest of the feature work without it.
alter table public.mission_services add column if not exists due_at timestamptz;
create index if not exists idx_mission_services_due on public.mission_services(due_at);
