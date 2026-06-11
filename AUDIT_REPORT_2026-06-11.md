# ARRIVAL GERMANY / ArrivalOS — VOLLSTÄNDIGER PROJEKT-AUDIT

**Datum:** 11.06.2026 · **Auditor-Rolle:** CTO / PO / UX / QA / Relocation-Experte / Investor
**Basis:** Vollständige Analyse des Repos (312 Dateien, ~21.000 LOC src, 30 Supabase-SQL/Functions-Dateien, Git-Historie)

---

# 1. EXECUTIVE SUMMARY

**Was das Produkt ist:** Eine Koordinationsplattform für die Ankunft internationaler Fachkräfte in Deutschland. Vier Portale (Admin/Ops, Unternehmen, Greeter mobil, Talent) auf React + Vite + Supabase, mit Mission-Pipeline, Journey-Steps, Dokumenten, Nachrichten, Rechnungen, Auszahlungen, Partner-Services, Flug-Tracking und KI-Briefing.

**Gesamturteil: B− (gutes Pilot-Produkt, nicht produktionsreif für zahlende Kunden ohne Korrekturen).**

Stärken:

Das Produkt hat einen klaren, realen Anwendungsfall und eine für ein Frühphasenprodukt ungewöhnlich vollständige Rollenabdeckung. Der Greeter-Mobile-Flow (Annehmen → ETA → Check-in → Schritte abhaken → Abschluss, mit Bottom-Sheets für Notiz/Problem/Spesen) ist durchdacht und nah an Uber-Driver-Qualität. Das Invite-System (gehashte Tokens, Rollen serverseitig aus der Invite-Zeile, Rollback bei Fehlern) ist sauber gebaut. Design-Token-System mit Dark/Light-Mode ist konsistent. Edge Functions, RLS-Tests, Architecture-Linter und Runbooks (GO_LIVE.md) zeigen Betriebsbewusstsein.

Kritische Schwächen (Details in Kap. 8):

1. **P0 — Greeter-PII offen:** `greeter_profiles` ist per RLS für *jeden* eingeloggten Nutzer lesbar (`using (true)`) — inklusive **IBAN, Steuer-ID, Telefon, Adresse**. Jedes Talent und jede Firma kann die Bankdaten aller Greeter abfragen. DSGVO-kritisch.
2. **P0 — Status-/Pay-Manipulation:** Die `missions`-UPDATE-Policy beschränkt keine Spalten. Ein Greeter kann sein eigenes Honorar (`pay`), Status und sogar `company_id` direkt per API ändern. Die State Machine existiert nur im Client.
3. **P0 — Dev trifft Produktions-DB:** `base44Client.js` hat URL + Publishable-Key der Produktions-Supabase **hartkodiert als Fallback**. Jeder `npm run dev` ohne Env-Datei arbeitet gegen die echte Datenbank. Das widerspricht direkt GO_LIVE.md („Modus allein durch Env-Variablen").
4. **P0 — Offene Mail-Endpoints:** `notify-on-message`, `notify-on-mission-status`, `notify-on-lead` sind mit `--no-verify-jwt` deployt und prüfen kein Webhook-Secret → öffentlich aufrufbare E-Mail-Kanonen (Spam/Phishing im Namen von Arrival Germany).
5. **P1 — Dokumentation ≠ Realität:** CLAUDE.md feiert „abgeschlossene Systeme" (Offline-Queue, Audit-Trail, „100+ Tests"), die **nicht in die App eingebunden sind** (kein Import von `OfflineIndicators`, `ConflictResolutionDialog`, `AuditTrailViewer`, `auditIntegration`) und **nicht ausführbar** sind (kein Test-Runner in package.json). ~2.000 LOC totes Renommee-Material.
6. **P1 — Drei parallele Mission-Logik-Systeme** (`missionStateMachine.ts`, `missionEngine.js`, `missionKernel.js`) plus `LEGACY_TRANSITIONS` im Ops-Center. Der DB-Check erlaubt 13 Status, die State Machine kennt 11 (`open`/`matched` fehlen).
7. **P1 — Skaliert nicht:** Praktisch jede Seite lädt **ganze Tabellen** (`Mission.list()`, `JourneyStep.list()`) und filtert im Client, mit 8–12-s-Polling. Bei >1.000 Missionen bricht das (und sprengt vorher die Supabase-Free-Quota).
8. **P1 — Geschäftskritische Lücken für echten Betrieb:** keine Rechnungs-PDFs (§14 UStG), kein Payment (Stripe/SEPA), kein Passwort-Reset, kein SMS/WhatsApp-Kanal für Talente vor Ankunft, keine No-Show-/Backup-Greeter-Prozesse.

**Investor-Blick:** Die Idee ist gut (Relocation-Ops als Software, nicht als Agentur-E-Mail-Chaos), der Markt real (Fachkräftemangel + §16d/§81a-Verfahren). Aber: Demo-Seeds in der Prod-DB, tote „Infrastruktur"-Phasen und Doku-Inflation deuten auf Demo-getriebenes Bauen. Vor Kundengeld: 2–3 Wochen Security/Betriebs-Härtung (P0-Liste), dann erst Vertrieb.

---

# 2. TECHNISCHER AUDIT

## 2.1 Stack & Struktur

| Ebene | Technologie | Bewertung |
|---|---|---|
| Frontend | React 18, Vite 8, Tailwind 3, react-router 6, TanStack Query 5 | ✅ solide, modern |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions/Deno) | ✅ passend für Phase |
| Sprachen | JS + TS gemischt, **kein `tsc`-Check im Build** | ⚠️ TS-Dateien sind ungeprüfte Deko |
| Tests | `*.test.ts` vorhanden, **kein Test-Runner installiert** | ❌ „100+ Tests" nicht ausführbar |
| CI/CD | Vercel + Netlify-Config parallel, kein CI (Lint/Test/RLS) | ⚠️ |
| Monitoring | Sentry (maskiert), Plausible | ✅ |

## 2.2 Datei-Inventar (Zweck, Verbindungen, Auffälligkeiten)

**API-Schicht (`src/api/`)**
- `base44Client.js` — Entity-CRUD-Fassade; localStorage-Mock + Seed (600 LOC) **oder** Supabase. ⚠️ Hardcodierte Prod-Fallbacks machen den Mock-Pfad unerreichbar → toter Code, der trotzdem ins Bundle kommt; Dev-Login (`DEV_USERS` in Login.jsx) ist damit ebenfalls tot.
- `supabaseAdapter.js` — sauberer Adapter, gleiche Schnittstelle; `auth.me()` mit Session-Restore-Begründung — gut kommentiert.
- `missionWriteApi.ts` — **richtige Idee:** einzige Schreib-Grenze für Missionen (transition/cancel/assign/issue/note/create/matching), vom Architecture-Linter erzwungen. ✅
- `inviteUser.js`, `index.ts` — ok.

**Mission-Logik (`src/lib/`) — das Kernproblem**
- `missionStateMachine.ts` (660 LOC) — Enum, Transitions, Events, Pub/Sub. Kennt **11** Status; DB erlaubt **13** (`open`, `matched` fehlen → `getValidNextStates('open')` = `[]`). Tippfehler-API: `IssueServerity` (sic) wird projektweit importiert.
- `missionEngine.js` — laut RULE-03 „deprecated", wird aber von 5 Dateien inkl. `missionWriteApi` genutzt.
- `missionKernel.js` — drittes Fortschritts-/Stage-Modell, von Company-/Greeter-Seiten genutzt.
- → **Eine** Quelle der Wahrheit fehlt; das Ops-Center pflegt zusätzlich `LEGACY_TRANSITIONS` als viertes Regelwerk.

**Totes / nicht eingebundenes Material**
| Datei | Status |
|---|---|
| `missionOfflineQueue.ts` + `useOfflineQueue.ts` + `components/offline/*` | ❌ nirgends gemountet (Phase 2B.1 „complete") |
| `missionAuditService.ts` + `auditIntegration.ts` + `components/audit/AuditTrailViewer.jsx` | ❌ nirgends gemountet (Phase 2B.2 „complete") |
| `*.test.ts` (2 Dateien, 788 LOC) | ❌ kein Runner, kein `npm test` |
| `components/dashboard/ActivityFeed.jsx` | ❌ ungenutzt |
| localStorage-Mock + seedDB in `base44Client.js` | ❌ unerreichbar (s.o.) |
| `docs/legacy/SESSION_SUMMARY.ts` | ❌ TS-Datei als Doku-Ablage |
| `Calm Canvas (2).zip`, `NeuLand_Agent_Briefing.docx` | ❌ Binär-Artefakte im Git-Repo |

**Doppelte Logik**
- `supabase/rls-policies.sql` (Phase 2) **und** `supabase/rls-hardening.sql` definieren dieselben Helper mit **inkompatiblen Rückgabetypen** (`current_company_id()` TEXT vs UUID). Wer beide ausführt, bekommt je nach Reihenfolge andere Semantik. Eine Datei muss gelöscht werden.
- `schema.sql` dupliziert Migrationen („mirrors migrations/…") — zwei Wahrheiten für dasselbe Schema.
- Status-Label/Farb-Maps existieren mind. 4× (OpsCenter, CompanyDashboard, GreeterDashboard, utils).
- Hover-Styling per `onMouseEnter/onMouseLeave`-JS ist dutzendfach kopiert statt einer CSS-Klasse.

**Gute Einzelstücke:** `scripts/check-architecture.js` (Write-Boundary-Linter), `scripts/test-rls.js`, `envGuard.ts` (4-Layer-Boot-Check), `lib/storage.js` (Pfadkonvention `candidates/<id>/`), Invite-Edge-Functions, `GO_LIVE.md` als Runbook.

## 2.3 Architekturprobleme (zusammengefasst)

1. Drei+1 Mission-Logik-Systeme (s.o.) — Konsistenzrisiko bei jedem neuen Feature.
2. Vollabzug ganzer Tabellen + Client-Filter + Polling statt scoped Queries + Realtime-Subscriptions (Supabase Realtime wird nur für Messages/Notifications publiziert, im UI aber kaum genutzt).
3. Berechtigungen 3× definiert (permissions.ts, RLS, UI-Guards) ohne Abgleich-Test — `permissions.ts` behauptet „mirrors RLS", tut es nicht (z.B. darf Company laut RLS Missionen updaten, laut Matrix nicht).
4. Seiten-Wiederverwendung über Rollen (`AdminMessages`, `AdminSettings`, `AdminInvoices` unter `/company/*`, `/talent/*`, `/greeter-dashboard/*`) mit internen Rollen-Weichen — funktioniert, aber Namensgebung täuscht und jede Änderung an „Admin"-Seiten betrifft stillschweigend alle Rollen.
5. `TalentDashboard`: `user?.candidate_id || 'ca1'` — Demo-Fallback in Produktionspfad; ein Talent ohne Verknüpfung sieht ggf. Daten des Demo-Kandidaten statt einer sauberen Fehlermeldung.
6. `AuthContext.navigateToLogin()` setzt `window.location.hash = '#/'` — App nutzt aber BrowserRouter, kein HashRouter → toter/falscher Code.
7. Kein Typecheck, kein ESLint, kein Prettier-Enforcement; gemischte Sprachniveaus (TS-Kern, JSX-Seiten).
8. `package.json` Build-Script ruft `node node_modules/vite/bin/vite.js build` direkt auf (Workaround) statt `vite build`.

## 2.4 Performanceprobleme

- N Polling-Loops pro eingeloggtem Client: Notifications alle 8 s (DashboardLayout), Missions/Steps alle 12 s, Ops-Center eigene Intervalle → bei 50 aktiven Nutzern tausende Requests/Stunde gegen die Free-Tier-DB (OPS_AGENT_SPEC A2 „Free-Plan-Wächter" bestätigt das Risiko selbst).
- `JourneyStep.list()` global statt per `mission_id` — wächst mit Gesamthistorie.
- `OperationsCenterDashboard.jsx` (1.344 LOC) rendert Heatmap + Feed + Karten in einer Komponente; jeder Poll re-rendert alles. Memoisierung nur teilweise.
- Kein `select('spalten')` — immer `select('*')` inkl. `requirements`-JSONB.
- Keine Pagination/Virtualisierung in Listen (AdminMissions, Logs).

---

# 3. UX AUDIT (je Rolle, mit Schwachstellen)

## 3.1 Talent (Note: B+)

**Gut:** Wärmster Teil des Produkts. Persönliche Begrüßung mit Countdown („Deine Reise nach {city} beginnt in {days} Tagen"), Journey-Timeline mit „Was mitbringen"-Listen, Greeter-Karte mit Chat/Anruf, Dokumenten-Upload pro Schritt, SOS-Button, Arrival-Signal („Ich bin gelandet"), Review nach Abschluss, DE/EN-Umschalter.

**Schwach / fehlt / verwirrt:**
- **Sprache:** Default ist Deutsch — die Zielgruppe ist per Definition nicht deutschsprachig. EN muss Default (oder Browser-Locale) sein; Login/Registrierung sind komplett deutsch — die allererste Berührung des Talents mit dem Produkt ist in einer Sprache, die es nicht spricht. **Größter UX-Fehler des Produkts.**
- Nur DE/EN. Seed-Daten zeigen Talente aus Indien, Vietnam, Ägypten — mind. FR/AR/HI als Ausbaustufe.
- Kein Pre-Arrival-Inhalt (Visum-Checkliste, „Was passiert am Flughafen", Stadt-Guide) — die Phase mit der größten Angst ist leer.
- Kein Mobilfunk-Kanal: Vor SIM-Aktivierung hat das Talent oft kein Datenpaket — E-Mail/Web-Push reichen nicht; WhatsApp ist Pflicht für diese Zielgruppe.
- Talent kann Termine (scheduled_at) sehen, aber nichts bestätigen/verschieben — kein Selbstservice.
- Stuck-Point: Talent ohne `candidate_id` → stiller Fallback auf Demo-Daten statt klarer „Dein Konto wird eingerichtet"-Zustand.

## 3.2 Greeter (Note: A−)

**Gut:** Eigenes Mobile-Layout, Missions-Angebote mit 3 Entscheidungsfaktoren, große Primäraktion je Stage (Annehmen → ETA senden → Check-in → Onboarding → Abschließen), Bottom-Sheets für ETA/Notiz/Problem, Foto-Anhänge, Spesen mit Belegen, Verdienst-Seite, Verfügbarkeits-Slots, SOP-Bibliothek. Das ist die beste Seite des Produkts.

**Schwach / fehlt:**
- Offline-Modus ist tot (Queue nicht eingebunden) — ausgerechnet am Flughafen (Funklöcher, Parkhaus) verliert der Greeter Statusübergänge. Entweder einbinden oder Code löschen.
- Kein Ablehnen-mit-Grund-Flow → Ops lernt nichts über Ablehnungen.
- Keine Navigation-Integration (Google Maps Deeplink mit Ziel) am Einsatzort-Feld.
- Kein In-App-Onboarding/Vetting (Ausweis, Führungszeugnis, Vertrag) — `contract_status` existiert nur als DB-Feld.
- Verdienst: keine Gutschrift-Belege/Monatsabrechnung als PDF (für die Steuer des Freelancers nötig).
- Kalender-Export (ICS) für angenommene Einsätze fehlt.

## 3.3 Unternehmen / HR (Note: B−)

**Gut:** Eine Landing-Page mit Suche/Filter, „Neue Ankunft"-Wizard (3 Schritte), CSV-Import, SLA/Kennzahlen-Seite, KI-Briefing, Live-Fortschritt pro Mission, Rechnungen (Entwürfe serverseitig verborgen — gut).

**Schwach / fehlt / verwirrt:**
- Wizard erzwingt **Flugnummer und Telefon als Pflicht** — Ankünfte per Zug/Auto oder ohne erreichbare Nummer sind nicht anlegbar. Realität: viele EU-Zuzüge kommen mit dem Zug.
- Kein Team-Management für die Firma (zweiten HR-Nutzer einladen geht nur theoretisch über Invite-API; kein UI unter /company).
- Kein Kostenvoranschlag/Preistransparenz beim Anlegen (Paket-Tier ist Admin-Setting, die Firma sieht nie einen Preis bis zur Rechnung).
- Keine Eskalation: Bei „Visum verzögert" (Issue) gibt es keinen Aktionspfad für HR (Kommentar, Dokument nachreichen, Termin verschieben).
- Berichte: kein Export (PDF/CSV) der SLA-Seite für interne HR-Reportings.
- Onboarding-Kaltstart: Neue Firma sieht ein leeres Dashboard ohne geführten ersten Schritt.

## 3.4 Admin / Ops (Note: B)

**Gut:** Ops-Center mit Alert-Strip, SLA-Eskalationsfarben, Deutschland-Heatmap, Live-Feed, Hover-Previews, Command-Palette (⌘K), 19 Verwaltungsseiten sinnvoll in 5 Sektionen gruppiert, Templates-Editor, Partner-/Provisions-Verwaltung, Qualität (Reviews), Payouts.

**Schwach:**
- 19 Seiten für (laut Landing) ein Ein-Personen-Unternehmen — mehrere sind Platzhalter-Qualität. Konsolidierung: Qualität→Analytics, SOPs→Templates.
- Matching ist Liste-und-Klick; es gibt `runMatching`, aber keine Begründung im UI (warum dieser Greeter? Distanz? Sprache-Score?).
- Kein Bulk-Handling (z.B. 20 Ankünfte einer Klinik auf einmal zuweisen).
- AdminCandidates/AdminGreeters: keine Pagination, keine Spalten-Sortierung — bei 200+ Einträgen unbenutzbar.
- Aktivitätslog ist da, aber (s. Security) nicht fälschungssicher — als „Audit" wertlos.

## 3.5 Rollenübergreifende Stuck-Points

1. **Passwort vergessen → Sackgasse.** Es gibt keinen Reset-Flow; Magic-Link ist der inoffizielle Workaround, wird aber nicht so kommuniziert.
2. Magic-Link-Login landet auf `/` (Landing), nicht im Portal — Nutzer muss selbst zu seinem Dashboard finden.
3. Benachrichtigungs-Inserts sind per RLS Admin-only → in Produktion erhält HR **keine** „Greeter zugewiesen"-Benachrichtigung (Feature bricht still).
4. Nachrichten gehen an `receiverId: 'all'` — kein adressierter Empfänger, dadurch zufällige E-Mail-Benachrichtigungen (notify-on-message braucht receiver_id).
5. `WaitingForApproval` blockiert pending-Nutzer — aber es gibt keinen Admin-Flow „Nutzer freigeben" als sichtbare Aufgabe/Inbox.

---

# 4. UI AUDIT + BUTTON-AUDIT

## 4.1 Seitenbewertung (Kurzform)

| Seite | Gut | Schlecht / Fehlt |
|---|---|---|
| Landing | Fokussiert, Two-Door (Firmen/Greeter), ehrlicher Single-Founder-Auftritt | Kein Produkt-Screenshot/Demo; Kontaktformular als einziger CTA; kein Pricing |
| Login | Ruhig, klar, Magic-Link-Alternative | Kein „Passwort vergessen", kein Passwort-anzeigen-Toggle, nur Deutsch, `autoComplete="off"` sabotiert Passwortmanager |
| Register | Token-Hygiene (URL-Strip) vorbildlich | Nur per Invite — korrekt, aber Fehlertexte nur Deutsch |
| Ops-Center | Dichte gut für Ops, SLA-Farben, Heatmap | 1.300-LOC-Monolith; Abkürzungen „Zu./Akt./Tref." kryptisch; Heatmap ist Liebhaberei vor Grundfunktionen |
| AdminMissions | Tile-Grid, kompakt | Filter-Zustand nicht in URL (kein Deep-Link/Refresh-sicher) |
| CompanyDashboard | Suche+Filter+Liste vereint | „Matched/Zugewiesen"-Jargon für HR unverständlich → „Greeter gefunden / Greeter bestätigt" |
| GreeterMissionDetail | Beste Seite des Produkts | Emoji in Buttons („🎉 Abgeschlossen") wirkt unprofessionell im B2B-Kontext |
| TalentDashboard | Emotional, warm, klar | Desktop-zentriert; Sprache (s.o.) |
| AdminSettings (alle Rollen) | Push-Toggle, Paketpreise | Eine Datei für 4 Rollen; Talent sieht „Einstellungen" fast leer |
| StaticPage (Impressum etc.) | Env-getrieben, DSGVO-bewusst | Platzhalter-Env leer → Impressum unvollständig = Abmahnrisiko |

## 4.2 Button-Audit (Markierungen: KEEP / REMOVE / REDESIGN / ADD NEW)

**Global / Topbar**
- Suche (⌘K) — **KEEP** (für Admin), **REMOVE** für Talent (kaum Inhalte, verwirrt).
- Theme-Toggle — **KEEP**.
- „Rolle wechseln" — **KEEP (dev-only)**, ist korrekt hinter `!IS_SUPABASE`; aber durch die hartkodierten Fallbacks ist dev-mode tot → erst Fallbacks fixen.
- Glocke + Nachrichten-Icon — **REDESIGN**: zwei Posteingänge (Notifications vs. Messages) verwirren; zusammenführen oder Badge-Logik vereinheitlichen.

**Login**
- „Anmelden" — **KEEP**. „Magic Link senden" — **KEEP**, aber als sekundären Link statt gleichwertigen Button.
- **ADD NEW:** „Passwort vergessen?" (P0), Sprachumschalter DE/EN.

**Talent**
- „Chat", „Anrufen" auf Greeter-Karte — **KEEP** (genau richtig).
- SOS-Button — **KEEP**, aber **REDESIGN**: muss zu einem definierten Eskalationsprozess führen (wer reagiert in welcher Zeit?), sonst gefährliches Scheinversprechen.
- Upload je Schritt — **KEEP**. **ADD NEW:** „Termin bestätigen/verschieben" je geplanten Schritt; „Ich bin gelandet" prominenter am Ankunftstag.

**Greeter**
- Primäraktions-Leiste je Stage — **KEEP** (Vorbild).
- „Problem melden" — **KEEP**. „Notiz" — **KEEP**.
- **ADD NEW:** „Route öffnen" (Maps-Deeplink), „Ablehnen mit Grund", „Support anrufen" im Fehlerfall.
- **REDESIGN:** Abschluss-Button ohne Emoji; stattdessen Abschluss-Checkliste (Übergabe erfolgt? Talent sicher?).

**Company**
- „Neue Ankunft" — **KEEP** (klarer Haupt-CTA). „CSV-Import" — **KEEP**.
- Wizard „Weiter/Zurück" — **KEEP**; **REDESIGN:** Pflichtfeld-Logik (Flugnr. optional, Ankunftsart Zug/Flug/Auto wählbar).
- **ADD NEW:** „Problem eskalieren / Rückfrage an Ops" auf Missionsdetail; „Report exportieren" auf SLA-Seite; „Teammitglied einladen" in Einstellungen.

**Admin**
- Status-Transition-Buttons im Drawer — **REDESIGN**: Admin kann derzeit Status am Greeter vorbei schieben; braucht Begründungspflicht (Audit) und Konfliktwarnung.
- „Matching ausführen" — **KEEP**, plus Erklär-Output (Score-Gründe).
- Payout „als bezahlt markieren" — **KEEP**, **ADD NEW:** SEPA-Export (pain.001/CSV) statt Handarbeit.
- **REMOVE:** Verstreute Demo-/Seed-Hinweise und tote Affordances in Prod (z.B. Reset-DB-Reste).

---

# 5. VISUAL DESIGN AUDIT (Note: B+)

**Stark:** Eigenständige Marke (Navy/Gold/Cream, Serif-Headlines, „A"-Logo mit Deutschland-Flaggenstrich), konsequente Design-Tokens (`--ds-*`) mit sauberem Dark/Light, ruhige Karten, gute Leerzustände (BellOff-Empty-State), Skeletons vorhanden, einheitliche Pill-/Card-Sprache. Wirkt deutlich über Template-Niveau.

**Schwächen:**
1. **Schriftgrößen zu klein:** 10–13 px dominiert (`text-[10px]`, `text-[11.5px]`), Uppercase-Tracking-Labels bei 10 px — auf 1080p-Laptops grenzwertig, auf Mobile teils unlesbar. Basis auf 14 px anheben.
2. **Kontrast:** Sidebar-Text `rgba(255,255,255,0.28–0.45)` auf Navy verfehlt WCAG AA. Inaktive Nav-Items sind fast unsichtbar.
3. **Inline-Style-Flut:** Hunderte `style={{}}` + JS-Hover statt Tailwind-Klassen/CSS — bläht Code auf, verhindert konsistente Focus-States.
4. **Accessibility:** kaum `aria-*`, Hover-only-Informationen (Ops-Hover-Preview), Focus-Ringe unklar, Farbsemantik ohne Text-Redundanz (SLA nur über Border-Farbe).
5. Icon-Sprache konsistent (lucide), aber Emoji-Einsprengsel (✉️, 🎉, ✓) brechen den Premium-Anspruch.
6. Zwei Markennamen im Produkt („ArrivalOS", „Arrival Germany", „NeuLand") — vereinheitlichen; Talente sehen drei Namen für dieselbe Sache.

---

# 6. BUSINESS AUDIT

**Würde ein Arbeitgeber das nutzen?** Eine Klinik mit 20 internationalen Pflegekräften/Jahr: ja, grundsätzlich — der Schmerz (Ankunfts-Chaos, No-Shows am ersten Arbeitstag) ist real und das Produkt adressiert ihn sichtbar. Aber sie würde verlangen: Preistransparenz, Rechnungs-PDFs, AVV/DSGVO-Dokumentation, Referenzen, SLA-Vertrag. Nichts davon ist heute im Produkt.

**Würde ein Talent es verstehen?** Nur wenn Englisch Default wird und WhatsApp/SMS existiert. Heute: deutsche Login-Maske + E-Mail-only = nein.

**Würde ein Greeter täglich damit arbeiten?** Ja — der Mobile-Flow ist gut. Aber: Bezahlung/Verträge/Steuerbelege fehlen, und ohne verlässliche Push-/Offline-Funktion bleibt WhatsApp der Schatten-Kanal.

**Würde ein Support-Team effizient arbeiten?** Nein — es gibt keine Support-Inbox, kein Ticketing, SOS läuft ins Leere, Eskalationen sind nur ein Flag auf der Mission.

**Unit Economics (aus Code abgeleitet):** Paketpreise 490/690/900 €/Ankunft (Settings), Greeter-Pay 70–120 €/Mission, Partner-Provisionen (commission_pct/flat) als zweite Erlösquelle. Deckungsbeitrag pro Ankunft grob 300–700 € — trägt, **wenn** Ops nicht manuell ertrinkt. Genau dafür fehlen die Automatisierungen (Kap. 7/10).

**Rechtliche Risiken:**
1. Rechnungen ohne §14-UStG-Pflichtangaben/PDF/fortlaufende Nummern — so darf nicht fakturiert werden.
2. Greeter-Modell = Freelancer mit App-Steuerung, festen Slots, SOP-Pflicht → **Scheinselbstständigkeits-Risiko**; Vertragswerk + Statusfeststellung einplanen.
3. DSGVO: sensible Notizen über Talente („spricht wenig Englisch, sehr aufgeregt") für Greeter sichtbar; Greeter-IBAN-Leak (Kap. 8); kein Lösch-/Export-Tooling (Art. 15/17); Impressum-Envs leer.
4. Demo-Seed mit echt klingenden Namen (`SEED_DEMO.sql`, Git: „real greeter names … placeholder contacts") in der **Produktions-DB** — Vermischung Demo/Echtdaten ist auch gegenüber Kunden heikel.

---

# 7. OPERATIONS AUDIT (Realbetrieb)

**Unrealistische Prozesse:**
- Matching setzt voraus, dass Greeter in der Stadt existieren — Kaltstart-Problem (m9 „Edge case, keine Greeter") ist im Seed erkannt, im Produkt aber ohne Lösung (kein Wartelisten-/Partneragentur-Fallback).
- Flug-Tracking 1×/Tag per Cron — Verspätungen entstehen stündlich; am Ankunftstag braucht es 15-min-Intervalle für Missionen des Tages.
- Spesen-Freigabe und Auszahlung sind Handarbeit ohne Zahlungsdatei.

**Fehlende Prozesse (für echten Betrieb zwingend):**
1. No-Show-Protokoll (Talent nicht am Gate → definierte Schritte, Telefonkette, Wartezeit-Vergütung).
2. Backup-Greeter / Re-Assignment bei kurzfristiger Absage.
3. Greeter-Vetting (Ausweis, ggf. Führungszeugnis bei Wohnungs-/Behördenbegleitung), Versicherung (Haftpflicht).
4. Incident-/Support-Prozess hinter dem SOS-Button mit Reaktionszeit.
5. Nutzer-Freigabe-Inbox für `pending_approval`.
6. Mahnwesen für überfällige Rechnungen (Status `overdue` existiert, Prozess nicht).

**Zu kompliziert:** 13 Mission-Status sind operativ nicht unterscheidbar (met_talent vs arrived vs in_progress). 7–8 reichen; Rest als Events/Notizen abbilden.

**Nicht skalierbar (organisatorisch):** Alles läuft über den Admin (Zuweisung, Freigaben, Auszahlung, Partner-Referrals). Bei >10 Ankünften/Woche wird der Gründer zum Bottleneck — die OPS_AGENT_SPEC-Agenten (A0–A12) überwachen Infrastruktur, ersetzen aber keine Produkt-Automatisierung.

---

# 8. SICHERHEITSAUDIT (Detail)

| # | Schwere | Befund | Beleg | Fix |
|---|---|---|---|---|
| S1 | **P0** | Greeter-PII (IBAN, tax_id, Telefon, payout_address) für alle authenticated lesbar | `rls-hardening.sql`: `greeter_profiles_select … using (true)` | Spalten splitten: öffentliche Matching-View (Name, Stadt, Sprachen, Rating) vs. private Tabelle (admin+self) |
| S2 | **P0** | Greeter kann `pay`, `status`, `company_id` der eigenen Mission frei ändern; Company beliebige Felder | `missions_update` ohne Spaltenbeschränkung/WITH CHECK-Verschärfung | Status-Übergänge in SECURITY-DEFINER-RPC mit Transitions-Tabelle; UPDATE-Policy auf erlaubte Spalten je Rolle (Trigger oder column-level grants) |
| S3 | **P0** | Dev-Builds reden mit Prod-DB; localStorage-Modus unerreichbar | `base44Client.js:10-17` hartkodierte URL+Key | Fallbacks entfernen; Modus wieder rein env-getrieben (wie GO_LIVE.md behauptet) |
| S4 | **P0** | Offene E-Mail-Endpoints (Spam/Phishing as a Service) | notify-on-* `--no-verify-jwt`, kein Secret-Check im Code | `WEBHOOK_SECRET`-Header prüfen oder pg_net mit Signatur; ai-arrival-briefing & flight-tracker: Auth/Rate-Limit |
| S5 | P1 | Audit-Log fälschbar: jeder darf `activity_logs` schreiben, `created_by` frei wählbar | `activity_logs_insert with check (true)` | Insert nur via Trigger/RPC; `created_by := auth.uid()` serverseitig |
| S6 | P1 | Talente/Companies können Journey-Steps fremd-/selbst manipulieren (alles, was die Mission sehen darf, darf Steps schreiben) | `journey_steps_modify` | Schreibrecht auf Greeter der Mission + Admin beschränken |
| S7 | P1 | Mitlesen: gematchte (nicht akzeptierte) Greeter sehen Missions-Nachrichten | `messages_select … exists(select 1 from missions)` | auf zugewiesenen Greeter + Company + Talent + Admin einschränken |
| S8 | P1 | Notifications-Insert Admin-only → Produktfunktion bricht in Prod still | `notifications_insert_admin` | Inserts über RPC/Trigger; oder Policy „Systempfade erlaubt" |
| S9 | P1 | `handle_new_user` legt für **jede** Auth-Registrierung ein Talent-Profil an; falls Public-Signups aktiv sind, wird S1 von jedermann ausnutzbar | `schema.sql` Trigger | Public-Signups in Supabase deaktivieren (nur Invite); Trigger nur für eingeladene E-Mails |
| S10 | P1 | `schema.sql` shipped offene RLS („Pilot"); zwei konkurrierende RLS-Dateien mit inkompatiblen Helpern | schema.sql §4, rls-policies.sql vs rls-hardening.sql | rls-policies.sql löschen; schema.sql ohne offene Policies ausliefern; `rls-verify.sql` in CI |
| S11 | P2 | VAPID-Privatekey liegt im Projektordner (und damit in jeder Weitergabe-ZIP — auch dieser) | `.vapid.local` | Key rotieren, Datei aus dem Ordner entfernen (Secret-Manager) |
| S12 | P2 | Kein Passwort-Reset, `autoComplete="off"/new-password` im Login | Login.jsx | `resetPasswordForEmail`-Flow; autocomplete korrekt (`current-password`) |
| S13 | P2 | CORS `*` auf allen Edge Functions | alle functions | Origin-Allowlist (APP_URL) |
| S14 | P2 | Rate-Limiting nur auf Leads; Login/Functions ungedrosselt | rate-limit.sql | Supabase Auth-Limits prüfen; Function-Rate-Limit |
| S15 | P3 | Binär-/Fremdartefakte im Repo (`Calm Canvas (2).zip`, `.docx`) | git ls-files | entfernen, ggf. Git-Historie säubern |

**Positiv:** Invite-Flow (Token-Hash, serverseitige Rollenvergabe, Rollback, URL-Strip im Register), Storage-Policies (Pfad-basiert, Belege firmen-unsichtbar), Draft-Invoices RLS-verborgen, Sentry-Maskierung, envGuard, rls-tests/rls-verify-Skripte. Das Sicherheits-**Denken** ist da — die Lücken sind konkret und behebbar.

---

# 9. SKALIERUNGSAUDIT

**Technisch:**
- Datenzugriff: Volltabellen+Polling (Kap. 2.4) — Grenze bei ~10³ Missionen / ~10² gleichzeitigen Nutzern. Fix: scoped Queries (`eq('company_id', …)`, `in('status', aktive)`), Realtime-Subscriptions statt Polling, Pagination.
- Supabase Free Tier (OPS_AGENT_SPEC bestätigt): vor erstem zahlenden Kunden auf Pro upgraden — sonst Pausierung der DB = Totalausfall.
- Edge-Function-Mail über Resend ohne Queue/Retry — bei Resend-Ausfall gehen Benachrichtigungen verloren (kein Outbox-Pattern).
- Ein `documents`-Bucket für alles; bei Wachstum: getrennte Buckets (docs/receipts/photos) + Lifecycle-Regeln.
- Kein Staging-Environment erkennbar (eine Supabase-Instanz, Demo-Seeds in Prod).

**Produkt/Markt:**
- Marktplatz-Kaltstart pro Stadt: Greeter-Akquise ist der eigentliche Engpass, nicht Software. Heatmap zeigt das Problem, löst es nicht (kein Greeter-Recruiting-Funnel im Produkt; Landing hat nur eine Greeter-Tür → ausbauen zu echtem Bewerbungs-Flow mit Vetting-Pipeline im Admin).
- Pro Ankunft ~1–2 h Admin-Handarbeit (Zuweisung, Kontrolle, Abrechnung) → ohne Automatisierung skaliert Umsatz linear mit Gründerzeit.
- Mehrsprachigkeit, Mehrländer (AT/CH/NL als naheliegende Expansion) sind im Datenmodell nicht angelegt (Land fehlt fast überall, „Germany" implizit).

---

# 10. FEATURE-AUDIT

**Fehlende Features (wichtigste):** Passwort-Reset · WhatsApp/SMS-Kanal · Rechnungs-PDF + Mahnwesen · Stripe/SEPA (Einzug + Greeter-Auszahlung) · Termin-Bestätigung durch Talent · No-Show/Backup-Workflows · Greeter-Vetting-Pipeline · Company-Team-Verwaltung · Pre-Arrival-Content-Hub · Berichts-Exporte · Nutzer-Freigabe-Inbox · DSGVO-Export/Löschung · Staging-Umgebung.

**Überflüssige / zu früh gebaute Features:** Offline-Queue + Konflikt-UI (ungenutzt) · Audit-Trail-Viewer (ungenutzt) · localStorage-Demo inkl. 600-LOC-Seed im Prod-Bundle · Deutschland-Heatmap (hübsch, aber vor Grundfunktionen gebaut) · doppelte RLS-Generation · `rls-policies.sql` · zweite Hosting-Config (netlify.toml **und** vercel.json).

**Schwache Features (vorhanden, aber nicht betriebsfähig):** Nachrichten (kein echter Empfänger, kein Anhang) · Notifications (RLS-blockiert) · Aktivitätslog (fälschbar) · Flight-Tracker (1×/Tag, Free-API) · SOS (ohne Prozess) · Payouts (ohne Zahlweg) · Reviews (keine Konsequenz/Anzeige im Matching).

**Premium-/Enterprise-Potenzial:** SLA-Verträge mit Credits · White-Label/Branding pro Firma · API/HRIS-Integrationen (Personio, SAP SuccessFactors, Workday) · SSO (SAML) · Multi-Country · Reporting-Suite · Versicherungspaket pro Mission · Relocation-Add-ons über Partner (Wohnung, Konto, Versicherung — Grundgerüst existiert bereits gut mit `mission_services`/`partners`/Consent!).

**KI-Features (sinnvoll, aufbauend auf vorhandenem ai-arrival-briefing):** Risiko-Score je Ankunft (Visum/Flug/Dokumente) · automatische Missions-Zusammenfassung für Übergaben · mehrsprachiger Talent-Chat-Assistent (Behördenfragen) · Matching-Empfehlung mit Begründung · automatische SOP-Vorschläge aus Issue-Mustern.

**Automatisierungen (höchster ROI):** Auto-Matching mit Bestätigungsfrist → Selbstzuweisung · Flug-Tracking stündlich am Ankunftstag + automatische ETA-/Termin-Verschiebung · Rechnung automatisch bei `completed` (existiert als Trigger? prüfen — Invoice-Review-Gate ist da) · Step-Reminder (Function existiert — verkabeln) · Payout-Datei wöchentlich · Mahnläufe.

---

# 11. TOP 100 VERBESSERUNGEN (priorisiert)

**P0 = kritisch (vor jedem echten Kunden) · P1 = sehr wichtig (erste 4–6 Wochen) · P2 = wichtig · P3 = optional**

## P0 — Sicherheit & Betriebsfähigkeit (1–15)
1. P0 Greeter-PII-Leak schließen: `greeter_profiles` in public-View + private Daten splitten (S1).
2. P0 Missions-UPDATE spaltenweise je Rolle beschränken; Statuswechsel nur per RPC mit serverseitiger Transitions-Prüfung (S2).
3. P0 Hartkodierte Supabase-Fallbacks aus `base44Client.js` entfernen (S3).
4. P0 Webhook-Secret-Prüfung in allen notify-*-Functions; ai-briefing/flight-tracker absichern (S4).
5. P0 Passwort-Reset-Flow (Login-Link + `resetPasswordForEmail` + Update-Page).
6. P0 Notifications-Inserts produktionsfähig machen (RPC/Trigger) — Kernfeature ist aktuell tot (S8).
7. P0 Public-Signups in Supabase Auth deaktivieren (Invite-only erzwingen) (S9).
8. P0 `rls-policies.sql` löschen; rls-verify in Deploy-Pipeline erzwingen (S10).
9. P0 VAPID-Key rotieren und aus dem Projektordner entfernen (S11).
10. P0 Demo-Seeds aus der Produktions-DB entfernen; SEED_DEMO nur für Staging.
11. P0 Rechnungs-PDF mit §14-Pflichtangaben + fortlaufender Nummer.
12. P0 Impressum-/Datenschutz-Envs befüllen (Abmahnrisiko).
13. P0 Supabase Pro-Plan vor Kundenstart (Free-Tier-Pausierung = Totalausfall).
14. P0 `journey_steps`-Schreibrecht auf Mission-Greeter+Admin beschränken (S6).
15. P0 Audit-Log fälschungssicher (Insert per Trigger, actor = auth.uid()) (S5).

## P1 — Architektur & Kern-UX (16–45)
16. P1 Mission-Logik konsolidieren: ein Modul, 8 Status, DB-Check + RPC + UI aus derselben Quelle.
17. P1 Toten Code entfernen: Offline-Queue-UI, AuditTrailViewer, auditIntegration, ActivityFeed, localStorage-Mock (oder bewusst einbinden — Entscheidung treffen).
18. P1 Vitest einrichten; vorhandene Tests lauffähig machen; CI (lint+typecheck+test+check:arch+rls-verify).
19. P1 `tsc --noEmit` in den Build; `IssueServerity`-Typo beheben.
20. P1 Scoped Queries statt Volltabellen (company_id/greeter_id/status-Filter serverseitig).
21. P1 Polling durch Supabase-Realtime-Subscriptions ersetzen (missions, journey_steps publizieren).
22. P1 EN als Default-Sprache für Talent; Login/Register zweisprachig.
23. P1 WhatsApp Business API (oder Twilio SMS) für Talent-Kommunikation pre-SIM.
24. P1 Magic-Link-Redirect ins richtige Portal (role-basiert) statt Landing.
25. P1 Talent ohne candidate_id: sauberer Onboarding-Zustand statt `|| 'ca1'`-Fallback.
26. P1 Ankunftsart (Flug/Zug/Auto) im Arrival-Wizard; Flugnummer nur bei Flug Pflicht.
27. P1 Nachrichten-Modell: echter Empfänger statt `'all'`; Threads pro Mission mit Teilnehmerliste.
28. P1 Nutzer-Freigabe-Inbox für pending_approval im Admin.
29. P1 No-Show-/Backup-Greeter-Workflow (Re-Assignment mit einem Klick + Benachrichtigungskette).
30. P1 Flight-Tracker: stündlich am Ankunftstag; ETA-Verschiebung automatisch in Mission/Talent-Ansicht.
31. P1 step-reminders-Function produktiv verkabeln (CRON_SETUP prüfen) + Talent-Reminder.
32. P1 Greeter-Vetting-Pipeline (Dokumente, Vertrag, Status) im Admin sichtbar.
33. P1 Company-Team-Verwaltung unter /company/settings (Invite-UI existiert serverseitig schon).
34. P1 SEPA-/CSV-Export für Payouts; Stripe für Firmenrechnungen evaluieren.
35. P1 Eskalations-Flow für Issues (Zuständiger, Frist, Verlauf) statt nur Flag.
36. P1 SOS-Prozess definieren (Rufnummer, Reaktionszeit, Eskalationskette) und im UI ehrlich beschreiben.
37. P1 Pagination + Sortierung in allen Admin-Listen.
38. P1 Filter-/Suchzustand in URL-Query (Deep-Links, Refresh-sicher).
39. P1 Kontrast & Schriftgrößen auf WCAG AA heben (Sidebar!).
40. P1 Fokus-States + aria-Labels für alle interaktiven Elemente.
41. P1 Ops-Center in Komponenten zerlegen (<300 LOC), Memoisierung.
42. P1 Mahnwesen: overdue-Erkennung + Erinnerungs-Mails.
43. P1 Berichts-Export (CSV/PDF) für Company-SLA und Admin-Analytics.
44. P1 Staging-Umgebung (zweites Supabase-Projekt) + Seed nur dort.
45. P1 Outbox-Pattern für Mails (Tabelle + Retry) statt Fire-and-Forget an Resend.

## P2 — Produktreife (46–75)
46. P2 Matching-Score mit Begründung (Distanz, Sprache, Rating, Auslastung) im Zuweisungs-UI.
47. P2 Auto-Matching mit Annahmefrist (Greeter bekommt Angebot, 30 min Timer, dann nächster).
48. P2 Talent-Terminbestätigung/-verschiebung je Journey-Step.
49. P2 ICS-Kalender-Export für Greeter und Talent.
50. P2 Maps-Deeplink „Route öffnen" am Einsatzort.
51. P2 Ablehnen-mit-Grund für Greeter + Auswertung im Admin.
52. P2 Pre-Arrival-Content-Hub (Visum-Checkliste, Flughafen-Guide, Stadt-Infos, mehrsprachig).
53. P2 Review-Anzeige im Matching + Qualitäts-Konsequenzen (Rating < x → Coaching-Flag).
54. P2 Greeter-Monatsabrechnung als PDF (Gutschriftverfahren).
55. P2 Spesen-Limits + Auto-Genehmigung unter Schwellwert.
56. P2 Dokument-Status-Workflow (pending→verified) mit Prüfer und Kommentar.
57. P2 Onboarding-Checkliste für neue Firmen (Empty-State mit 3 geführten Schritten).
58. P2 Preistransparenz: Paket-Tier + Preis im Arrival-Wizard anzeigen.
59. P2 Benachrichtigungs-Einstellungen pro Nutzer (E-Mail/Push/Kanal je Ereignistyp).
60. P2 Notifications & Messages zu einem Posteingang zusammenführen.
61. P2 Status-Labels für HR übersetzen („Greeter gefunden/bestätigt/unterwegs").
62. P2 Bulk-Aktionen im Admin (Mehrfachzuweisung, CSV-Export).
63. P2 Land-Feld im Datenmodell (Vorbereitung Multi-Country).
64. P2 DSGVO-Tooling: Datenexport + Löschung je Talent per Knopfdruck.
65. P2 Retention-Policy (Missionsdaten nach X Monaten anonymisieren).
66. P2 CORS-Allowlist statt `*` in Edge Functions.
67. P2 ESLint + Prettier + Husky pre-commit.
68. P2 Hover-JS durch CSS-Klassen ersetzen; Inline-Styles abbauen.
69. P2 Status-Map/Labels zentralisieren (eine Datei statt 4 Kopien).
70. P2 netlify.toml ODER vercel.json — eine Deploy-Wahrheit.
71. P2 Error-States je Seite (Query-Fehler sichtbar machen statt leerer Listen).
72. P2 Offline-Entscheidung: Queue korrekt einbinden (Greeter-Flow) oder Code löschen.
73. P2 PWA-Polish: Talent-/Greeter-Install-Prompts kontextuell (vor Ankunftstag).
74. P2 Skeleton-Loader konsequent (TalentDashboard, CompanyDashboard).
75. P2 Such-Indizes (pg_trgm) für Kandidaten-/Missions-Suche.

## P3 — Ausbau (76–100)
76. P3 Mehrsprachigkeit FR/AR/HI/ES für Talent-Portal.
77. P3 White-Label pro Firma (Logo/Farben auf Talent-Sicht).
78. P3 HRIS-Integrationen (Personio zuerst — DACH-Standard).
79. P3 SSO/SAML für Enterprise-Kunden.
80. P3 Öffentliche API + Webhooks für Kunden.
81. P3 KI-Risiko-Score je Ankunft (Flug+Visum+Dokumente+Service-Fristen).
82. P3 KI-Chat-Assistent für Talente (Behörden-FAQ, mehrsprachig).
83. P3 KI-Übergabe-Zusammenfassungen (Mission → nächster Schritt/Verantwortlicher).
84. P3 Housing-Modul vertiefen (Besichtigungstermine, Mietvertrag-Upload, Kautionstracking).
85. P3 Versicherungs-Partnerpaket pro Mission (Haftpflicht für Greeter-Einsätze).
86. P3 Greeter-Gamification (Level, Badges — Duolingo-Inspiration aus CLAUDE.md, aber erst nach Bezahl-Basics).
87. P3 Greeter-Academy (Schulungsvideos + Quiz vor Freischaltung je SOP).
88. P3 Live-Standort-Sharing während aktiver Mission (Opt-in, auto-Ende).
89. P3 Foto-Dokumentation mit KI-Qualitätscheck (Phase 2B.3 aus Roadmap).
90. P3 Auto-ETA mit Verkehrsdaten (Phase 2B.4).
91. P3 NPS-Befragung Talente + Firmen nach Abschluss.
92. P3 Partner-Portal (Partner sieht eigene Referrals + Provisionen).
93. P3 Kapazitätsplanung (Forecast Ankünfte vs. Greeter-Verfügbarkeit je Stadt).
94. P3 AT/CH-Expansion (Datenmodell, Rechtstexte, Behörden-Templates).
95. P3 Audit-Trail-Viewer (vorhandene Komponente) für Admin reaktivieren — nach S5-Fix.
96. P3 Command-Palette um Aktionen erweitern („Mission anlegen", „Greeter einladen").
97. P3 Dark-Mode für E-Mails / hübschere Resend-Templates.
98. P3 Status-Page (public) für Kunden (uptime, Incidents).
99. P3 In-App-Changelog/Produkt-News für Firmen.
100. P3 Marken-Konsolidierung: ein Name (Arrival Germany) in Code, UI, Doku, E-Mails.

---

# 12. QUICK WINS (≤ 1 Tag Aufwand, sofort spürbar)

1. „Passwort vergessen"-Link + Supabase-Resetmail (2–3 h).
2. Greeter-IBAN/Steuer-ID aus der offenen SELECT-Policy nehmen (1 SQL-Datei).
3. Webhook-Secret in notify-* prüfen (je 10 Zeilen).
4. Hardcodierte Supabase-Fallbacks löschen (5 Zeilen + Env-Check).
5. EN-Default für Talent + zweisprachiger Login (i18n existiert bereits).
6. Magic-Link-Redirect auf Rollen-Dashboard.
7. Flugnummer optional machen + „Ankunft per"-Auswahl.
8. Sidebar-Kontrast von 0.28/0.45 auf 0.55/0.75 anheben.
9. Emojis aus Buttons entfernen.
10. `Calm Canvas (2).zip` + `.docx` aus dem Repo löschen.
11. Maps-Deeplink im Greeter-Einsatzort.
12. Status-Labels HR-freundlich umbenennen.
13. `IssueServerity` → `IssueSeverity` (Suchen/Ersetzen).
14. Demo-Seed-Daten aus Prod-DB löschen (SQL delete + Verifikation).
15. Vitest installieren — die 788 Test-LOC laufen dann wirklich.

---

# 13. ROADMAP

## MVP „Erster zahlender Kunde" (2–4 Wochen)
- Komplette P0-Liste (1–15) — nicht verhandelbar.
- Dazu: #16 (eine Mission-Logik), #20–21 (Queries/Realtime), #22–26 (Talent-Sprache, Wizard, Redirects), #28 (Freigabe-Inbox), #44 (Staging).
- Definition of Done: Ein echter Kunde legt eine echte Ankunft an, ein echter Greeter führt sie über das Handy durch, das Talent versteht jede Maske auf Englisch, am Ende existiert eine gesetzeskonforme Rechnung — ohne dass der Admin SQL anfasst.

## MVP+ „10 Ankünfte/Woche ohne Gründer-Bottleneck" (Monat 2–3)
- Automatisierung: #29–31, #42, #45–48 (No-Show, Flugtracking, Reminder, Mahnwesen, Auto-Matching, Outbox).
- Kommunikation: #23 (WhatsApp), #27 (Messaging-Modell), #59–60.
- Vertrauen: #32 (Vetting), #36 (SOS-Prozess), #52 (Pre-Arrival-Hub), #53–54 (Reviews, Greeter-Abrechnung).
- Qualität: #18–19 (CI/Tests), #37–41 (Listen, A11y, Ops-Refactor), #64–65 (DSGVO-Tooling).

## Enterprise (Monat 4–12)
- #77–80 (White-Label, Personio, SSO, API) — erst wenn 3+ Kunden danach fragen.
- #81–83 (KI-Suite auf vorhandenem ai-briefing-Fundament).
- #84–85, #93 (Housing, Versicherung, Kapazitätsplanung).
- #94 (AT/CH) — erst nach Produkt-Markt-Fit in DE.
- SLA-Verträge mit Credits + Status-Page (#98) als Enterprise-Verkaufsargument.

---

# ANHANG — VERIFIKATIONSNOTIZEN

- Befunde S1–S10 sind direkt im SQL/Code belegt (Dateien/Zeilen in Kap. 8 genannt), nicht aus Doku übernommen — die Doku widerspricht dem Code an mehreren Stellen (GO_LIVE.md §1 vs base44Client.js; CLAUDE.md „Completed Systems"/„100+ Tests" vs fehlende Imports/fehlender Test-Runner; CompanyArrivalForm-Kommentar „Sends SMS" — es existiert kein SMS-Versand im gesamten Repo).
- Build-Verifikation: `vite build` war in der Audit-Umgebung nicht ausführbar (Windows-natives rolldown-Binding in node_modules); keine Aussage zu „0 compile errors" möglich — auch das ist ein Befund: ohne CI ist diese Behauptung nirgends maschinell geprüft.
- Dead-Code-Befunde per Import-Graph verifiziert (grep über alle src-Importe).
- Dieser Bericht ersetzt keine Rechtsberatung (UStG, DSGVO, Scheinselbstständigkeit) — vor Kundenstart anwaltlich prüfen lassen.



