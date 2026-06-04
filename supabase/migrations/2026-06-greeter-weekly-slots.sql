-- Persist greeter weekly availability (the Verfügbarkeit grid the UI already writes).
-- Shape: { "<Day>_<Slot>": true } with Day ∈ Mo..So and Slot ∈ Vormittag|Nachmittag|Abend.
-- Without this column the availability save fails on a real DB and the matching engine
-- has nothing to honour. Nullable/defaulted so it's safe and backward-compatible.
alter table public.greeter_profiles add column if not exists weekly_slots jsonb not null default '{}'::jsonb;
