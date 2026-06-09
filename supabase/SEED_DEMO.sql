-- ============================================================================
-- ARRIVAL GERMANY — SEED_DEMO.sql  (Demo-Greeter + laufende Missionen zum Testen)
-- ----------------------------------------------------------------------------
-- Benutzung: Supabase Dashboard → SQL Editor → New query → DIESEN Inhalt einfügen → "Run".
-- Sicher: alles `on conflict do nothing` (idempotent) — überschreibt KEINE bestehenden Daten,
-- mehrfaches Ausführen ist gefahrlos. Läuft im SQL-Editor mit Owner-Rechten (RLS wird umgangen).
-- Kontaktdaten sind PLATZHALTER (keine echten Handynummern / keine private E-Mail).
-- Zum Entfernen siehe Block ganz unten (auskommentiert).
-- ============================================================================

-- ── Firmen (feste UUIDs, falls noch nicht vorhanden) ─────────────────────────
insert into public.companies (id, name, email, industry, city) values
  ('11111111-1111-1111-1111-111111111101','Helios Klinikum Wuppertal','recruiting@helios-wuppertal.de','Healthcare','Wuppertal'),
  ('11111111-1111-1111-1111-111111111102','Bavaria Automotive','people@bavaria-automotive.de','Automotive','Ingolstadt'),
  ('11111111-1111-1111-1111-111111111103','Northwind Studios','hello@northwind.de','Creative','Hamburg')
on conflict (id) do nothing;

-- ── Greeter (echte Namen + Städte, Kontakt = Platzhalter) ────────────────────
insert into public.greeter_profiles (id, email, full_name, phone, city, languages, availability, status, rating, completed_missions) values
  ('22222222-2222-2222-2222-222222222201','miriam@neuland.de','Miriam Schulz','+49 151 11110001','Düsseldorf',ARRAY['Deutsch','Englisch'],'flexible','available',4.9,27),
  ('22222222-2222-2222-2222-222222222202','lena@neuland.de','Lena Hoffmann','+49 151 11110002','Berlin',ARRAY['Deutsch','Englisch'],'weekends','busy',4.7,14),
  ('22222222-2222-2222-2222-222222222203','marco@neuland.de','Marco Klein','+49 151 11110003','Köln',ARRAY['Deutsch','Englisch','Italienisch'],'evenings','busy',4.8,31),
  ('22222222-2222-2222-2222-222222222204','amira@neuland.de','Amira Hassan','+49 151 11110004','Hamburg',ARRAY['Deutsch','Englisch','Französisch'],'flexible','busy',4.6,9),
  ('22222222-2222-2222-2222-222222222205','bassem@neuland.de','Bassem Kamel','+49 151 11110005','Frankfurt',ARRAY['Deutsch','Englisch','Arabisch'],'flexible','busy',4.7,16),
  ('22222222-2222-2222-2222-222222222206','sertan@neuland.de','Sertan Cakar','+49 151 11110006','Frankfurt',ARRAY['Deutsch','Englisch','Türkisch'],'flexible','busy',4.8,13),
  ('22222222-2222-2222-2222-222222222207','nico@neuland.de','Nico Karam','+49 151 11110007','München',ARRAY['Deutsch','Englisch','Arabisch'],'flexible','busy',4.9,22),
  ('22222222-2222-2222-2222-222222222208','omar@neuland.de','Omar Ismail','+49 151 11110008','Leipzig',ARRAY['Deutsch','Englisch','Arabisch'],'weekends','offline',4.6,8),
  ('22222222-2222-2222-2222-222222222209','david@neuland.de','David Schmitt','+49 151 11110009','Stuttgart',ARRAY['Deutsch','Englisch'],'evenings','busy',4.5,11),
  ('22222222-2222-2222-2222-222222222210','jonas@neuland.de','Jonas Weber','+49 151 11110010','Berlin',ARRAY['Deutsch','Englisch'],'flexible','busy',4.8,18)
on conflict (id) do nothing;

-- ── Kandidat:innen (Talente der laufenden Einsätze) ──────────────────────────
insert into public.candidates (id, full_name, origin, country_of_origin, role, city, company_id, arrival_date, arrival_time, flight_no, languages, phone, status, progress) values
  ('33333333-3333-3333-3333-333333333305','Aarav Sharma','Indien','Indien','Software Engineer','Berlin','11111111-1111-1111-1111-111111111102',current_date,(now()+interval '2.5 hours'),'AI 119',ARRAY['Englisch'],'+49 151 33330005','in_progress',30),
  ('33333333-3333-3333-3333-333333333306','Mei Chen','China','China','Data Scientist','München','11111111-1111-1111-1111-111111111101',current_date,(now()-interval '20 minutes'),'LH 723',ARRAY['Englisch','Chinesisch'],'+49 151 33330006','in_progress',50),
  ('33333333-3333-3333-3333-333333333307','Carlos Ruiz','Spanien','Spanien','Maschinenbauingenieur','Stuttgart','11111111-1111-1111-1111-111111111102',current_date,(now()-interval '1 hour'),'IB 357',ARRAY['Englisch','Spanisch'],'+49 151 33330007','in_progress',65),
  ('33333333-3333-3333-3333-333333333308','Fatima Noor','Ägypten','Ägypten','UX Designerin','Frankfurt','11111111-1111-1111-1111-111111111103',current_date,(now()-interval '3 hours'),'MS 785',ARRAY['Englisch','Arabisch'],'+49 151 33330008','in_progress',75),
  ('33333333-3333-3333-3333-333333333309','Ivan Petrov','Bulgarien','Bulgarien','Pflegefachkraft','Köln','11111111-1111-1111-1111-111111111101',current_date,(now()-interval '5 hours'),'FB 412',ARRAY['Englisch','Russisch'],'+49 151 33330009','in_progress',80),
  ('33333333-3333-3333-3333-333333333310','Sara Okoye','Nigeria','Nigeria','Projektmanagerin','Hamburg','11111111-1111-1111-1111-111111111103',current_date,(now()+interval '1 hour'),'LH 591',ARRAY['Englisch'],'+49 151 33330010','in_progress',35),
  ('33333333-3333-3333-3333-333333333311','Diego Alvarez','Mexiko','Mexiko','DevOps Engineer','Berlin','11111111-1111-1111-1111-111111111102',current_date,(now()-interval '2 hours'),'AM 027',ARRAY['Englisch','Spanisch'],'+49 151 33330011','in_progress',60)
on conflict (id) do nothing;

-- ── Laufende Missionen (verschiedene Stadien & Städte) ───────────────────────
insert into public.missions (id, title, description, company_id, candidate_id, greeter_id, status, greeter_stage, city, location, datetime, pay, eta_at, has_issue, issue_severity, issue_message, last_status_change, last_updated_by) values
  ('44444444-4444-4444-4444-444444444403','Flughafenabholung Berlin','Aarav Sharma am BER abholen','11111111-1111-1111-1111-111111111102','33333333-3333-3333-3333-333333333305','22222222-2222-2222-2222-222222222202','accepted','accepted','Berlin','BER Airport, Terminal 1',now()+interval '2.5 hours',90,null,false,null,null,now(),'lena@neuland.de'),
  ('44444444-4444-4444-4444-444444444404','Abholung & Transfer München','Mei Chen, Transfer nach Schwabing','11111111-1111-1111-1111-111111111101','33333333-3333-3333-3333-333333333306','22222222-2222-2222-2222-222222222207','on_the_way','on_the_way','München','MUC Terminal 2',now()-interval '20 minutes',95,now()+interval '25 minutes',false,null,null,now(),'nico@neuland.de'),
  ('44444444-4444-4444-4444-444444444405','Welcome & Stadtorientierung Stuttgart','Carlos Ruiz, Treffpunkt Hauptbahnhof','11111111-1111-1111-1111-111111111102','33333333-3333-3333-3333-333333333307','22222222-2222-2222-2222-222222222209','arrived','arrived','Stuttgart','Stuttgart Hauptbahnhof',now()-interval '1 hour',100,null,false,null,null,now(),'david@neuland.de'),
  ('44444444-4444-4444-4444-444444444406','Behördengang & Bankkonto Frankfurt','Fatima Noor, Anmeldung + Konto','11111111-1111-1111-1111-111111111103','33333333-3333-3333-3333-333333333308','22222222-2222-2222-2222-222222222205','in_progress','in_progress','Frankfurt','Bürgeramt Frankfurt-Mitte',now()-interval '3 hours',105,null,false,null,null,now(),'bassem@neuland.de'),
  ('44444444-4444-4444-4444-444444444407','Onboarding-Woche Köln','Ivan Petrov, Wohnung + SIM + Behörden','11111111-1111-1111-1111-111111111101','33333333-3333-3333-3333-333333333309','22222222-2222-2222-2222-222222222203','in_progress','in_progress','Köln','Köln Ehrenfeld',now()-interval '5 hours',115,null,false,null,null,now(),'marco@neuland.de'),
  ('44444444-4444-4444-4444-444444444408','Flughafenabholung Hamburg','Sara Okoye, Ankunft HAM','11111111-1111-1111-1111-111111111103','33333333-3333-3333-3333-333333333310','22222222-2222-2222-2222-222222222204','accepted','accepted','Hamburg','HAM Airport, Ankunft',now()+interval '1 hour',90,null,false,null,null,now(),'amira@neuland.de'),
  ('44444444-4444-4444-4444-444444444409','Abholung Berlin (2. Schicht)','Diego Alvarez, Talent nicht am Gate','11111111-1111-1111-1111-111111111102','33333333-3333-3333-3333-333333333311','22222222-2222-2222-2222-222222222210','in_progress','arrived','Berlin','BER Terminal 1, Ausgang B',now()-interval '2 hours',95,null,true,'warning','Talent nicht am Gate, telefonisch erreicht — 15 Min Verspätung',now(),'jonas@neuland.de')
on conflict (id) do nothing;

-- ── Journey-Schritte für die in_progress-Einsätze (Fortschritt) ──────────────
insert into public.journey_steps (mission_id, title, "order", status, completed_at) values
  ('44444444-4444-4444-4444-444444444406','Ankunft am Flughafen',1,'completed',now()-interval '3 hours'),
  ('44444444-4444-4444-4444-444444444406','Unterkunft beziehen',2,'completed',now()-interval '2 hours'),
  ('44444444-4444-4444-4444-444444444406','Anmeldung Bürgeramt',3,'in_progress',null),
  ('44444444-4444-4444-4444-444444444406','Bankkonto eröffnen',4,'pending',null),
  ('44444444-4444-4444-4444-444444444407','Ankunft am Flughafen',1,'completed',now()-interval '5 hours'),
  ('44444444-4444-4444-4444-444444444407','Unterkunft beziehen',2,'completed',now()-interval '4 hours'),
  ('44444444-4444-4444-4444-444444444407','SIM & Connectivity',3,'completed',now()-interval '3 hours'),
  ('44444444-4444-4444-4444-444444444407','Anmeldung Bürgeramt',4,'in_progress',null),
  ('44444444-4444-4444-4444-444444444407','Bankkonto eröffnen',5,'pending',null),
  ('44444444-4444-4444-4444-444444444409','Ankunft am Flughafen',1,'completed',now()-interval '2 hours'),
  ('44444444-4444-4444-4444-444444444409','Talent treffen',2,'in_progress',null)
on conflict do nothing;

-- ✅ Fertig: nach "Run" zeigt das Operations-Dashboard mehrere laufende Einsätze + Greeter.
--    (Hard-Refresh der App, damit die neuen Daten geladen werden.)

-- ── Zum Entfernen dieser Demo-Daten (bei Bedarf auskommentieren & ausführen) ──
-- delete from public.journey_steps where mission_id like '44444444-4444-4444-4444-4444444444%';
-- delete from public.missions      where id like '44444444-4444-4444-4444-4444444444%';
-- delete from public.candidates    where id like '33333333-3333-3333-3333-3333333333%';
-- delete from public.greeter_profiles where id like '22222222-2222-2222-2222-2222222222%';
