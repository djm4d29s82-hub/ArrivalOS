# GO-LIVE — Runbook & Readiness-Audit

> **Status:** Vorbereitung für **öffentlichen Launch** mit echten, zahlenden Kunden.
> Ab jetzt gilt: **stabiler Betrieb statt Demo-Politur.** ArrivalOS ist Operations-Software —
> ein Fehler ist ein echtes Kundenproblem, kein UI-Detail.
>
> Dieses Dokument ist die **eine Quelle der Wahrheit** für den Go-Live. Es ist ein Audit
> (was ist sicher, was ist offen) + Runbook (was muss getan werden). Es ändert **keinen Code**.

---

## 1. Betriebsmodus-Wahrheit (DEV vs PROD)

Der Modus wird **allein durch die Anwesenheit der Supabase-Env-Variablen** bestimmt —
`USE_SUPABASE = !!(VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY)` (`src/api/base44Client.js:10-12`).

| Aspekt | 🔧 DEV (localStorage) | 🟢 PROD (Supabase) |
| --- | --- | --- |
| Datenhaltung | nur Browser, `seedDB` füllt leere DB | Postgres EU (DSGVO), **keine Seeds** |
| Login | Ein-Klick-Rollenwahl (DEV_USERS) | E-Mail/Passwort + Magic-Link |
| `me()` ohne Session | **Auto-Admin** (Demo-Komfort) | **`null`** → Redirect zu `/login` |
| Rolle wechseln | erlaubt (`switchRole`) | **wirft** — verboten |
| `resetDB()` | erlaubt | **wirft** — verboten |
| Identität/Rollen | Dummy-IDs | echte Auth-UID + `public.users` + RLS |

**Env-Schalter:**
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` → schaltet auf Supabase. **Nur diese beiden.**
- `VITE_BACKEND_MODE` (optional) → deklarativer Soll-Wert; muss zur Realität passen, sonst Boot-Fehler.
- ⚠️ **Niemals** `service_role` o. ä. Admin-Secrets im Frontend. Die gehören ausschließlich in Edge Functions.

---

## 2. Readiness-Audit (im Code verifiziert)

### ✅ Schon solide — die DEV/PROD-Trennung greift bereits

- **Prod kann nicht still auf localStorage zurückfallen.**
  `src/lib/envGuard.ts:50` (Layer 2): ein **Production-Build** ohne Supabase-Creds **wirft beim Boot**
  → `src/main.jsx` zeigt einen Diagnose-Screen statt zu mounten. Zusätzlich: HTTPS-Pflicht für die
  Supabase-URL (Layer 4) und Mode-Checksum gegen `VITE_BACKEND_MODE` (Layer 3).
- **Dev-Login ist Prod-unsichtbar.**
  `src/pages/Login.jsx:8` (`IS_DEV = BACKEND_MODE === 'localStorage'`) und `:114` — die DEV_USERS-
  Schnellwahl rendert nur in Dev. In Prod nur E-Mail/Passwort + Magic-Link.
- **Supabase-Auth ist korrekt verriegelt.**
  `src/api/supabaseAdapter.js:93-98` → `me()` liefert `null` ohne Session (kein Auto-Admin);
  `:114-116` → `switchRole()` wirft; `:130-132` → `resetDB()` wirft.
- **Keine Auto-Seeds in Prod.**
  `seedDB` wird nur im localStorage-Pfad aufgerufen (`src/api/base44Client.js:43`); der Supabase-Adapter
  seedet nie. Der Auto-Admin-Fallback in `me()` (`:264-271`) ist localStorage-only und durch envGuard
  in Prod ausgeschlossen.
- **Daten-Isolation serverseitig.**
  `supabase/rls-hardening.sql` erzwingt rollenbasierte RLS (Helper `current_user_role()`,
  `current_company_id()`, `current_candidate_id()`, `current_greeter_id()`, `is_admin()`).
- **Audit-Trail stabil.**
  `supabase/audit-triggers.sql`: `companies`-Crash-Landmine entschärft (die generische `audit_log()`
  liest `NEW.status`; `companies` hat keine status-Spalte und ist aus dem Trigger-Array entfernt).
  `activity_logs` ist append-only (UPDATE/DELETE entzogen).
- **Auth-Layout-Guard (beide Shells).**
  `src/components/layout/DashboardLayout.jsx:60-66` und `src/components/layout/MobileGreeterLayout.jsx`
  (Guard nachgezogen): im Supabase-Modus Redirect zu `/login` bei `!user` und Rollen-Mismatch
  (Admin darf alles).
- **Keine Dev-Affordance in Prod.**
  `src/components/layout/DashboardLayout.jsx` — der „Rolle wechseln"-Switcher rendert nur noch bei
  `!IS_SUPABASE` (Dev). In Prod unsichtbar.

### ⛔ Offen vor öffentlichem Launch (Code-Fixes)

_Keine offenen Client-Code-Findings mehr — Fix A + Fix B (Abschnitt 4) sind umgesetzt und der Build
ist grün._ Verbleibend: die Cloud-Ops (Abschnitt 5) + Golden-Path-QA (Abschnitt 6).

### 🔑 Login/Onboarding-Kette (Review)
✅ Token nur als `sha256hex`; Rolle/company/candidate aus der Invite-Zeile; E-Mail-Lock; `admin-invite`
JWT+Rollen-gated; Approval-Gate (Talent active, privilegiert pending). **Behoben:**
- **R1 ✅** `candidate_id` wird in `admin-invite` gegen die Ziel-Firma validiert (kein Tenant-Leak).
- **R2 ✅** `accept-invite` rollt verwaiste Auth-User bei Profil-Fehler zurück; Invite wird erst nach
  erfolgreicher Profil-Anlage verbraucht.

**Behoben (Security/Reliability-Pass):**
- **R3 ✅** Sentry redigiert jetzt `token`/`email`/`code`/`access_token`/`refresh_token` aus **jeder** URL —
  `request.url`, `Referer`-Header UND Navigation/Fetch/XHR-**Breadcrumbs** (`src/lib/sentry.js`, `scrubUrl`).
  Zusätzlich zieht `Register.jsx` den Token nach dem Lesen per `history.replaceState` aus der Adresszeile
  (kein Verbleib in History/Breadcrumbs). Der Sentry-Body-Vektor ist damit geschlossen.
- **R6 ✅** `admin-invite` meldet das **echte** Mail-Ergebnis (`emailSent = resp.ok`, Fehler → `false`) statt
  pauschal `true`; `APP_URL`-Default ist jetzt `https://arrivalgermany.com` (kein relativer Link mehr);
  Branding/From auf ArrivalOS/`support@arrivalgermany.com`.

**Nur markiert (kein Fix — Entscheidung/Folge-Schritt):**
- **R4 🟡** Kein Server-Peek in Supabase (`peekInvite`→null) → „Einladung ungültig"-Seite erscheint nie; Nutzer
  merkt Ungültigkeit erst nach Absenden. Reine UX.
- **R5 🟡** Bestehende E-Mail: `createUser` schlägt hart fehl (Enumeration-Meldung; kein „Invite für bestehenden
  Nutzer"-Pfad). Produktentscheidung.

### ☁️ Offen — nur durch den Nutzer ausführbar (Cloud-Ops)
Supabase-Projekt, SQL-Reihenfolge, Edge-Functions, Secrets, Storage, Backups, Auth-URLs, Domain,
Deploy. → Abschnitt 5.

---

## 3. Freeze-Regeln (ab sofort verbindlich)

1. **Keine neuen Demo-Features.** Kein weiterer Personas-/Story-Ausbau, keine „nice to have"-UX
   ohne Business-Impact. Fortschritt = Stabilität, echte Flows, Datenintegrität.
2. **Supabase ist die einzige Source of Truth** in Prod. localStorage bleibt ausschließlich Dev.
3. **Nur `VITE_SUPABASE_ANON_KEY` im Frontend.** Niemals `service_role`/Admin-Secrets — die leben
   strikt serverseitig (Edge Functions).
4. **Token niemals im Klartext.** Invites: nur `token_hash`, mit `expires_at`, einmalig (`status='accepted'`).
5. **`seed.sql` niemals in Produktion ausführen.** Es ist Staging-/Demo-Material mit echten Personas-Namen.
6. **Backups/PITR aktiv**, bevor der erste echte Kunde Daten anlegt.

---

## 4. Code-Härtung vor Launch — ✅ UMGESETZT (Build grün)

**Fix A — Rolle-wechseln nur in Dev.** `src/components/layout/DashboardLayout.jsx`
- Switcher + Dropdown hinter `{!IS_SUPABASE && ( … )}` gesetzt. In Prod (Supabase) nicht mehr
  gerendert; der „wirft beim Klick"-Pfad ist tot.

**Fix B — Guard-Parität im Greeter-Shell.** `src/components/layout/MobileGreeterLayout.jsx`
- `IS_SUPABASE = !!base44.raw` ergänzt + Redirect-Effect analog zu `DashboardLayout.jsx:60-66`:
  kein `user` → `/login` (mit `from`-State); Rolle weder `greeter` noch `admin` → eigenes Portal.
  Nur im Supabase-Modus aktiv; Dev unberührt.

**Verifikation:** `vite build` grün. Manuell vor Launch im Supabase-`.env` bestätigen: kein
„Rolle wechseln" sichtbar; `/greeter-dashboard` ohne Session → `/login`.

---

## 5. Cloud-Ops-Checkliste (nur der Nutzer — von hier nicht testbar)

Reihenfolge strikt einhalten. Details in `supabase/README.md`.

### Hosting / Vercel
> **Repo-Layout:** Das GitHub-Repo `djm4d29s82-hub/ArrivalOS` ist **flach** — `package.json`,
> `vite.config.js`, `index.html`, `vercel.json` liegen im **Repo-Root**. Vercel Root Directory daher
> auf **`./` (Repo-Root)** lassen, NICHT auf einen Unterordner setzen.
- [ ] **Build-Skript NICHT ändern.** `package.json` baut via `node node_modules/vite/bin/vite.js build`
      (umgeht `vite: Permission denied`). Niemals `buildCommand: "vite build"` setzen (Vercel-Settings
      oder vercel.json) — das bricht den Build wieder. Das committete `vercel.json` überschreibt
      `buildCommand` bewusst **nicht**.
- [ ] **SPA-Rewrite verifizieren** (im `vercel.json` enthalten): direkter Aufruf von
      `/register?token=…`, `/admin`, `/company/missions/<id>` darf **nicht** 404 liefern (BrowserRouter).
- [ ] **Env-Vars (Production-Scope), DANN frischer Build OHNE Cache** — Vite bakt `VITE_*` zur
      Build-Zeit: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (kein `service_role`), optional
      `VITE_SENTRY_DSN`/`VITE_SENTRY_ENV`, `VITE_PLAUSIBLE_*`. Nach dem Setzen neu deployen
      (Push oder Redeploy mit deaktiviertem Build-Cache) und das **neueste** Deployment öffnen.
- [ ] **Supabase Auth → URL Configuration** auf die Vercel-Domain setzen (Site-URL + Redirect `…/*`),
      sonst brechen Magic-Link/Invite-Redirect.

### Supabase
- [ ] **Projekt** in Region **Frankfurt (EU Central)** anlegen, DB-Passwort sicher ablegen.
      Project-Ref (bestehend): `jtaegmuftgxzjddfevbs`.
- [ ] **Basis-SQL in dieser Reihenfolge** im SQL-Editor ausführen:
      `schema.sql` → `rls-hardening.sql` → `audit-triggers.sql` → `rate-limit.sql` → `storage-policies.sql`.
- [ ] **Migrationen** aus `supabase/migrations/` ausführen (idempotent, `… if not exists`; auf einer
      bestehenden DB der sichere, explizite Weg — `schema.sql` spiegelt die meisten bereits):
      `2026-05-mission-flight-number.sql` · `2026-05-journey-step-scheduled-at.sql` ·
      `2026-05-journey-step-bring-items.sql` · `2026-05-mission-templates.sql` ·
      `2026-05-document-step-link.sql` · `2026-06-mission-services.sql` (Services Marketplace).
- [ ] **Storage-Bucket** `documents` (Public = Off), danach `storage-policies.sql`.
- [ ] **Edge Functions deployen (alle 8):**
      - **Auth:** `admin-invite` (**mit** JWT-Verify) · `accept-invite` (**`--no-verify-jwt`**).
      - **Transaktional (E-Mail):** `notify-on-message` · `notify-on-lead` · `notify-on-mission-status`
        (alle `--no-verify-jwt`).
      - **Cron (täglich):** `step-reminders` · `flight-tracker` (alle `--no-verify-jwt`).
      - **KI:** `ai-arrival-briefing` (**mit** JWT-Verify — wird vom angemeldeten Company-Portal aufgerufen):
        `supabase functions deploy ai-arrival-briefing`.
- [ ] **Secrets setzen:** `APP_URL` (`https://arrivalgermany.com`), `RESEND_API_KEY`,
      `RESEND_FROM` (`ArrivalOS <support@arrivalgermany.com>`), `SALES_INBOX` (`support@arrivalgermany.com`),
      `AVIATIONSTACK_API_KEY` (flight-tracker), `ADMIN_EMAIL` (step-reminders Eskalation),
      **`ANTHROPIC_API_KEY`** (ai-arrival-briefing — KI-Briefing fürs Unternehmen; ohne Key zeigt das UI
      ruhig „KI nicht konfiguriert"), optional `CRM_FORWARD_URL`.
      *(Die Code-Defaults zeigen bereits auf arrivalgermany.com — Secrets überschreiben sie.)*
- [ ] **Database → Webhooks:** `messages` INSERT → `notify-on-message`; `leads` INSERT → `notify-on-lead`;
      **`missions` UPDATE → `notify-on-mission-status`** (Company-Status-Mails bei Meilensteinen).
- [ ] **Cron einrichten:** Extensions **`pg_cron` + `pg_net`** aktivieren (Database → Extensions), dann
      `supabase/functions/CRON_SETUP.sql` mit `<PROJECT_REF>=jtaegmuftgxzjddfevbs` ausführen
      *(Alternative: Dashboard → Edge Functions → Schedules)*. Test ohne Warten:
      `supabase functions invoke step-reminders` / `flight-tracker` → JSON-Summary; neue Zeilen in `notifications`.
- [ ] **Auth:** E-Mail + Magic-Link an; **URL Configuration** Site-URL + Redirect `https://arrivalgermany.com/*`.
- [ ] **Backups/PITR aktivieren** (Pflicht vor erstem echten Kunden).
- [ ] **RLS-Tests** (`rls-tests.sql`) mit 4 Test-Usern durchspielen — erwartete Ergebnisse stehen als Kommentare.
- [ ] 🔑 **`service_role`-Key rotieren** (Dashboard → API → Reset). Er wurde beim E2E-Seeding im Chat
      eingefügt → vor Launch neu generieren. **Niemals** im Frontend; nur in Edge-Function-Secrets.
- [ ] **Env beim Host:** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (Project URL + anon public Key). Kein service_role.
- [ ] **Impressum-Pflichtfelder** als `VITE_COMPANY_*` setzen, bevor öffentlich:
      `VITE_COMPANY_LEGAL_NAME`, `VITE_COMPANY_STREET`, `VITE_COMPANY_ZIP`, `VITE_COMPANY_HRB`,
      `VITE_COMPANY_VAT_ID`, `VITE_COMPANY_REGISTER_COURT`. Aktuell **Platzhalter** in
      `src/lib/siteConfig.js` (nicht erfunden) — echte Rechtsform/Adresse noch offen
      (GmbH/UG vs. Einzelunternehmen). Brand/E-Mail/Telefon/Gründer sind bereits real.
- [ ] **Erstes Admin-Onboarding:** ersten Admin manuell anlegen, dann via In-App-Invite weitere Rollen
      (Invite → User → Approval; privilegierte Rollen landen in „Ausstehende Freigaben").
- [ ] **App starten** → Konsole zeigt `[ArrivalOS] Backend: supabase`. Falls `localStorage`: env nicht geladen.

### Domain / DNS (Hostinger → Vercel)
- [ ] **`arrivalgermany.com`** in Vercel als Domain hinzufügen (Project → Settings → Domains), dann bei
      **Hostinger** die von Vercel angezeigten DNS-Einträge setzen (Apex `A` → Vercel-IP **oder**
      `CNAME`/`ALIAS`; `www` → `cname.vercel-dns.com`). Nach DNS-Propagation Domain in Vercel verifizieren.
- [ ] Danach **Supabase Auth → URL Configuration** auf `https://arrivalgermany.com` setzen (siehe oben),
      sonst brechen Magic-Link/Invite-Redirects auf der echten Domain.

---

## 6. Golden-Path-QA-Matrix (vor Launch grün)

End-to-End-Kette: **Company legt Ankunft an → Ops weist Greeter zu → Greeter akzeptiert →
Talent sieht Update → Abholung → Mission completed.**

| Szenario | Erwartung |
| --- | --- |
| Happy Path (Desktop) | Kette läuft ohne Fehler durch; Status-Updates erscheinen bei allen Rollen |
| **Mobile** (Greeter am Gate) | Foto/Flug/Sprache/nächster Schritt sofort sichtbar; 1-Tap-Status funktioniert |
| **Langsames Netz** | optimistische Status-Updates überleben; Sync bei Reconnect |
| **Reload / Session-Restore** | nach Reload bleibt Login + Rolle erhalten; keine Auto-Admin-Überraschung |
| **Invite-Expiry / falscher Token** | abgelaufener/ungültiger Token wird abgewiesen, klare Meldung |
| **Rollen-Isolation** | Talent kann `/admin` nicht öffnen (Redirect); fremde Daten unsichtbar (RLS) |
| **Approval-Gate** | privilegierte Rolle nach Registrierung `pending_approval` → „Zugang wird geprüft"; Talent sofort aktiv |

---

## 7. Definition of „launch-ready"

- [ ] Cloud-Ops-Checkliste (Abschnitt 5) vollständig abgehakt — inkl. **Backups/PITR** und **RLS-Tests grün**.
- [ ] **Alle 6 Migrationen** ausgeführt; **alle 8 Edge Functions** deployt (inkl. `ai-arrival-briefing` +
      `ANTHROPIC_API_KEY`); **Cron** geplant (`step-reminders`/`flight-tracker`); **`missions`-UPDATE-Webhook** aktiv.
- [ ] **Domain** `arrivalgermany.com` live auf Vercel; **Supabase Auth-URL** auf die Domain gesetzt.
- [ ] 🔑 **`service_role`-Key rotiert** nach dem E2E-Seeding.
- [ ] **Impressum-Pflichtfelder** (`VITE_COMPANY_*`: Rechtsname, Adresse, HRB/USt-ID, Registergericht) gesetzt.
- [ ] Code-Härtung Fix A + Fix B (Abschnitt 4) umgesetzt und im Supabase-Build verifiziert.
- [ ] Golden-Path-QA-Matrix (Abschnitt 6) vollständig grün — inkl. Mobile, langsames Netz, Rollen-Isolation.
- [ ] Keine `service_role`-Secrets im Frontend; `.env` nur mit `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- [ ] `seed.sql` **nicht** in Prod ausgeführt.
- [ ] Freeze-Regeln (Abschnitt 3) sind dem Team bekannt und verbindlich.

> Erst wenn alle Häkchen gesetzt sind, gehen echte Kunden auf das System.
