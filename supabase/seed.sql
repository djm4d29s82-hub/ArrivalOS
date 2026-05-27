-- ArrivalOS — Demo-/Staging-Daten mit ECHTEN Personas
-- NICHT in Produktion ausführen. Nach schema.sql (+ rls-hardening) laufen lassen.
--
-- Echte Personas statt "Test User 1" — damit sofort sichtbar wird, ob Sprache,
-- Timeline und Informationen menschlich funktionieren.

-- Companies
insert into public.companies (id, name, email, industry, city) values
  ('11111111-1111-1111-1111-111111111101', 'Helios Klinikum Wuppertal', 'recruiting@helios-wuppertal.de', 'Healthcare', 'Wuppertal'),
  ('11111111-1111-1111-1111-111111111102', 'Bavaria Automotive',        'people@bavaria-automotive.de',  'Automotive', 'Ingolstadt'),
  ('11111111-1111-1111-1111-111111111103', 'Northwind Studios',         'hello@northwind.de',            'Creative',   'Hamburg')
on conflict (id) do nothing;

-- Greeter Profiles (user_id wird beim Invite/Login zugeordnet)
insert into public.greeter_profiles (id, email, full_name, phone, city, languages, availability, status, rating, completed_missions) values
  ('22222222-2222-2222-2222-222222222201','miriam@neuland.de','Miriam Schulz',  '+49 151 11110001','Düsseldorf',ARRAY['Deutsch','Englisch'],          'flexible','available',4.9,27),
  ('22222222-2222-2222-2222-222222222202','lena@neuland.de',  'Lena Hoffmann',  '+49 151 11110002','Berlin',    ARRAY['Deutsch','Englisch'],          'weekends','available',4.7,14),
  ('22222222-2222-2222-2222-222222222203','marco@neuland.de', 'Marco Klein',    '+49 151 11110003','Köln',      ARRAY['Deutsch','Englisch','Italienisch'],'evenings','available',4.8,31),
  ('22222222-2222-2222-2222-222222222204','amira@neuland.de', 'Amira Hassan',   '+49 151 11110004','Ingolstadt',ARRAY['Deutsch','Englisch','Arabisch'],'flexible','available',4.6,9)
on conflict (id) do nothing;

-- Candidates (mit den Feldern, die Greeter-/Talent-Screens lesen)
insert into public.candidates
  (id, full_name, origin, country_of_origin, role, city, company_id, arrival_date, arrival_time, flight_no, languages, phone, notes, status, progress) values
  ('33333333-3333-3333-3333-333333333301','Priya Nair',     'Indien',  'Indien',  'Pflegefachkraft', 'Düsseldorf', '11111111-1111-1111-1111-111111111101','2026-06-02','2026-06-02T14:30','AI 121', ARRAY['Englisch'],          '+49 151 23456789','Erstes Mal in Deutschland — laut Recruiter sehr aufgeregt.', 'in_progress', 55),
  ('33333333-3333-3333-3333-333333333302','Tariq Mahmood',  'Pakistan','Pakistan','Elektriker',      'Ingolstadt', '11111111-1111-1111-1111-111111111102','2026-06-04','2026-06-04T11:30','PK 713', ARRAY['Urdu','Englisch'],   '+49 160 5551234','Spricht wenig Englisch — Dolmetscher-App vorbereiten. 2 Koffer.', 'preparation', 20),
  ('33333333-3333-3333-3333-333333333303','Rohan Desai',    'Indien',  'Indien',  'Ingenieur',       'Ingolstadt', '11111111-1111-1111-1111-111111111102','2026-06-18','2026-06-18T09:10','LH 761', ARRAY['Englisch','Hindi'],  '+49 152 9876543','Anerkennungsbescheid steht noch aus.', 'preparation', 10),
  ('33333333-3333-3333-3333-333333333304','Joana Pereira',  'Portugal','Portugal','Art Director',    'Hamburg',    '11111111-1111-1111-1111-111111111103','2026-05-25','2026-05-25T10:00','TP 538', ARRAY['Englisch','Portugiesisch'],'+49 157 4445566',null, 'completed', 100)
on conflict (id) do nothing;

-- Missionen (1 läuft mit Miriam+Priya, 1 ist blockiert) — damit Sandras Dashboard nicht leer ist
insert into public.missions
  (id, title, description, company_id, candidate_id, greeter_id, status, greeter_stage, city, location, datetime, pay, has_issue, issue_severity, issue_message, last_status_change, last_updated_by) values
  ('44444444-4444-4444-4444-444444444401','Flughafenabholung Pflegefachkraft','Priya Nair am Gate abholen','11111111-1111-1111-1111-111111111101','33333333-3333-3333-3333-333333333301','22222222-2222-2222-2222-222222222201','on_the_way','on_the_way','Düsseldorf','DUS Airport, Terminal C, Gate C14','2026-06-02T14:30',95,false,null,null, now(),'miriam@neuland.de'),
  ('44444444-4444-4444-4444-444444444402','Einreise & Onboarding Ingenieur','Rohan Desai — Anerkennung ausstehend','11111111-1111-1111-1111-111111111102','33333333-3333-3333-3333-333333333303',null,'created',null,'Ingolstadt','MUC Airport, Terminal 2','2026-06-18T09:10',110,true,'critical','Anerkennungsbescheid ausstehend — Einreise verschiebt sich', now(),'people@bavaria-automotive.de')
on conflict (id) do nothing;

-- Journey-Schritte für die laufende Mission (Priya)
insert into public.journey_steps (mission_id, title, "order", status, completed_at) values
  ('44444444-4444-4444-4444-444444444401','Flug & Visa',          1,'completed', now() - interval '6 days'),
  ('44444444-4444-4444-4444-444444444401','Ankunft am Flughafen', 2,'in_progress', null),
  ('44444444-4444-4444-4444-444444444401','Unterkunft beziehen',  3,'pending', null),
  ('44444444-4444-4444-4444-444444444401','Anmeldung Bürgeramt',  4,'pending', null),
  ('44444444-4444-4444-4444-444444444401','Bankkonto eröffnen',   5,'pending', null)
on conflict do nothing;

-- SOPs
insert into public.sops (code, title, category, steps, version) values
  ('SOP-001','Flughafenabholung','arrival',7,'2.3'),
  ('SOP-002','Bürgeramt-Anmeldung','administration',9,'3.1'),
  ('SOP-003','Bankkonto-Eröffnung','banking',6,'1.5'),
  ('SOP-004','Wohnungsübergabe','housing',8,'2.0'),
  ('SOP-005','SIM-Karte & Mobilfunk','connectivity',4,'1.2'),
  ('SOP-006','Welcome Day','onboarding',10,'2.1'),
  ('SOP-007','Eskalations-Workflow','escalation',5,'1.0')
on conflict (code) do nothing;
