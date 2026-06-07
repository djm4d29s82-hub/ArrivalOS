-- Invoice review gate: the company invoice is created as a DRAFT on mission completion.
-- The admin reviews/approves the pass-through expenses, then explicitly "sends" it (draft → pending);
-- only then is it visible to the company. Honorar/payout logic is unchanged.

-- 1. Allow 'draft' status.
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check
  check (status in ('draft','pending','paid','overdue','cancelled'));

-- 2. Completion trigger now creates the invoice as 'draft' (supersedes 2026-06-mission-expenses.sql).
--    Tier price + already-approved expense fold-in + payout block are unchanged.
create or replace function public.bill_on_mission_completion()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare price numeric; tier text; exp numeric;
begin
  if new.status = 'completed' and new.status is distinct from old.status then
    -- Draft invoice for the company (tier price + already-approved pass-through expenses)
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
      values (new.company_id, new.id, coalesce(price, 0) + exp, coalesce(price, 0), exp, 'EUR', 'draft', now(), now() + interval '14 days');
    end if;

    -- Payout for the greeter (mission-based: the mission's own pay — unchanged)
    if new.greeter_id is not null and not exists (select 1 from public.payouts where mission_id = new.id) then
      insert into public.payouts (mission_id, greeter_id, amount, status)
      values (new.id, new.greeter_id, coalesce(new.pay, 0), 'pending');
    end if;
  end if;
  return null;
end $$;
