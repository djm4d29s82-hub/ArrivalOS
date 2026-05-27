-- ArrivalOS — Storage-Bucket "documents" Policies
-- Vorab im Supabase-UI: Bucket "documents" anlegen (privat, nicht public).
--
-- Pfad-Konvention: candidates/<candidate_id>/<file>
-- → so kann RLS pro Talent / pro Company / pro Greeter prüfen, ob Zugriff erlaubt.

-- Hilfs-Funktionen (aus rls-hardening.sql) müssen existieren:
--   public.is_admin(), public.current_user_role(), public.current_company_id(),
--   public.current_candidate_id(), public.current_greeter_id()

-- Permissive Policies entfernen falls vorhanden
drop policy if exists "documents_bucket_select" on storage.objects;
drop policy if exists "documents_bucket_insert" on storage.objects;
drop policy if exists "documents_bucket_update" on storage.objects;
drop policy if exists "documents_bucket_delete" on storage.objects;

-- SELECT: wer darf die Datei lesen / signed URL generieren?
create policy "documents_bucket_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and (
    public.is_admin()
    or (
      -- Pfad muss "candidates/<uuid>/..." sein
      (storage.foldername(name))[1] = 'candidates'
      and (
        -- Talent darf seinen eigenen Ordner sehen
        (public.current_user_role() = 'talent'
         and (storage.foldername(name))[2] = public.current_candidate_id()::text)
        -- Company darf Ordner ihrer Kandidaten sehen
        or (public.current_user_role() = 'company'
            and exists (
              select 1 from public.candidates c
              where c.id::text = (storage.foldername(name))[2]
                and c.company_id = public.current_company_id()
            ))
        -- Greeter darf Ordner zugewiesener Kandidaten sehen
        or (public.current_user_role() = 'greeter'
            and exists (
              select 1 from public.missions m
              where m.candidate_id::text = (storage.foldername(name))[2]
                and m.greeter_id = public.current_greeter_id()
            ))
      )
    )
  )
);

-- INSERT: wer darf in welchen Ordner hochladen?
create policy "documents_bucket_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'candidates'
  and (
    public.is_admin()
    or (public.current_user_role() = 'talent'
        and (storage.foldername(name))[2] = public.current_candidate_id()::text)
    or (public.current_user_role() = 'company'
        and exists (
          select 1 from public.candidates c
          where c.id::text = (storage.foldername(name))[2]
            and c.company_id = public.current_company_id()
        ))
  )
);

-- UPDATE (überschreiben): wie INSERT
create policy "documents_bucket_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'documents'
  and (
    public.is_admin()
    or (public.current_user_role() = 'talent'
        and (storage.foldername(name))[2] = public.current_candidate_id()::text)
  )
);

-- DELETE: nur Eigentümer + Admin
create policy "documents_bucket_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'documents'
  and (
    public.is_admin()
    or (public.current_user_role() = 'talent'
        and (storage.foldername(name))[2] = public.current_candidate_id()::text)
  )
);
