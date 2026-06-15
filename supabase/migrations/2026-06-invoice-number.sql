-- ArrivalOS — Fortlaufende Rechnungsnummer (§14 UStG) + Empfänger-Adresse
-- Idempotent. Paste-ready für den Supabase SQL Editor.
--
-- §14 UStG verlangt eine fortlaufende Rechnungsnummer. Sie wird bei der AUSSTELLUNG vergeben —
-- d. h. wenn die Rechnung den Entwurfsstatus verlässt (draft → pending, „An Unternehmen senden").
-- Eine Sequence ist nicht strikt lückenlos (Rollbacks); das ist rechtlich zulässig (BFH), solange
-- die Nummer eindeutig und einmalig ist.

create sequence if not exists public.invoice_number_seq start 1001;

alter table public.invoices add column if not exists invoice_number text;
-- Eindeutigkeit erzwingen (mehrfach ausführbar):
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_invoice_number_key') then
    alter table public.invoices add constraint invoices_invoice_number_key unique (invoice_number);
  end if;
end $$;

-- Vergibt die Nummer beim ersten Übergang in einen Nicht-Entwurfs-Status (oder bei Direkt-Insert
-- als pending). Einmal vergeben, bleibt sie unverändert (kein Überschreiben).
create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.invoice_number is null and coalesce(new.status, '') <> 'draft' then
    new.invoice_number := 'AG-' || nextval('public.invoice_number_seq');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_invoice_number on public.invoices;
create trigger trg_assign_invoice_number
  before insert or update on public.invoices
  for each row execute function public.assign_invoice_number();

-- Empfänger-Anschrift (§14: vollständiger Name + Anschrift des Leistungsempfängers).
-- Optional; über die Unternehmensverwaltung pflegbar. Stadt liegt bereits in companies.city.
alter table public.companies add column if not exists street text;
alter table public.companies add column if not exists zip text;

-- Verifikation:
select column_name from information_schema.columns
 where table_schema='public' and table_name='invoices' and column_name='invoice_number';
select tgname from pg_trigger where tgname = 'trg_assign_invoice_number';
