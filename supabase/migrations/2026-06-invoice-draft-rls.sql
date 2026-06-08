-- Invoice review gate, server-side. A company must NOT see DRAFT invoices — only the admin does,
-- until the invoice is explicitly sent (draft -> pending) in AdminInvoices. This tightens the
-- invoices_select policy from rls-hardening.sql (the UI already filters drafts; this is the backstop).
drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select" on public.invoices for select to authenticated
  using (
    public.is_admin()
    or (public.current_user_role() = 'company'
        and company_id = public.current_company_id()
        and status is distinct from 'draft')
  );
