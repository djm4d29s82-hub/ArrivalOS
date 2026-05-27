-- ArrivalOS — RLS Smoke Test
-- Ausführen NACHDEM schema.sql + seed.sql + rls-hardening.sql gelaufen sind.
--
-- Test simuliert echte Auth-Calls via `set role` und JWT-Claims.
-- Zeigt erwartete vs. tatsächliche Zeilenzahl pro Rolle/Tabelle.

------------------------------------------------------------
-- VORBEREITUNG: 4 Test-User in public.users (eine pro Rolle)
-- WICHTIG: Die uuid muss in auth.users existieren — also
-- ECHTE User über Supabase Auth-UI anlegen, dann ihre uuids hier eintragen.
------------------------------------------------------------

-- Beispiel-IDs (anpassen!)
--   admin@test    → 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
--   company@test  → 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
--   greeter@test  → 'cccccccc-cccc-cccc-cccc-cccccccccccc'
--   talent@test   → 'dddddddd-dddd-dddd-dddd-dddddddddddd'

-- Profile setzen:
-- update public.users set role='admin'   where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- update public.users set role='company', company_id='11111111-1111-1111-1111-111111111101' where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
-- update public.users set role='greeter' where id='cccccccc-cccc-cccc-cccc-cccccccccccc';
-- update public.greeter_profiles set user_id='cccccccc-cccc-cccc-cccc-cccccccccccc' where id='22222222-2222-2222-2222-222222222201';
-- update public.users set role='talent', candidate_id='33333333-3333-3333-3333-333333333301' where id='dddddddd-dddd-dddd-dddd-dddddddddddd';

------------------------------------------------------------
-- HELPER: simuliere Auth-Kontext
------------------------------------------------------------
-- Supabase setzt auth.uid() via request.jwt.claim.sub.
-- Lokal können wir mit set_config testen.

create or replace function test_as(user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

------------------------------------------------------------
-- TESTS
------------------------------------------------------------

-- TEST 1: Admin sieht alle Companies
-- select test_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
-- select count(*) as admin_sees_companies from public.companies; -- erwartet: 3

-- TEST 2: Company-User sieht nur eigene Company
-- select test_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
-- select count(*) as company_sees_companies from public.companies; -- erwartet: 1
-- select count(*) as company_sees_candidates from public.candidates; -- erwartet: nur eigene

-- TEST 3: Greeter sieht KEINE fremden Missions
-- select test_as('cccccccc-cccc-cccc-cccc-cccccccccccc');
-- select count(*) as greeter_sees_missions from public.missions;
-- → sollte nur Missions zeigen, wo greeter_id = sein g1 oder matched_greeters enthält

-- TEST 4: Talent sieht nur eigene Documents
-- select test_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
-- select count(*) as talent_sees_documents from public.documents;
-- → erwartet: alle docs mit candidate_id=ca1, NICHT ca2

-- TEST 5: Talent kann KEINE fremden Documents schreiben
-- select test_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
-- insert into public.documents (candidate_id, title, type, status)
-- values ('33333333-3333-3333-3333-333333333302', 'BÖSARTIGES DOC', 'hack', 'pending');
-- → erwartet: ERROR: new row violates row-level security

-- TEST 6: Company kann KEINE Mission anderer Companies sehen
-- select test_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
-- select count(*) from public.missions where company_id != '11111111-1111-1111-1111-111111111101';
-- → erwartet: 0

-- TEST 7: anonymer User darf Lead einreichen, aber keine lesen
-- set role anon;
-- insert into public.leads (email, name, message) values ('test@x.de','Test','Hallo');  -- erwartet: OK
-- select count(*) from public.leads;  -- erwartet: 0 oder ERROR
-- reset role;

-- TEST 8: Activity Logs sind append-only
-- select test_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
-- delete from public.activity_logs;
-- → erwartet: 0 rows affected (keine DELETE-Policy → blockiert)

-- Nach Tests: reset
-- reset all;
