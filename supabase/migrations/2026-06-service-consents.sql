-- P3.4 — talent consent (GDPR) for sharing data with a partner.
-- A talent can't update mission_services (RLS), so consent lives in its own table the talent CAN insert.
-- A trigger copies consent onto the service so admin views + the referral edge fn read it directly.
create table if not exists public.service_consents (
  id uuid primary key default uuid_generate_v4(),
  mission_service_id uuid not null references public.mission_services(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete set null,
  consent_at timestamptz default now(),
  created_by text,
  created_at timestamptz default now()
);
create index if not exists idx_service_consents_service on public.service_consents(mission_service_id);

-- Guard against double-sending the partner referral.
alter table public.mission_services add column if not exists referral_sent_at timestamptz;

alter table public.service_consents enable row level security;
-- INSERT: the talent consenting for their own arrival (candidate matches), or admin.
drop policy if exists "service_consents_insert" on public.service_consents;
create policy "service_consents_insert" on public.service_consents for insert to authenticated
  with check (
    public.is_admin()
    or (public.current_user_role() = 'talent' and candidate_id = public.current_candidate_id())
  );
-- SELECT: admin or the consenting talent.
drop policy if exists "service_consents_select" on public.service_consents;
create policy "service_consents_select" on public.service_consents for select to authenticated
  using (public.is_admin() or candidate_id = public.current_candidate_id());

-- On consent → stamp consent_at on the linked service (security definer: talent can't write mission_services).
create or replace function public.apply_service_consent()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.mission_services set consent_at = coalesce(consent_at, now())
   where id = new.mission_service_id;
  return null;
end $$;

drop trigger if exists trg_apply_service_consent on public.service_consents;
create trigger trg_apply_service_consent
  after insert on public.service_consents
  for each row execute function public.apply_service_consent();
