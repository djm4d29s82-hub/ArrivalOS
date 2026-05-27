-- =============================================================================
-- ARRIVAL OS — Row Level Security Policies
-- Version: Phase 2
-- Apply: Run in Supabase SQL Editor (once per environment).
--        Re-run is idempotent — DROP POLICY IF EXISTS guards all drops.
--
-- Role model:
--   admin   → full access to all rows
--   company → scoped to their own company_id
--   greeter → scoped to missions assigned to them (greeter_id = profile.id)
--   talent  → scoped to their own candidate record + linked data
--
-- Auth helper: auth.uid() is the Supabase user UUID.
-- The `users` table maps uuid → role + company_id / candidate_id.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: a view that materializes the current user's profile for RLS checks.
-- This avoids repeated SELECT in every policy.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_greeter_profile_id()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.greeter_profiles WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_candidate_id()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT candidate_id FROM public.users WHERE id = auth.uid()
$$;


-- =============================================================================
-- TABLE: users
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (
    id = auth.uid()
    OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- Admin can insert/delete users (e.g. onboarding)
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL USING (public.current_user_role() = 'admin');


-- =============================================================================
-- TABLE: companies
-- =============================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_select" ON public.companies;
CREATE POLICY "companies_select" ON public.companies
  FOR SELECT USING (
    public.current_user_role() = 'admin'
    OR id = public.current_company_id()
  );

DROP POLICY IF EXISTS "companies_update_own" ON public.companies;
CREATE POLICY "companies_update_own" ON public.companies
  FOR UPDATE USING (
    public.current_user_role() = 'admin'
    OR id = public.current_company_id()
  );

DROP POLICY IF EXISTS "companies_admin_insert_delete" ON public.companies;
CREATE POLICY "companies_admin_insert_delete" ON public.companies
  FOR ALL USING (public.current_user_role() = 'admin');


-- =============================================================================
-- TABLE: candidates
-- =============================================================================
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "candidates_select" ON public.candidates;
CREATE POLICY "candidates_select" ON public.candidates
  FOR SELECT USING (
    public.current_user_role() = 'admin'
    -- Company sees candidates linked to their company
    OR (public.current_user_role() = 'company' AND company_id = public.current_company_id())
    -- Greeter sees the candidate on their assigned mission
    OR id IN (
      SELECT candidate_id FROM public.missions
      WHERE greeter_id = public.current_greeter_profile_id()
        AND candidate_id IS NOT NULL
    )
    -- Talent sees their own record
    OR id = public.current_candidate_id()
  );

DROP POLICY IF EXISTS "candidates_insert_company_admin" ON public.candidates;
CREATE POLICY "candidates_insert_company_admin" ON public.candidates
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'company' AND company_id = public.current_company_id())
  );

DROP POLICY IF EXISTS "candidates_update" ON public.candidates;
CREATE POLICY "candidates_update" ON public.candidates
  FOR UPDATE USING (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'company' AND company_id = public.current_company_id())
    OR id = public.current_candidate_id()
  );

DROP POLICY IF EXISTS "candidates_delete_admin" ON public.candidates;
CREATE POLICY "candidates_delete_admin" ON public.candidates
  FOR DELETE USING (public.current_user_role() = 'admin');


-- =============================================================================
-- TABLE: greeter_profiles
-- =============================================================================
ALTER TABLE public.greeter_profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can see greeter profiles (needed for matching UI)
DROP POLICY IF EXISTS "greeter_profiles_select" ON public.greeter_profiles;
CREATE POLICY "greeter_profiles_select" ON public.greeter_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "greeter_profiles_update_own" ON public.greeter_profiles;
CREATE POLICY "greeter_profiles_update_own" ON public.greeter_profiles
  FOR UPDATE USING (
    user_id = auth.uid()
    OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "greeter_profiles_admin_all" ON public.greeter_profiles;
CREATE POLICY "greeter_profiles_admin_all" ON public.greeter_profiles
  FOR ALL USING (public.current_user_role() = 'admin');


-- =============================================================================
-- TABLE: missions
-- =============================================================================
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "missions_select" ON public.missions;
CREATE POLICY "missions_select" ON public.missions
  FOR SELECT USING (
    public.current_user_role() = 'admin'
    -- Company sees their own missions
    OR (public.current_user_role() = 'company' AND company_id = public.current_company_id())
    -- Greeter sees missions assigned to them OR where they're in matched_greeters
    OR greeter_id = public.current_greeter_profile_id()
    OR (public.current_user_role() = 'greeter' AND matched_greeters @> ARRAY[public.current_greeter_profile_id()])
    -- Talent sees mission linked to their candidate
    OR (public.current_user_role() = 'talent' AND candidate_id = public.current_candidate_id())
  );

-- Only admin can insert missions (company portal creates via createMissionFromArrival API fn)
DROP POLICY IF EXISTS "missions_insert" ON public.missions;
CREATE POLICY "missions_insert" ON public.missions
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'company' AND company_id = public.current_company_id())
  );

-- Status updates: admin always; greeter only on their own mission, only allowed fields
-- NOTE: field-level enforcement must also happen in the application layer (state machine).
DROP POLICY IF EXISTS "missions_update" ON public.missions;
CREATE POLICY "missions_update" ON public.missions
  FOR UPDATE USING (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'company' AND company_id = public.current_company_id())
    OR greeter_id = public.current_greeter_profile_id()
  );

DROP POLICY IF EXISTS "missions_delete_admin" ON public.missions;
CREATE POLICY "missions_delete_admin" ON public.missions
  FOR DELETE USING (public.current_user_role() = 'admin');


-- =============================================================================
-- TABLE: journey_steps
-- =============================================================================
ALTER TABLE public.journey_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journey_steps_select" ON public.journey_steps;
CREATE POLICY "journey_steps_select" ON public.journey_steps
  FOR SELECT USING (
    mission_id IN (
      SELECT id FROM public.missions
      WHERE
        public.current_user_role() = 'admin'
        OR company_id = public.current_company_id()
        OR greeter_id = public.current_greeter_profile_id()
        OR candidate_id = public.current_candidate_id()
    )
  );

DROP POLICY IF EXISTS "journey_steps_write" ON public.journey_steps;
CREATE POLICY "journey_steps_write" ON public.journey_steps
  FOR ALL USING (
    mission_id IN (
      SELECT id FROM public.missions
      WHERE
        public.current_user_role() = 'admin'
        OR greeter_id = public.current_greeter_profile_id()
    )
  );


-- =============================================================================
-- TABLE: messages
-- =============================================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    public.current_user_role() = 'admin'
    OR sender_id = auth.uid()::TEXT
    OR receiver_id = auth.uid()::TEXT
    -- All participants in a mission can read mission messages
    OR mission_id IN (
      SELECT id FROM public.missions
      WHERE company_id = public.current_company_id()
         OR greeter_id = public.current_greeter_profile_id()
         OR candidate_id = public.current_candidate_id()
    )
  );

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()::TEXT
    OR public.current_user_role() = 'admin'
  );


-- =============================================================================
-- TABLE: documents
-- =============================================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select" ON public.documents;
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (
    public.current_user_role() = 'admin'
    -- Company sees documents for their own candidates
    OR (public.current_user_role() = 'company' AND candidate_id IN (
      SELECT id FROM public.candidates WHERE company_id = public.current_company_id()
    ))
    -- Talent sees their own documents
    OR candidate_id = public.current_candidate_id()
    -- Greeter sees documents for their assigned mission's candidate (read-only)
    OR candidate_id IN (
      SELECT candidate_id FROM public.missions
      WHERE greeter_id = public.current_greeter_profile_id()
        AND candidate_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "documents_insert" ON public.documents;
CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'admin'
    OR candidate_id = public.current_candidate_id()
    OR (public.current_user_role() = 'company' AND candidate_id IN (
      SELECT id FROM public.candidates WHERE company_id = public.current_company_id()
    ))
  );

DROP POLICY IF EXISTS "documents_update_own" ON public.documents;
CREATE POLICY "documents_update_own" ON public.documents
  FOR UPDATE USING (
    public.current_user_role() = 'admin'
    OR candidate_id = public.current_candidate_id()
    OR (public.current_user_role() = 'company' AND candidate_id IN (
      SELECT id FROM public.candidates WHERE company_id = public.current_company_id()
    ))
  );

DROP POLICY IF EXISTS "documents_delete" ON public.documents;
CREATE POLICY "documents_delete" ON public.documents
  FOR DELETE USING (
    public.current_user_role() = 'admin'
    OR candidate_id = public.current_candidate_id()
  );


-- =============================================================================
-- TABLE: notifications
-- =============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (
    user_email = (SELECT email FROM public.users WHERE id = auth.uid())
    OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (
    user_email = (SELECT email FROM public.users WHERE id = auth.uid())
    OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (public.current_user_role() IN ('admin', 'company', 'greeter'));


-- =============================================================================
-- TABLE: activity_logs
-- =============================================================================
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
CREATE POLICY "activity_logs_select" ON public.activity_logs
  FOR SELECT USING (
    public.current_user_role() = 'admin'
    -- Company sees logs for their missions
    OR (entity_type = 'Mission' AND entity_id IN (
      SELECT id::TEXT FROM public.missions WHERE company_id = public.current_company_id()
    ))
    -- Greeter sees logs for their missions
    OR (entity_type = 'Mission' AND entity_id IN (
      SELECT id::TEXT FROM public.missions WHERE greeter_id = public.current_greeter_profile_id()
    ))
  );

-- Append-only: authenticated users can insert but not update/delete
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
CREATE POLICY "activity_logs_insert" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- No UPDATE / DELETE allowed — audit log is immutable


-- =============================================================================
-- TABLE: invoices
-- =============================================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT USING (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'company' AND company_id = public.current_company_id())
  );

DROP POLICY IF EXISTS "invoices_admin_write" ON public.invoices;
CREATE POLICY "invoices_admin_write" ON public.invoices
  FOR ALL USING (public.current_user_role() = 'admin');


-- =============================================================================
-- TABLE: settings
-- =============================================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Public settings row (key='public') is readable by everyone including anon
DROP POLICY IF EXISTS "settings_select_public" ON public.settings;
CREATE POLICY "settings_select_public" ON public.settings
  FOR SELECT USING (
    key = 'public'
    OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "settings_admin_write" ON public.settings;
CREATE POLICY "settings_admin_write" ON public.settings
  FOR ALL USING (public.current_user_role() = 'admin');


-- =============================================================================
-- TABLE: sops
-- =============================================================================
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;

-- SOPs are readable by all authenticated users (greeter needs them)
DROP POLICY IF EXISTS "sops_select" ON public.sops;
CREATE POLICY "sops_select" ON public.sops
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "sops_admin_write" ON public.sops;
CREATE POLICY "sops_admin_write" ON public.sops
  FOR ALL USING (public.current_user_role() = 'admin');


-- =============================================================================
-- TABLE: leads
-- =============================================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_admin_all" ON public.leads;
CREATE POLICY "leads_admin_all" ON public.leads
  FOR ALL USING (public.current_user_role() = 'admin');

-- Anyone can insert a lead (public contact form)
DROP POLICY IF EXISTS "leads_public_insert" ON public.leads;
CREATE POLICY "leads_public_insert" ON public.leads
  FOR INSERT WITH CHECK (true);


-- =============================================================================
-- STORAGE: documents bucket
-- Apply in Supabase Dashboard → Storage → Policies, or via the CLI.
--
-- Bucket name: "documents"
-- Objects path pattern: {candidate_id}/{filename}
-- =============================================================================

-- The SQL equivalents below are templates — actual bucket policy UI in Supabase
-- Studio differs. These express the intended access model for documentation.

/*
-- Allow authenticated users to read their own candidate documents
CREATE POLICY "documents_bucket_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = public.current_candidate_id()
    OR public.current_user_role() = 'admin'
    OR (
      public.current_user_role() = 'company'
      AND (storage.foldername(name))[1] IN (
        SELECT id FROM public.candidates WHERE company_id = public.current_company_id()
      )
    )
  );

-- Allow upload to own candidate folder or admin
CREATE POLICY "documents_bucket_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      public.current_user_role() = 'admin'
      OR (storage.foldername(name))[1] = public.current_candidate_id()
      OR (
        public.current_user_role() = 'company'
        AND (storage.foldername(name))[1] IN (
          SELECT id FROM public.candidates WHERE company_id = public.current_company_id()
        )
      )
    )
  );

-- Only owner or admin can delete
CREATE POLICY "documents_bucket_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND (
      public.current_user_role() = 'admin'
      OR (storage.foldername(name))[1] = public.current_candidate_id()
    )
  );
*/
