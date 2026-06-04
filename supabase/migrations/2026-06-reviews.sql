-- Real greeter reviews — collected after a mission completes, so the ★ rating the whole
-- app shows (and the matching engine sorts by) stops being decorative seed data.
-- A trigger recomputes greeter_profiles.rating server-side (the rater can't update greeter rows under RLS).
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  mission_id uuid references public.missions(id) on delete cascade,
  greeter_id uuid references public.greeter_profiles(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_by text,
  created_at timestamptz default now()
);
create index if not exists idx_reviews_greeter on public.reviews(greeter_id);
-- one review per (mission, author) — re-rating updates instead of duplicating
create unique index if not exists uq_reviews_mission_author on public.reviews(mission_id, created_by);

alter table public.reviews enable row level security;

-- INSERT: the talent of the mission's candidate, the owning company, or an admin.
drop policy if exists "reviews_insert" on public.reviews;
create policy "reviews_insert" on public.reviews for insert to authenticated
  with check (
    public.is_admin()
    or (public.current_user_role() = 'talent'  and candidate_id = public.current_candidate_id())
    or (public.current_user_role() = 'company' and company_id   = public.current_company_id())
  );

-- SELECT: admin; the greeter sees their own reviews; the talent/company see their own.
drop policy if exists "reviews_select" on public.reviews;
create policy "reviews_select" on public.reviews for select to authenticated
  using (
    public.is_admin()
    or greeter_id   = public.current_greeter_id()
    or candidate_id = public.current_candidate_id()
    or (public.current_user_role() = 'company' and company_id = public.current_company_id())
  );

-- Recompute the greeter's average rating whenever a review is written/changed/removed.
create or replace function public.recompute_greeter_rating()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare gid uuid := coalesce(new.greeter_id, old.greeter_id);
begin
  update public.greeter_profiles g
     set rating = (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.greeter_id = gid)
   where g.id = gid;
  return null;
end $$;

drop trigger if exists trg_recompute_greeter_rating on public.reviews;
create trigger trg_recompute_greeter_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recompute_greeter_rating();
