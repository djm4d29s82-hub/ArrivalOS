-- P2.3 — Web Push subscriptions. Each browser/device that opts in stores its PushSubscription here.
-- The send-push edge function reads these per user_email when a notification is created.
create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_email text not null,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz default now()
);
create index if not exists idx_push_subscriptions_email on public.push_subscriptions(user_email);

alter table public.push_subscriptions enable row level security;
-- A user manages only their own subscriptions (matched by their account email); admin sees all.
drop policy if exists "push_subscriptions_select" on public.push_subscriptions;
create policy "push_subscriptions_select" on public.push_subscriptions for select to authenticated
  using (public.is_admin() or user_email = (select email from public.users where id = auth.uid()));
drop policy if exists "push_subscriptions_insert" on public.push_subscriptions;
create policy "push_subscriptions_insert" on public.push_subscriptions for insert to authenticated
  with check (user_email = (select email from public.users where id = auth.uid()));
drop policy if exists "push_subscriptions_delete" on public.push_subscriptions;
create policy "push_subscriptions_delete" on public.push_subscriptions for delete to authenticated
  using (public.is_admin() or user_email = (select email from public.users where id = auth.uid()));
