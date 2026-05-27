-- ArrivalOS — Rate-Limiting für öffentliche Endpoints
-- Schützt das Kontaktformular vor Spam / Brute-Force.
--
-- Strategie: Pro IP+Email max. 5 Inserts in 10 min, max. 20 pro Tag.
-- Implementiert als BEFORE INSERT-Trigger mit Counter-Check.

------------------------------------------------------------
-- 1. Rate-Limit-Tabelle
------------------------------------------------------------
create table if not exists public.rate_limits (
  id uuid primary key default uuid_generate_v4(),
  endpoint text not null,         -- z.B. 'leads.insert'
  identifier text not null,        -- IP oder Email
  count int not null default 1,
  window_start timestamptz not null default now(),
  created_at timestamptz default now()
);

create index if not exists idx_rate_limits_lookup
  on public.rate_limits(endpoint, identifier, window_start);

alter table public.rate_limits enable row level security;
-- nur service_role darf sehen, niemand schreiben (geht über Trigger)
drop policy if exists "rate_limits_no_select" on public.rate_limits;
create policy "rate_limits_no_select" on public.rate_limits for select to authenticated using (false);

------------------------------------------------------------
-- 2. Rate-Limit-Funktion
------------------------------------------------------------
create or replace function public.check_rate_limit(
  p_endpoint text,
  p_identifier text,
  p_max_count int,
  p_window_minutes int
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  current_count int;
begin
  -- alte Einträge aufräumen
  delete from public.rate_limits
   where window_start < now() - (p_window_minutes || ' minutes')::interval;

  -- aktuellen Count holen
  select coalesce(sum(count), 0) into current_count
    from public.rate_limits
   where endpoint = p_endpoint
     and identifier = p_identifier
     and window_start > now() - (p_window_minutes || ' minutes')::interval;

  if current_count >= p_max_count then
    return false;  -- abgelehnt
  end if;

  -- Counter erhöhen
  insert into public.rate_limits (endpoint, identifier, count)
  values (p_endpoint, p_identifier, 1);

  return true;
end;
$$;

------------------------------------------------------------
-- 3. Trigger auf leads
------------------------------------------------------------
create or replace function public.rate_limit_leads()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not public.check_rate_limit('leads.insert', lower(NEW.email), 5, 10) then
    raise exception 'Rate limit exceeded. Bitte versuchen Sie es in 10 Minuten erneut.'
      using errcode = 'P0001';
  end if;
  if not public.check_rate_limit('leads.insert.daily', lower(NEW.email), 20, 1440) then
    raise exception 'Daily limit exceeded.'
      using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

drop trigger if exists rate_limit_leads_trigger on public.leads;
create trigger rate_limit_leads_trigger
  before insert on public.leads
  for each row execute function public.rate_limit_leads();

------------------------------------------------------------
-- 4. Server-Side Validation
------------------------------------------------------------
create or replace function public.validate_lead()
returns trigger language plpgsql as $$
begin
  -- Email-Format prüfen
  if NEW.email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Ungültige Email-Adresse.' using errcode = 'P0001';
  end if;
  -- Honeypot / Länge
  if length(NEW.message) > 5000 then
    raise exception 'Nachricht zu lang.' using errcode = 'P0001';
  end if;
  if length(coalesce(NEW.name, '')) > 200 then
    raise exception 'Name zu lang.' using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

drop trigger if exists validate_lead_trigger on public.leads;
create trigger validate_lead_trigger
  before insert on public.leads
  for each row execute function public.validate_lead();
