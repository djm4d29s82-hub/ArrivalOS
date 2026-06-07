-- Greeter pass-through expenses (Spesen + Tickets).
-- Business model: the greeter fronts real out-of-pocket costs for an arrival (tickets, transport,
-- Amtsgebühren, …), submits them per mission; admin approves; approved expenses are forwarded onto
-- the company's invoice for that mission. This is SEPARATE from the greeter Honorar
-- (`mission.pay` = our cost/margin, company-hidden). Expenses ARE shown to the company as a
-- pass-through line on the invoice — we only forward what was actually spent.

create table if not exists public.mission_expenses (
  id uuid primary key default uuid_generate_v4(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  greeter_id uuid references public.greeter_profiles(id) on delete set null,
  category text not null default 'other',   -- ticket|transport|fee|material|other
  amount numeric(10,2) not null,
  note text,
  receipt_url text,                          -- optional storage path of the uploaded receipt
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  submitted_at timestamptz default now(),
  decided_at timestamptz,
  decided_by text,
  created_by text,
  created_at timestamptz default now()
);
create index if not exists idx_mission_expenses_mission on public.mission_expenses(mission_id);
create index if not exists idx_mission_expenses_greeter on public.mission_expenses(greeter_id);

-- Split the invoice total so the package and the pass-through expenses are distinguishable.
-- `amount` stays the true grand total (package + approved expenses) so all existing totals/mark-paid work.
alter table public.invoices add column if not exists base_amount numeric(10,2);      -- package / tier price
alter table public.invoices add column if not exists expenses_amount numeric(10,2) default 0; -- approved pass-through

-- ── RLS: greeter manages own (while still submitted); admin does everything ──────────────────────────
-- The company does NOT read raw expense rows — it sees only the pass-through total on its invoice.
alter table public.mission_expenses enable row level security;

drop policy if exists "mission_expenses_select" on public.mission_expenses;
create policy "mission_expenses_select" on public.mission_expenses for select to authenticated
  using (public.is_admin() or greeter_id = public.current_greeter_id());

drop policy if exists "mission_expenses_insert" on public.mission_expenses;
create policy "mission_expenses_insert" on public.mission_expenses for insert to authenticated
  with check (public.is_admin() or greeter_id = public.current_greeter_id());

drop policy if exists "mission_expenses_update" on public.mission_expenses;
create policy "mission_expenses_update" on public.mission_expenses for update to authenticated
  using (public.is_admin() or (greeter_id = public.current_greeter_id() and status = 'submitted'))
  with check (public.is_admin() or (greeter_id = public.current_greeter_id() and status = 'submitted'));

drop policy if exists "mission_expenses_delete" on public.mission_expenses;
create policy "mission_expenses_delete" on public.mission_expenses for delete to authenticated
  using (public.is_admin() or (greeter_id = public.current_greeter_id() and status = 'submitted'));

-- ── Keep the invoice total in sync with approved expenses (security definer: greeter can't write invoices) ──
create or replace function public.recompute_invoice_expenses(p_mission_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare exp numeric;
begin
  select coalesce(sum(amount), 0) into exp
    from public.mission_expenses
   where mission_id = p_mission_id and status = 'approved';
  -- Snapshot the package portion once (base_amount), then total = base + approved expenses.
  update public.invoices i
     set base_amount = coalesce(i.base_amount, i.amount),
         expenses_amount = exp,
         amount = coalesce(i.base_amount, i.amount) + exp
   where i.mission_id = p_mission_id;
end $$;

create or replace function public.on_mission_expense_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_invoice_expenses(coalesce(new.mission_id, old.mission_id));
  return null;
end $$;

drop trigger if exists trg_mission_expense_change on public.mission_expenses;
create trigger trg_mission_expense_change
  after insert or update or delete on public.mission_expenses
  for each row execute function public.on_mission_expense_change();

-- ── Completion trigger: fold already-approved expenses into the invoice at creation ─────────────────
-- (Supersedes the version in 2026-06-package-tiers.sql; keeps the tier price logic, adds expenses.)
create or replace function public.bill_on_mission_completion()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare price numeric; tier text; exp numeric;
begin
  if new.status = 'completed' and new.status is distinct from old.status then
    -- Invoice for the company (tier price + already-approved pass-through expenses)
    if new.company_id is not null and not exists (select 1 from public.invoices where mission_id = new.id) then
      select coalesce(nullif(package_tier, ''), 'professional') into tier from public.companies where id = new.company_id;
      select coalesce(
               (value ->> tier)::numeric,
               (value ->> 'professional')::numeric
             ) into price
        from public.settings where id = 'package_tiers';
      if price is null then
        select coalesce((value #>> '{}')::numeric, 0) into price from public.settings where id = 'package_price_eur';
      end if;
      select coalesce(sum(amount), 0) into exp
        from public.mission_expenses where mission_id = new.id and status = 'approved';
      insert into public.invoices (company_id, mission_id, amount, base_amount, expenses_amount, currency, status, issued_at, due_at)
      values (new.company_id, new.id, coalesce(price, 0) + exp, coalesce(price, 0), exp, 'EUR', 'pending', now(), now() + interval '14 days');
    end if;

    -- Payout for the greeter (mission-based: the mission's own pay — unchanged)
    if new.greeter_id is not null and not exists (select 1 from public.payouts where mission_id = new.id) then
      insert into public.payouts (mission_id, greeter_id, amount, status)
      values (new.id, new.greeter_id, coalesce(new.pay, 0), 'pending');
    end if;
  end if;
  return null;
end $$;
