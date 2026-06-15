-- ============================================================================
-- ARRIVAL GERMANY — DEPLOY_NOW.sql  (Spesen + Rechnungs-Review-Gate + Beleg-Upload + Rechnungsnummer)
-- ----------------------------------------------------------------------------
-- So benutzt du das:
--   Supabase Dashboard → SQL Editor → New query → DIESEN GESAMTEN INHALT einfügen → "Run".
--
-- Sicherheit:
--   • Alles ist IDEMPOTENT (if not exists / create or replace / drop policy if exists).
--     Mehrfaches Ausführen ist gefahrlos.
--   • Voraussetzung: Basis-`schema.sql` + Migrationen 1–15 sind bereits aktiv
--     (sind sie — die App läuft live). Dieses Skript ergänzt nur die offenen Teile 16–18
--     + die Storage-Policies für Greeter-Spesenbelege.
--   • Bei Erfolg erscheint keine Fehlermeldung ("Success. No rows returned").
--
-- Danach in der App: Admin → Einstellungen → Abrechnung (Tier-Preise prüfen).
-- ============================================================================


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 1/4  Greeter-Spesen (Spesen/Tickets) — Tabelle, Invoice-Spalten, Trigger   │
-- └──────────────────────────────────────────────────────────────────────────┘
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

alter table public.invoices add column if not exists base_amount numeric(10,2);      -- package / tier price
alter table public.invoices add column if not exists expenses_amount numeric(10,2) default 0; -- approved pass-through

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

create or replace function public.recompute_invoice_expenses(p_mission_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare exp numeric;
begin
  select coalesce(sum(amount), 0) into exp
    from public.mission_expenses
   where mission_id = p_mission_id and status = 'approved';
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


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 2/4  Rechnungs-Review-Gate — Rechnung entsteht als Entwurf bei Abschluss    │
-- └──────────────────────────────────────────────────────────────────────────┘
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check
  check (status in ('draft','pending','paid','overdue','cancelled'));

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


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 3/4  RLS-Backstop — Entwurfs-Rechnungen vor dem Unternehmen verbergen       │
-- └──────────────────────────────────────────────────────────────────────────┘
drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select" on public.invoices for select to authenticated
  using (
    public.is_admin()
    or (public.current_user_role() = 'company'
        and company_id = public.current_company_id()
        and status is distinct from 'draft')
  );


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 4/4  Storage-Policies — Greeter-Spesenbelege unter receipts/<mission_id>/   │
-- │      (Bucket "documents" muss existieren; Policies sind additiv/idempotent) │
-- └──────────────────────────────────────────────────────────────────────────┘
drop policy if exists "documents_bucket_insert_receipts" on storage.objects;
create policy "documents_bucket_insert_receipts"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'receipts'
  and (
    public.is_admin()
    or (public.current_user_role() = 'greeter'
        and exists (
          select 1 from public.missions m
          where m.id::text = (storage.foldername(name))[2]
            and m.greeter_id = public.current_greeter_id()
        ))
  )
);

drop policy if exists "documents_bucket_select_receipts" on storage.objects;
create policy "documents_bucket_select_receipts"
on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'receipts'
  and (
    public.is_admin()
    or (public.current_user_role() = 'greeter'
        and exists (
          select 1 from public.missions m
          where m.id::text = (storage.foldername(name))[2]
            and m.greeter_id = public.current_greeter_id()
        ))
  )
);

drop policy if exists "documents_bucket_delete_receipts" on storage.objects;
create policy "documents_bucket_delete_receipts"
on storage.objects for delete to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'receipts'
  and public.is_admin()
);

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 5/5  Fortlaufende Rechnungsnummer (§14 UStG) + Empfänger-Adresse            │
-- └──────────────────────────────────────────────────────────────────────────┘
create sequence if not exists public.invoice_number_seq start 1001;
alter table public.invoices add column if not exists invoice_number text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_invoice_number_key') then
    alter table public.invoices add constraint invoices_invoice_number_key unique (invoice_number);
  end if;
end $$;
create or replace function public.assign_invoice_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.invoice_number is null and coalesce(new.status, '') <> 'draft' then
    new.invoice_number := 'AG-' || nextval('public.invoice_number_seq');
  end if;
  return new;
end $$;
drop trigger if exists trg_assign_invoice_number on public.invoices;
create trigger trg_assign_invoice_number
  before insert or update on public.invoices
  for each row execute function public.assign_invoice_number();
alter table public.companies add column if not exists street text;
alter table public.companies add column if not exists zip text;

-- ✅ Fertig. Wenn keine Fehlermeldung erscheint, sind Spesen + Rechnungs-Gate + Beleg-Upload
--    + fortlaufende Rechnungsnummern live.
