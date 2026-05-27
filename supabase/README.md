# Supabase-Setup für ArrivalOS

## Schritt-für-Schritt

### 1. Projekt anlegen
- https://app.supabase.com → **New project**
- Region: **Frankfurt (EU Central)** — DSGVO/Hosting in EU
- Name: `arrivalos-prod` (oder `arrivalos-staging`)
- DB-Passwort sicher speichern

### 2. Schema einspielen
- Supabase Dashboard → **SQL Editor** → **New query**
- Inhalt von `schema.sql` einfügen → **Run**
- Erstellt: 14 Tabellen, RLS-Policies, Auth-Trigger

### 2b. RLS härten (Pflicht für Produktion)
- SQL Editor → Inhalt von `rls-hardening.sql` einfügen → **Run**
- Ersetzt die permissive Default-Policies durch rollenbasierte Isolation
- Erstellt zusätzlich: Helper-Funktionen, Realtime auf `messages`/`notifications`

### 2c. Audit-Triggers + Rate-Limit (Pflicht für Produktion)
- SQL Editor → `audit-triggers.sql` → **Run**
  → automatisches Logging aller INSERT/UPDATE/DELETE auf kritischen Tabellen
  → `updated_at` wird automatisch gepflegt
  → `activity_logs` wird append-only (UPDATE/DELETE entzogen)
- SQL Editor → `rate-limit.sql` → **Run**
  → Kontaktformular: max. 5 Submits / 10 min / Email, 20 / Tag
  → Email-Format + Längen-Validierung serverseitig

### 2d. Edge Functions (Email-Versand)
```bash
# Lokal installieren
npm install -g supabase
supabase link --project-ref <your-ref>

# Functions deployen
supabase functions deploy notify-on-message --no-verify-jwt
supabase functions deploy notify-on-lead --no-verify-jwt

# Invite → User → Approval (production-safe Onboarding):
# admin-invite: erzeugt invites-Zeile (gehashter Token) + /register-Link; Aufrufer muss
#   admin/company sein → MIT JWT-Verify (kein --no-verify-jwt). Setzt APP_URL als Secret
#   (für den Link); RESEND_API_KEY optional (Mail-Modus verschickt den Link).
supabase functions deploy admin-invite
supabase secrets set APP_URL="https://deine-domain.de"

# accept-invite: öffentlich (Registrant hat noch kein Konto) → MIT --no-verify-jwt.
#   Validiert Token (Hash+Expiry+Status+E-Mail-Lock) und legt Auth-User + Profil/Rolle/Status an.
supabase functions deploy accept-invite --no-verify-jwt

# Event-Kette (in activity_logs nachvollziehbar):
#   invite.created → registration.started → access.granted (Talent sofort)
#                                          → (pending) → access.approved (privilegierte Rollen)

# Secrets setzen
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set RESEND_FROM="ArrivalOS <noreply@deine-domain.de>"
supabase secrets set APP_URL="https://deine-domain.de"
supabase secrets set SALES_INBOX="sales@deine-domain.de"
supabase secrets set CRM_FORWARD_URL=""   # optional: Zapier/Make-Hook
```

Anschließend im Dashboard: **Database → Webhooks**
- `messages` INSERT → `notify-on-message`
- `leads` INSERT → `notify-on-lead`

### 3. (Optional) Demo-Daten
- SQL Editor → Inhalt von `seed.sql` einfügen → **Run**
- Nur für Staging/Demo. In Produktion **NICHT** ausführen.

### 4. Storage-Bucket für Dokumente
- Dashboard → **Storage** → **New bucket**
- Name: `documents`
- Public: **Off** (privat)
- Anschließend SQL Editor → `storage-policies.sql` ausführen
  → setzt RLS auf `storage.objects` (Talent/Company/Greeter-Isolation per Ordner-Pfad)

### 4b. RLS-Tests (empfohlen vor Live-Schaltung)
- 4 Test-User über Authentication-UI anlegen (admin/company/greeter/talent)
- `rls-tests.sql` öffnen → UUIDs eintragen → Tests durchspielen
- Erwartete Ergebnisse stehen als Kommentare in der Datei

### 5. Auth konfigurieren
- Dashboard → **Authentication → Providers**
  - **Email**: an, Magic-Link an, Passwort optional aus
  - **Google** / **Microsoft**: nach Bedarf für Talent-Login
- **Authentication → URL Configuration**
  - Site URL: `https://deine-domain.de`
  - Redirect URLs: `https://deine-domain.de/*`

### 5b. Rollen & Verknüpfungen (Pflicht — sonst landet jeder als `talent`)
Der `handle_new_user`-Trigger legt für jeden Auth-Signup eine `public.users`-Zeile mit
`role='talent'` an — **ohne** Firmen-/Kandidaten-/Greeter-Verknüpfung. Nach dem Signup (Magic-Link
oder Passwort) je Account einmalig setzen (SQL Editor):

```sql
-- Admin
update public.users set role = 'admin' where email = 'admin@deine-domain.de';

-- Company (Firma muss existieren; ggf. zuerst anlegen und id übernehmen)
-- insert into public.companies (name, city) values ('Helios Klinikum', 'Wuppertal') returning id;
update public.users
  set role = 'company', company_id = '<company-uuid>'
  where email = 'hr@kunde.de';

-- Greeter (Rolle setzen + greeter_profiles mit der Auth-UID verknüpfen — RLS nutzt user_id)
update public.users set role = 'greeter' where email = 'greeter@deine-domain.de';
update public.greeter_profiles
  set user_id = (select id from public.users where email = 'greeter@deine-domain.de')
  where email = 'greeter@deine-domain.de';
-- (falls noch kein Profil existiert: insert into public.greeter_profiles (user_id, email, full_name, city)
--   select id, email, full_name, 'München' from public.users where email = 'greeter@deine-domain.de';)

-- Talent (Rolle + Kandidaten-Verknüpfung)
update public.users
  set role = 'talent', candidate_id = '<candidate-uuid>'
  where email = 'talent@kunde.de';
```

> Für skalierbares Onboarding später ein In-App-Admin-Invite (legt Auth-User + Rolle + Links
> automatisch an) — P1, nicht für den ersten Launch nötig.

### 6. API-Keys in `.env` eintragen
- Dashboard → **Settings → API**
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` Key → `VITE_SUPABASE_ANON_KEY`
- ⚠️ Niemals `service_role` Key im Frontend verwenden!

### 7. App starten / deployen
- `npm run dev` → Console zeigt `[ArrivalOS] Backend: supabase`
- Falls weiterhin `localStorage` angezeigt: env nicht geladen, App neu starten

## Was läuft jetzt anders als im Demo-Modus?

| Feature           | localStorage | Supabase                                |
| ----------------- | ------------ | --------------------------------------- |
| Datenpersistenz   | nur Browser  | Postgres in EU (DSGVO)                  |
| Login             | Rollen-Switch| Magic-Link / Passwort / OAuth           |
| Multi-Device      | ❌            | ✅                                       |
| Backup            | ❌            | ✅ (Supabase PITR)                       |
| Audit-Log         | local table  | echte DB-Tabelle, unveränderlich        |
| Datei-Upload      | nur Filename | echtes Storage in `documents`-Bucket    |
| RLS / Permissions | client-only  | DB-enforced                             |

## Rollback in den Demo-Modus
- `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` aus `.env` entfernen
- App-Restart → läuft wieder gegen localStorage

## Nächste Schritte (nicht im Schema enthalten)
- Edge Function für Lead-Webhook (statt direktem CRM-Call)
- Cron für Notification-Cleanup
- Row-Level-Security verfeinern: `company_id`-basierte Trennung
- Realtime-Subscriptions für Messages
