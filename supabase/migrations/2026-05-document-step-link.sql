-- Link an uploaded document to a specific journey step (Anmeldung, Bankkonto, Visa …).
-- Nullable + on delete set null: documents stay candidate-scoped; step_id is just a tag, so
-- existing RLS is unchanged. When absent, per-step upload/display degrade gracefully (the app
-- only writes step_id when set).
alter table public.documents add column if not exists step_id uuid
  references public.journey_steps(id) on delete set null;
create index if not exists idx_documents_step on public.documents(step_id);
