-- Per-step "Was mitbringen" checklist.
-- Stores an admin-customized list of items the talent should bring for a journey step.
-- When empty/absent, the app falls back to sensible defaults from src/lib/journeySteps.js.
alter table public.journey_steps add column if not exists bring_items text[] default '{}';
