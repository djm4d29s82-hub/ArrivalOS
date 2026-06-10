# OPS_AGENT_SPEC — Agenten-Playbook für Arrival Germany

> **Zweck:** Diese Datei sagt einer **Flotte autonomer Agenten** (PaperclipAI), wie sie
> `arrivalgermany.com` **selbständig betreiben und überwachen**. Jede Rolle (A0–A11) ist eine
> in sich abgeschlossene Aufgabe — **spawne pro Rolle einen Agenten** und gib ihm die jeweilige
> Karte als Auftrag. A0 (Orchestrator) koordiniert die übrigen; A1–A11 = Betrieb/Monitoring,
> **A12 = Kunden-Support** (spricht mit Kund:innen und meldet Feedback zurück an A0).
>
> **Stand:** Juni 2026 · Maßgeschneidert auf dieses Repo. Prüf-Reihenfolgen/Deploy stehen in
> [GO_LIVE.md](GO_LIVE.md) — dieses Dokument **dupliziert** das nicht, sondern verweist darauf.

---

## 0. Projekt-Steckbrief (für jeden Agenten gültig)

| Ding | Wert |
| --- | --- |
| Domain | `https://arrivalgermany.com` |
| Portale | `/admin` · `/greeter-dashboard` · `/talent` · `/company` |
| Stack | React 18 + Vite 8 (Frontend, **Vercel**) · Supabase (Postgres+Auth+Storage+Edge, **EU-Frankfurt**) |
| Supabase-Projekt-Ref | `jtaegmuftgxzjddfevbs` |
| Supabase-Base-URL | `https://jtaegmuftgxzjddfevbs.supabase.co` |
| REST / Auth-Health | `…/rest/v1/` · `…/auth/v1/health` |
| Edge-Functions-URL | `…/functions/v1/<name>` |
| E-Mail | Resend, Absender `ArrivalOS <support@arrivalgermany.com>` |
| Fehler-Telemetrie | **Sentry** (`src/lib/sentry.js`) — deckt JS-/Edge-Fehler, 5xx, Performance ab |
| KI | Anthropic `claude-haiku-4-5` (nur `ai-arrival-briefing`) |
| Flugdaten | AviationStack (Free 500 req/Monat) |
| DNS / Domain | Hostinger |
| VPS | Ubuntu mit `openclaw` / `PaperclipAI` / `Hermes` (Container) |
| Gründer | Mustafa Ibrahim & Anton Rauschenbach · support@arrivalgermany.com · +49 151 24413723 |

**Eiserne Regeln (nie verletzen):**
- **Nie** `service_role` / `sb_secret_…` ins Vercel-Bundle/Frontend — nur Supabase Secrets bzw. Agent-Umgebung.
- **Nie** RLS deaktivieren. Company darf **niemals** Daten anderer Companies sehen (kritischstes Datenleck).
- **Nie** echte Tokens/PII in Logs, Repo oder Chat. Tokens nur als Umgebungsvariablen (siehe §13).
- **Nie** `seed.sql` / `SEED_DEMO.sql` gegen Prod ohne ausdrücklichen Auftrag.

---

## 1. Globale Konventionen

### Prioritäts-Matrix (steuert Reaktionszeit)
- 🔴 **Kritisch — sofort:** Supabase pausiert/alle Portale down · RLS-Leck (fremde Company-Daten) · SSL abgelaufen ·
  `mission_services`-Tabelle fehlt (Marketplace-Crash) · `service_role` kompromittiert · Greeter-App offline bei
  laufender Mission (Talent wartet am Flughafen) · `ANTHROPIC_API_KEY` abgelaufen (KI down).
- 🟡 **Wichtig — < 1 h:** Storage/DB > 80 % Quota · `notify-*`-Function-Fehler · Mission > 2 h in `matched` ohne
  Greeter · Vercel-Deploy fehlgeschlagen · Cron nicht gelaufen.
- 🟢 **Routine — täglich/wöchentlich:** Bundle wächst · Slow Queries · Anthropic-Kosten · DNS-Records-Drift ·
  Broken Links auf der Landing.

### Einheitliches Alert-Format (jeder Agent meldet so an A0)
```json
{ "agent": "A2", "level": "crit|warn|ok", "check": "supabase_db_size",
  "detail": "DB 412 MB / Alert 400 MB", "ts": "<ISO>", "suggested_fix": "…", "auto_fixed": false }
```
- **Dedupe:** gleicher `check`+`level` nicht öfter als 1×/Stunde re-alarmieren (Flapping vermeiden).
- **Kanäle:** E-Mail via Resend an `ADMIN_EMAIL`; Slack via `SLACK_WEBHOOK_URL` (falls gesetzt). 🔴 → beide sofort.
- **Eskalationskette:** Agent → A0 (Orchestrator) → 🔴 sofort an Gründer (E-Mail + Slack), 🟡 gebündelt stündlich,
  🟢 Tages-Digest.

### Gemeinsame Health-Quelle (entkoppelt Sensorik von Reaktion)
- Empfehlung: A0 schreibt jedes Ergebnis in eine Tabelle **`health_checks`** (`checked_at, agent, check, level,
  detail jsonb`) in Supabase. Andere Agenten/Dashboards lesen daraus. (Tabelle existiert noch nicht → A0 legt sie
  einmalig an; idempotent `create table if not exists`.)

---

## 2. Agenten-Rollen

> Karten-Schema: **Mission · Takt · Zugänge · Checks (mit Schwellen + Projekt-Hook) · Alarm · Erlaubte Auto-Fixes**

### A0 — Orchestrator / Incident-Commander
- **Mission:** Sammelt Signale aller Agenten, dedupt, priorisiert (🔴/🟡/🟢), routet Alerts, führt Incident-Log,
  entscheidet Eskalation und ob ein Auto-Fix ausgelöst werden darf.
- **Takt:** dauerhaft (Event-getrieben) + 1×/min Aggregation.
- **Zugänge:** Supabase service_role (für `health_checks` + `notifications`), Resend, Slack-Webhook.
- **Checks:** Vollständigkeit (meldet sich jeder Agent im erwarteten Takt? → „Agent A_x stumm" ist selbst ein 🟡).
- **Alarm:** bündelt & versendet; schreibt In-App-`notifications` (type `alert`/`critical`) an `ADMIN_EMAIL`.
- **Auto-Fix:** nur **freigeben/orchestrieren**, nicht selbst ausführen. 🔴-Auto-Fixes brauchen eine Allow-Liste.
- **Support-Schleife (zweiseitig):** nimmt von **A12** strukturiertes `product_feedback/bug/ux` entgegen, dedupt
  und **routet** (Bug → Coding-Agent bzw. A4/A6 · UX → Backlog · kritisch → Gründer). Gibt **umgekehrt** den
  aktuellen Health-/Incident-Status an A12 weiter, damit A12 Kund:innen bei Störungen **proaktiv & ehrlich** informiert.

### A1 — Uptime & Erreichbarkeit
- **Mission:** Ist die Seite erreichbar und schnell?
- **Takt:** alle 60 s.
- **Zugänge:** nur HTTP (kein Token).
- **Checks:**
  - `GET https://arrivalgermany.com` → **200**, TTFB **< 500 ms** (aus DE gemessen).
  - Portale erreichbar (SPA-Rewrite ok): `/admin`, `/greeter-dashboard`, `/talent`, `/company` → kein 404.
  - `GET /manifest.webmanifest` → 200 (401 nur auf `*.vercel.app`-Preview = ok).
  - `GET https://jtaegmuftgxzjddfevbs.supabase.co/rest/v1/` → 200 · `…/auth/v1/health` → 200.
  - SSL-Zertifikat `arrivalgermany.com` gültig, **Ablauf > 30 Tagen**.
- **Alarm:** non-200 oder Timeout → 🔴 (alle Portale down). SSL < 30 Tage → 🟡. Latenz > 500 ms anhaltend → 🟢.
- **Auto-Fix:** keiner (nur melden). Bei Supabase-down siehe A2 (Keepalive/Reaktivierung).

### A2 — Supabase Health & Quota  *(Free-Plan-Wächter — höchste Priorität)*
- **Mission:** Supabase lebt, ist nicht pausiert, Limits nicht gerissen.
- **Takt:** Keepalive alle 6 h; Quota-Check 1×/h.
- **Zugänge:** Supabase **Management-API** (`SUPABASE_ACCESS_TOKEN`, Personal Access Token) **+** service_role
  (für DB-Metriken/Keepalive).
- **Checks:**
  - **Projektstatus** `GET https://api.supabase.com/v1/projects/jtaegmuftgxzjddfevbs` → `ACTIVE_HEALTHY`
    (nicht `PAUSED`/`INACTIVE`). **Free Plan pausiert nach 7 Tagen Inaktivität** → dann alle Portale down.
  - **Keepalive (Self-Heal):** mindestens 1×/Tag eine echte DB-Query absetzen (z. B. `select 1` über REST mit
    service_role), damit das Projekt nie als inaktiv gilt.
  - **DB-Größe:** `pg_database_size(current_database())` → Limit 500 MB, **Alert > 400 MB**, 🔴 > 470 MB.
  - **Storage:** `sum((metadata->>'size')::bigint) from storage.objects` → Limit 1 GB, **Alert > 800 MB**.
  - **MAU < 45.000**, **Edge-Invocations < 450.000/Monat**, **Bandbreite < 4 GB/Monat**,
    **Realtime < 160** gleichzeitige Verbindungen (alle via Management-API Usage-Endpoints).
- **Alarm:** PAUSED/unreachable → 🔴. Quota-Schwellen → 🟡 (🔴 bei harten Limits).
- **Auto-Fix:** **Keepalive** (erlaubt). Reaktivierung eines pausierten Projekts → Management-API `…/restore`/Resume
  **nur wenn von A0 freigegeben**; sonst sofort 🔴 an Gründer (Reaktivierung dauert 2–3 Min).

### A3 — Vercel / Deploy
- **Mission:** Frontend-Deploys gesund; bei Fehl-Deploy zurückrollen.
- **Takt:** Event (Deploy-Webhook) + 1×/h Fallback.
- **Zugänge:** **Vercel-API-Token** (`VERCEL_TOKEN`), Projekt = `ArrivalOS` (Root `./`, flaches Repo).
- **Checks:**
  - Letzter Deploy-State = `READY` (kein `ERROR`/`CANCELED`).
  - Build-Command unverändert `node node_modules/vite/bin/vite.js build` (nie `vite` direkt → Permission-Falle).
  - Bundle: `index-*.js` **< 600 kB** minified (aktuell ~524 kB; Warnschwelle aktiv).
  - Env-Vars gesetzt: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (**nur** `sb_publishable_…`, **nie** `sb_secret_…`).
  - Deployment-Protection auf Preview-URLs aktiv (verhindert 401 auf `arrival-os-git-*`).
- **Alarm:** Deploy `ERROR` → 🟡 (🔴 wenn Prod dadurch down, prüft A1). `sb_secret_` in Env gefunden → 🔴 (Leak).
- **Auto-Fix (mit A0-Freigabe):** **Rollback** auf letzten `READY`-Deploy via Vercel-API
  (`POST /v9/projects/.../rollback` bzw. Promote des letzten guten Deployments). Standard: erst alarmieren,
  Rollback nur auf 🔴 + Allow-Liste.

### A4 — DB-Integrität & Migrationen
- **Mission:** Schema vollständig & konsistent, keine Daten-Anomalien.
- **Takt:** stündlich (Integrität), bei Deploy (Migrationen).
- **Zugänge:** service_role / SQL.
- **Checks (alle per SQL):**
  - **Migrationen vorhanden** (vgl. [GO_LIVE.md](GO_LIVE.md) — 18 Migrationen). Kerntabellen existieren:
    `users, companies, candidates, missions, journey_steps, mission_services, mission_templates,
    greeter_profiles, documents, messages, notifications, activity_logs, invoices, sops, invites, settings,
    payouts, partners, mission_expenses, push_subscriptions, service_consents, reviews`.
  - **Kein Schema-Drift** ggü. `supabase/schema.sql`.
  - **State-Machine gültig:** alle `missions.status` ∈ erlaubten Werten; `mission_services.status` ∈
    `requested|in_progress|active|done|skipped`; `greeter_profiles.status` ∈ `available|busy|offline`.
  - **Waisen:** keine `mission_services`/`journey_steps`/`documents` ohne gültige `mission_id`/`step_id`.
  - **Pflichtdaten:** keine Mission ohne `company_id`; `journey_steps.order` als Vielfache von 10.
- **Alarm:** fehlende Kerntabelle (z. B. `mission_services`) → 🔴. Drift/Waisen/State-Verstoß → 🟡.
- **Auto-Fix:** keiner automatisch (DDL/Datenkorrektur nur per freigegebenem, idempotentem SQL-Snippet).

### A5 — Security & RLS
- **Mission:** Rollen-Isolation hält; keine Secret-Leaks.
- **Takt:** 1×/Tag (Probes) + bei Deploy.
- **Zugänge:** je ein Test-Login pro Rolle (admin/greeter/talent/company) **oder** SQL-Policy-Audit.
- **Checks:**
  - **Company-Isolation** (kritischstes Leck): Company-Token darf via REST **nur** eigene `missions`/`candidates`
    sehen (`company_id`-Filter erzwingt RLS). Greeter nur zugewiesene, Talent nur eigene, Admin alles.
  - RLS-Helper vorhanden & korrekt: `is_admin()`, `current_user_role()`, `current_company_id()`,
    `current_candidate_id()`, `current_greeter_id()`.
  - **Rechnungs-Entwürfe** (`invoices.status='draft'`) für Company unsichtbar (UI **und** RLS).
  - **Secret-Hygiene:** Prod-Bundle (`https://arrivalgermany.com/assets/index-*.js`) enthält **kein** `sb_secret_`.
  - Sentry-Scrubbing aktiv (`scrubUrl` redigiert `token/email/code/access_token/refresh_token`).
  - CORS-Whitelist nur `arrivalgermany.com` + `localhost:5173` (kein `*`).
- **Alarm:** jede Cross-Tenant-Sichtbarkeit oder `sb_secret_` im Bundle → 🔴 **sofort** + Empfehlung
  „service_role rotieren (Supabase → Settings → API → Reset)".
- **Auto-Fix:** keiner (Sicherheit = Mensch entscheidet); nur sofort-Alarm + klarer Handlungsschritt.

### A6 — Edge Functions & E-Mail-Infrastruktur
- **Mission:** Alle Functions/Crons/Webhooks/Mails laufen.
- **Takt:** Function-Logs 1×/h; Cron-Verifikation täglich; Mail-DNS wöchentlich.
- **Zugänge:** Supabase Management-API (Function-Logs/Status), Resend-API (`RESEND_API_KEY`).
- **Checks:**
  - **10 Functions deployed** mit korrekter JWT-Einstellung:
    `admin-invite` (JWT **ja**) · `accept-invite` (**no-verify**) · `notify-on-message` · `notify-on-lead` ·
    `notify-on-mission-status` (alle **no-verify**) · `step-reminders` · `flight-tracker` (Cron, **no-verify**) ·
    `ai-arrival-briefing` (JWT **ja**) · `partner-referral` (JWT **ja**) · `send-push` (**no-verify**, Webhook).
  - Keine Function im Timeout (Limit 150 s); Logs ohne neue Fehler-Spitzen.
  - **Webhooks aktiv:** `missions` UPDATE → `notify-on-mission-status`; `notifications` INSERT → `send-push`;
    `messages` INSERT → `notify-on-message`; `leads` INSERT → `notify-on-lead`.
  - **Crons gelaufen:** `step-reminders` (täglich 08:00), `flight-tracker` (täglich 07:00) — letzte Ausführung < 25 h.
  - **Resend:** Quota nicht erschöpft, Bounce-Rate < 2 %, **SPF/DKIM/DMARC** für `arrivalgermany.com` gültig.
  - **AviationStack** < 500 req/Monat. **Anthropic:** Key gültig, Modell `claude-haiku-4-5` nicht deprecated,
    Monatsbudget gesetzt, Alert bei 80 %, `status.anthropic.com` grün.
- **Alarm:** Function-Fehler/Cron ausgefallen/Webhook inaktiv → 🟡. `ANTHROPIC_API_KEY` ungültig → 🔴 (KI down).
- **Auto-Fix:** Cron manuell nachtriggern (`functions invoke <name>`) erlaubt; Re-Deploy nur mit A0-Freigabe.

### A7 — Mission-Continuity (Business-Wächter)
- **Mission:** Kein Talent fällt durchs Raster.
- **Takt:** alle 15 min.
- **Zugänge:** service_role / SQL.
- **Checks:**
  - Mission **> 2 h in `matched`** ohne `greeter_id` → Greeter fehlt (🟡, eskaliert wie in `step-reminders`).
  - `journey_steps.scheduled_at < now()` & `status != completed` → überfällig.
  - `mission_services.due_at < now()` & `status not in (done,skipped)` → überfälliger Service.
  - **Greeter offline bei laufender Mission**: Mission `status=in_progress`/`greeter_stage in (on_the_way,arrived)`
    und zugewiesener Greeter `status=offline` → 🔴 (Talent wartet evtl. am Flughafen).
- **Alarm:** wie oben; Benachrichtigung an Admin + (wo sinnvoll) zugewiesenen Greeter.
- **Auto-Fix:** Re-Dispatch/Eskalation **vorschlagen** (Admin bestätigt); keine stillen Status-Änderungen.

### A8 — Performance
- **Mission:** App bleibt schnell & schlank.
- **Takt:** täglich.
- **Zugänge:** Vercel Speed Insights, service_role (Slow-Query-Stats).
- **Checks:** Core Web Vitals grün · Bundle `index-*.js` wächst nicht über 600 kB · Slow Queries (pg_stat) ·
  Indizes vorhanden (`idx_documents_step`, `idx_mission_services_mission`, `idx_mission_services_due`,
  `idx_mission_expenses_*`, `idx_payouts_*`) · keine offensichtlichen N+1 (v. a. OperationsCenterDashboard).
- **Alarm:** 🟢 (Routine). Bundle > 600 kB → 🟡 mit Hinweis „Lazy-Loading großer Seiten".
- **Auto-Fix:** keiner (Code-Optimierung = Coding-Agent/Mensch).

### A9 — VPS / Infrastruktur
- **Mission:** Der Server, auf dem die Agenten selbst laufen, ist gesund.
- **Takt:** alle 5 min.
- **Zugänge:** **SSH** auf den Ubuntu-VPS.
- **Checks:** VPS erreichbar (SSH/HTTP) · Prozesse/Container `openclawbot`, `PaperclipAI`, `Hermes` laufen ·
  Docker-Daemon aktiv · Auto-Start nach Reboot (`systemctl` / `restart=always`) · **Disk < 80 %** · **RAM < 80 %** ·
  UFW aktiv, nur Ports 22/80/443 offen.
- **Alarm:** Container tot / Disk|RAM > 80 % → 🔴 (sonst überwacht niemand mehr!).
- **Auto-Fix:** Container neu starten (`docker restart`) erlaubt; Disk aufräumen (Logs rotieren) erlaubt.

### A10 — DNS / Domain
- **Mission:** Domain & Mail-DNS stabil.
- **Takt:** täglich.
- **Zugänge:** DNS-Lookups + Hostinger-Konto (read).
- **Checks:** `arrivalgermany.com` → Vercel (A/CNAME korrekt) · **Domain-Ablauf > 60 Tagen**, Auto-Renew an ·
  Hostinger-2FA aktiv · MX/SPF (`v=spf1 include:resend.com ~all`)/DKIM/DMARC korrekt ·
  **Record-Drift**: monatlicher Vergleich erwartete vs. aktuelle Records (DNS-Hijacking-Schutz) ·
  Supabase Auth Site-URL/Redirect = `https://arrivalgermany.com`.
- **Alarm:** Drift/Ablauf < 60 Tage/SSL-Kette kaputt → 🔴/🟡.
- **Auto-Fix:** keiner (Registrar-Änderung = Mensch).

### A11 — DSGVO / Compliance
- **Mission:** Datenschutz bleibt sauber.
- **Takt:** wöchentlich.
- **Zugänge:** SQL + Code-Review-Lesezugriff.
- **Checks:** Alle PII in EU (Supabase FFM) · KI-Briefing-Payload **nur** anonymisierte Zahlen (keine Namen/
  E-Mails/Adressen), Ergebnis **nicht** in DB gespeichert · Logs ohne Passwörter/Keys/volle Tokens ·
  Talent-Löschung kaskadiert (Missionen/Services/Dokumente) · **Impressum vollständig** (echte HRB/USt-ID/
  Amtsgericht — `siteConfig.js`-Platzhalter **nicht** mit erfundenen Daten füllen) · Datenschutzerklärung nennt
  Supabase/Resend/Anthropic als Verarbeiter.
- **Alarm:** PII in Logs/KI-Payload → 🔴. Unvollständiges Impressum → 🟡 (rechtliches Risiko).
- **Auto-Fix:** keiner (rechtlich/Mensch).

### A12 — Customer-Support / Concierge  *(spricht mit Kund:innen + Feedback an A0)*
- **Mission:** Erste Anlaufstelle für **Kund:innen** (Unternehmen/HR = zahlende Kund:innen, primär; auch Talente
  & Greeter): Fragen beantworten, beim Onboarding/Nutzen helfen, Probleme triagieren, an Mensch eskalieren —
  und **wiederkehrendes Feedback strukturiert an A0** zurückgeben.
- **Takt:** event-getrieben (neue Nachricht/Lead) + **Tages-Digest** des gesammelten Feedbacks an A0.
- **Zugänge:** Supabase (read für Kontext, write `messages`/`leads`/`notifications`), Resend (E-Mail),
  Anthropic (Gesprächs-Modell, z. B. `claude-haiku-4-5`), **optional** WhatsApp-Bridge (Greeter nutzen WhatsApp).
- **Kanäle & Zielgruppen (echte Produkt-Surfaces):**
  - **Unternehmen/HR:** Kontaktformular-Leads (`leads` → `notify-on-lead`), E-Mail `support@arrivalgermany.com`,
    In-App-Chat (`messages`).
  - **Talente:** Journey-/Onboarding-FAQ, In-App-Chat (`messages`) — **Talent-SOS bleibt Mensch/112, nie Bot**.
  - **Greeter:** Fragen zu Einsätzen/Verdienst/Spesen, In-App-Chat / WhatsApp.
- **Darf:**
  - FAQ **DE/EN** (Talent ist zweisprachig); Missionsstatus **read-only** erklären; Onboarding führen
    (Ankunft anlegen, CSV-Import, KI-Briefing, Spesen einreichen).
  - Tickets/Leads anlegen, Konversation zusammenfassen, sauber an Mensch übergeben.
  - **Proaktiv** kommunizieren: meldet A0 eine Störung (z. B. A1 „down"), informiert A12 betroffene Kund:innen
    ehrlich („Wir wissen Bescheid, arbeiten daran") statt sie raten zu lassen.
- **Feedback-Schleife (Kern):** erkennt Muster (z. B. „5 Unternehmen melden CSV-Import-Fehler", „Talente verstehen
  Schritt X nicht") → meldet an **A0**: `{ "type":"bug|ux|product_feedback", "severity":"…", "summary":"…",
  "evidence_count": N, "examples":[…anonymisiert…] }`. A0 routet weiter (siehe A0).
- **Guardrails (Trust-Linie strikt):**
  - **Nichts erfinden** — keine Preise/Partner/Termine/Zusagen erfinden; unklar → „im Aufbau" / eskalieren.
  - **Kein Datenleck:** nur Daten der jeweiligen Person/Company zeigen (RLS-Logik achten) — **niemals** fremde
    Missionen/Unternehmen.
  - **Recht/Beschwerde/Kündigung/Datenschutz/Vertrag** → **an Mensch (Gründer)** eskalieren, nicht selbst entscheiden.
  - **Notfall/SOS** (Talent am Gate, dringend) → sofort an zugewiesenen Greeter/Mensch + **A7**, nie in eine
    Bot-Schleife.
  - **Ton:** ruhig, menschlich, hilfsbereit — Markenkern „menschliche Ankunft". Ehrlich, keine Floskeln.
- **Alarm/Eskalation:** sicherheits-/rechtsrelevante Anliegen oder gehäufte 🔴-Bugs → sofort an A0 → Gründer.
- **Auto-Fix:** keiner an der Infrastruktur. „Self-service": darf dem Kunden helfen, Dinge **selbst** zu tun
  (Anleitung), aber keine privilegierten Schreibaktionen außerhalb von `messages`/`leads`/`notifications`.

---

## 3. Was bereits abgedeckt ist (NICHT doppelt bauen)
- 🟢 **Sentry** (`src/lib/sentry.js`): JS-Fehler, Edge-Function-Fehler, **5xx-Spikes**, Performance — inkl.
  eigener Alert-Regeln (E-Mail/Slack im Sentry-Dashboard konfigurieren). A-Agenten verlassen sich darauf statt
  Vercel-/Function-Logs selbst nach Stacktraces zu scrapen.
- 🟢 **Bestehende Crons:** `step-reminders` (überfällige Steps + matched-Eskalation an `ADMIN_EMAIL`),
  `flight-tracker` (Landung/Verspätung → Greeter). A6/A7 **überwachen** nur, ob diese laufen — sie ersetzen sie nicht.

## 4. Reine Konfiguration (im Dashboard, kein Agent-Code)
Supabase: Backups/PITR aktiv · Auth Site-/Redirect-URLs · CORS-Whitelist · `pg_cron`+`pg_net` aktiv.
Vercel: Deployment-Protection · Env-Vars · Speed Insights.
Sentry: Alert-Regeln + Channels. Resend: SPF/DKIM/DMARC-DNS. Anthropic: Monatsbudget-Limit.
→ Diese Punkte gehören in die Onboarding-Checkliste, nicht in eine Dauerschleife.

---

## 5. Secrets-Inventar (nur Namen — Werte in die Agent-Umgebung, nie ins Repo)
`SUPABASE_ACCESS_TOKEN` (Management-API) · `SUPABASE_SERVICE_ROLE_KEY` (rotiert!) · `VERCEL_TOKEN` ·
`RESEND_API_KEY` · `ANTHROPIC_API_KEY` · `AVIATIONSTACK_API_KEY` · `SLACK_WEBHOOK_URL` (optional) ·
`ADMIN_EMAIL` · `APP_URL=https://arrivalgermany.com` · SSH-Key für den VPS · Hostinger-Login (DNS).
> `service_role` wurde nach einer früheren Seeding-Session rotiert — A5 erinnert quartalsweise an erneute Rotation.

## 6. Smoke-Tests nach jedem Deploy (A3 stößt an, A1/A4/A7 verifizieren)
Landing: 5 Phasen klickbar, Kontaktformular bestätigt. Admin: OperationsCenter lädt, StepPlanner sichtbar (auch
0 Steps), Greeter-Zuweisung ohne Steps blockiert. Greeter: nur eigene Missionen, Step-Check-off bewegt Progress.
Talent: nur eigene Mission, DE/EN-Toggle, SOS-Button. Company: **nur eigene** Missionen, CSV-Import, SLA + KI-Briefing.
Realtime: Greeter hakt Step ab → Company/Talent sehen Update in 12–15 s, keine Channel-Collision in der Konsole.
> Vollständige Deploy-/Prüf-Reihenfolge: **[GO_LIVE.md](GO_LIVE.md)**.

---

### Kurz-Zuordnung der 17 Spec-Abschnitte → Rolle
1 Infrastruktur → A1/A2/A3/A9 · 2 DB/Migrationen → A4 · 3 Sicherheit → A5 · 4 Edge Functions → A6 ·
5 Mission-Logic → A7 (+🟢 Crons) · 6 KI-Briefing → A6 · 7 Realtime → A2/A8 · 8 Performance → A8 ·
9 Landing → A1 (+🟢 Sentry) · 10 E-Mail → A6 · 11 i18n → A8/Smoke · 12 DNS → A10 · 13 DSGVO → A11 ·
14 Kosten/Quota → A2 · 15 Disaster Recovery → A3/A2/A0 · 16 Deploy-Prozess → A3 + GO_LIVE · 17 Smoke-Tests → §6 ·
**Kunden-Support & Produkt-Feedback → A12** (Schleife über A0).

> **Möglicher nächster Bau-Schritt (separat, Code):** ein echtes In-App-Support-Postfach + `feedback`-Tabelle,
> damit A12 strukturiert schreiben/lesen kann statt nur über `messages`/`leads`. Heute bewusst **nur** als
> Agenten-Anleitung dokumentiert.
