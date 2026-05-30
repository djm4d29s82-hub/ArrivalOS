-- Schedule the proactive edge functions with pg_cron + pg_net.
-- Run ONCE in the Supabase SQL editor after deploying the functions.
--
-- Prereqs:
--   1) Deploy the functions:
--        supabase functions deploy step-reminders
--        supabase functions deploy flight-tracker
--   2) Set the flight API secret (flight-tracker only):
--        supabase secrets set AVIATIONSTACK_API_KEY=your_key
--   3) Enable extensions (Supabase: Database → Extensions): pg_cron, pg_net
--
-- Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> below before running.

-- Daily 08:00 — journey-step reminders + overdue escalation
select cron.schedule(
  'step-reminders',
  '0 8 * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/step-reminders',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Daily 07:00 — flight landing checks for today's arrivals
select cron.schedule(
  'flight-tracker',
  '0 7 * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/flight-tracker',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- To remove a schedule later:  select cron.unschedule('step-reminders');
