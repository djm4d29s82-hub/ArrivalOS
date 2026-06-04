-- Flight delay awareness (P2.1). The greeter/ops can flag a flight as delayed (with a note); the
-- flight-tracker cron can set it automatically. Surfaced to talent + greeter so nobody waits at the
-- gate blind. Nullable text so it's backward-compatible.
alter table public.missions add column if not exists flight_status text;       -- null|on_time|delayed|landed
alter table public.missions add column if not exists flight_delay_note text;
