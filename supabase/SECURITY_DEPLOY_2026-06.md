# SECURITY-DEPLOY — P0-Fixes aus dem Audit 2026-06-11

Vier kritische Lücken, vier Schritte. Reihenfolge einhalten.

## 1. SQL ausführen (Supabase SQL Editor)

`supabase/security-hardening-2026-06.sql` einfügen und ausführen. Idempotent. Bewirkt:

- **P0-1 Greeter-PII:** Neue Tabelle `greeter_private` (IBAN, Steuer-ID, Anschrift; RLS: nur Admin + der Greeter selbst). Bestandsdaten werden migriert, danach werden die drei Spalten von `greeter_profiles` **gelöscht** — sie waren über `greeter_profiles_select using (true)` für jeden eingeloggten Nutzer lesbar.
- **P0-2 Missions-Trigger:** `trg_enforce_mission_update` erzwingt serverseitig: `pay`/`company_id`/`candidate_id`/`matched_greeters` sind für Nicht-Admins unveränderlich; `greeter_id` nur als Selbst-Annahme (null → eigene ID); Status nur über legale Übergänge; `completed`/`cancelled` eingefroren. Admin + service_role sind ausgenommen.

Die Verifikations-Selects am Dateiende müssen 0 PII-Spalten und 1 Trigger zeigen.

## 2. Edge Functions neu deployen

```
supabase functions deploy notify-on-message --no-verify-jwt
supabase functions deploy notify-on-mission-status --no-verify-jwt
supabase functions deploy notify-on-lead --no-verify-jwt
supabase functions deploy send-push --no-verify-jwt
supabase functions deploy flight-tracker
supabase functions deploy step-reminders
supabase functions deploy ai-arrival-briefing
```

- **P0-4:** Alle Webhook-/Cron-Functions verlangen jetzt `Authorization: Bearer <service_role_key>`. Die bestehenden DB-Webhooks und CRON_SETUP.sql senden diesen Header bereits — **prüfen:** Dashboard → Database → Webhooks → jeder Hook muss den Authorization-Header gesetzt haben, sonst 401.
- `ai-arrival-briefing` verlangt jetzt einen eingeloggten Nutzer mit Rolle `admin`/`company` (vorher reichte der öffentliche anon-Key → beliebiges Verbrennen von Anthropic-Tokens).

## 3. Frontend deployen

- **P0-3:** `base44Client.js` hat keine hartkodierten Prod-Credentials mehr. Der Modus ist wieder rein env-getrieben: ohne `VITE_SUPABASE_URL`+`VITE_SUPABASE_ANON_KEY` → localStorage-Demo (Dev), mit → Supabase. **Vercel-Env-Variablen prüfen**, sonst baut Prod im Demo-Modus (envGuard bricht den Boot dann ohnehin ab).
- `GreeterEarnings` liest/schreibt Bankdaten jetzt über `GreeterPrivate` — Schritt 1 muss VOR dem Frontend-Deploy laufen, sonst läuft das Speichern der Bankdaten ins Leere.

## 4. Nacharbeiten (nicht automatisierbar)

- [ ] **VAPID-Schlüssel rotieren** (`.vapid.local` lag im Projektordner und wurde mit jeder Projekt-ZIP weitergegeben): `node scripts/gen-vapid.mjs` → neue Keys als Function-Secrets setzen → Datei vom Rechner löschen. Bestehende Push-Subscriptions müssen sich danach neu anmelden.
- [ ] Supabase Auth: **Public Signups deaktivieren** (Invite-only; sonst legt `handle_new_user` für jeden Fremden ein Talent-Profil an).
- [ ] Demo-Seeds (`SEED_DEMO.sql`-Daten) aus der Produktions-DB entfernen.

## Verbleibende P0s aus dem Audit (separat angehen)

Passwort-Reset-Flow (#5) · Notifications-Insert-RLS produktionsfähig (#6) · Rechnungs-PDF (#11) · Impressum-Envs (#12) · `journey_steps`-Schreibrecht einschränken (#14) · Audit-Log fälschungssicher (#15). Details: `AUDIT_REPORT_2026-06-11.md`, Kap. 11.
