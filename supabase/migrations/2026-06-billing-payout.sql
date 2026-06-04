-- P1.3 auto-invoice + P1.4 mission-based greeter payout.
-- Both run server-side on mission completion (a greeter/talent can't write invoices/payouts under RLS),
-- are idempotent (one invoice + one payout per mission), and use real numbers only:
--   * invoice amount = the configured single package price (settings 'package_price_eur'; founder sets it)
--   * payout amount  = the mission's own pay field (mission-based)

-- ── Package price config (single price; founder edits the value; default 0 until set) ──────────────
insert into public.settings (id, key, value)
values ('package_price_eur', 'package_price_eur', '0'::jsonb)
on conflict (id) do nothing;

-- ── Greeter freelancer payout/contract fields ──────────────────────────────────────────────────────
alter table public.greeter_profiles add column if not exists iban text;
alter table public.greeter_profiles add column if not exists tax_id text;            -- Steuernummer/USt-IdNr
alter table public.greeter_profiles add column if not exists payout_address text;
alter table public.greeter_profiles add column if not exists contract_status text default 'pending'; -- pending|accepted

-- ── Payouts (one per completed mission) ─────────────────────────────────────────────────────────────
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

alter table public.payouts enable row level security;
drop policy if exists "payouts_select" on public.payouts;
create policy "payouts_select" on public.payouts for select to authenticated
  using (public.is_admin() or greeter_id = public.current_greeter_id());
drop policy if exists "payouts_modify_admin" on public.payouts;
create policy "payouts_modify_admin" on public.payouts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── On completion: create the company invoice + the greeter payout (idempotent) ─────────────────────
create or replace function public.bill_on_mission_completion()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare price numeric;
begin
  if new.status = 'completed' and new.status is distinct from old.status then
    -- Invoice for the company (single package price)
    if new.company_id is not null and not exists (select 1 from public.invoices where mission_id = new.id) then
      select coalesce((value #>> '{}')::numeric, 0) into price from public.settings where id = 'package_price_eur';
      insert into public.invoices (company_id, mission_id, amount, currency, status, issued_at, due_at)
      values (new.company_id, new.id, coalesce(price, 0), 'EUR', 'pending', now(), now() + interval '14 days');
    end if;

    -- Payout for the greeter (mission-based: the mission's own pay)
    if new.greeter_id is not null and not exists (select 1 from public.payouts where mission_id = new.id) then
      insert into public.payouts (mission_id, greeter_id, amount, status)
      values (new.id, new.greeter_id, coalesce(new.pay, 0), 'pending');
    end if;
  end if;
  return null;
end $$;

drop trigger if exists trg_bill_on_mission_completion on public.missions;
create trigger trg_bill_on_mission_completion
  after update on public.missions
  for each row execute function public.bill_on_mission_completion();
