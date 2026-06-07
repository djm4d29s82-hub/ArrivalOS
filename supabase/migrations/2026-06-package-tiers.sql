-- Tiered per-candidate pricing (the founder's real Pricing-Section tiers).
-- Each company is on a tier; the completion invoice charges that tier's price.
alter table public.companies add column if not exists package_tier text default 'professional'; -- starter|professional|enterprise

-- Real tier prices (€ per Kandidat:in). Editable in Admin → Einstellungen → Abrechnung.
insert into public.settings (id, key, value)
values ('package_tiers', 'package_tiers', '{"starter":490,"professional":690,"enterprise":900}'::jsonb)
on conflict (id) do nothing;

-- Replace the invoice price lookup in the completion trigger with the company's tier price.
-- (Payout block is unchanged.)
create or replace function public.bill_on_mission_completion()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare price numeric; tier text;
begin
  if new.status = 'completed' and new.status is distinct from old.status then
    -- Invoice for the company (tier-based price)
    if new.company_id is not null and not exists (select 1 from public.invoices where mission_id = new.id) then
      select coalesce(nullif(package_tier, ''), 'professional') into tier from public.companies where id = new.company_id;
      select coalesce(
               (value ->> tier)::numeric,
               (value ->> 'professional')::numeric
             ) into price
        from public.settings where id = 'package_tiers';
      if price is null then
        -- fallback to the legacy single price if tiers aren't configured
        select coalesce((value #>> '{}')::numeric, 0) into price from public.settings where id = 'package_price_eur';
      end if;
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
