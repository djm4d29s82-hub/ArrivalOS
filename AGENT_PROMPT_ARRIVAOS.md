# ArrivalOS — Agent Handoff Prompt
## Vollständige Analyse + Implementierungsauftrag

---

## 1. KONTEXT & PRODUKT

**ArrivalOS** ist eine B2B-SaaS-Plattform für das Onboarding international angeworbener Fachkräfte
(Fokus: Pflegepersonal aus dem Ausland → deutsche Kliniken). Das Produkt koordiniert:

- **Company** (Klinik/Arbeitgeber) → fordert Ankunft an
- **Admin/Ops** → plant Schritte, weist Greeter zu
- **Greeter** (lokale Begleitperson) → begleitet Talent durch Behördengänge etc.
- **Talent** (ankommende Pflegekraft) → sieht eigene Journey

**Tech Stack:** React + Vite, Supabase (DB + Auth + RLS), base44-Client (Entity-Abstraktion über
Supabase REST), TailwindCSS mit Custom Design Tokens (`var(--ds-*)`), React Query, React Router v6.

**Repo-Struktur:**
```
src/
  pages/
    admin/       ← 15 Seiten (AdminDashboard, OperationsCenterDashboard, AdminMissionDetail, ...)
    greeter/     ← 7 Seiten (GreeterDashboard, GreeterMissionDetail 859 Z., GreeterMissions, ...)
    company/     ← 5 Seiten (CompanyDashboard, CompanyMissions, CompanyMissionDetail, ...)
    talent/      ← 4 Seiten (TalentDashboard, TalentJourney, TalentGreeter, TalentDocuments)
  lib/
    missionEngine.js      ← Kern-Logik: createMission, assignGreeter, completeJourneyStep
    journeySteps.js       ← JOURNEY_STEPS Array (echte Steps mit Keys + Icons)
    missionKernel.js      ← greeterKernel, talentKernel, greeterProgress
    AuthContext.jsx        ← Auth-State, Boot-Flags
  components/
    mission/MissionKernel.jsx   ← Role-agnostischer Step-State-Renderer
    ui/                         ← Design-System-Komponenten
supabase/
  schema.sql
  rls-hardening.sql
  SETUP_ALL.sql
```

**Routing (App.jsx):**
```
/admin                → OperationsCenterDashboard
/admin/missions       → AdminMissions
/admin/missions/:id   → AdminMissionDetail
/admin/execution|candidates|greeters|companies|invoices|messages|analytics|logs|sops|quality|team|settings

/company              → CompanyDashboard
/company/missions     → CompanyMissions          ← DUPLIKAT (siehe unten)
/company/missions/:id → CompanyMissionDetail
/company/candidates   → AdminCandidates          ← FALSCH (rendert Admin-Seite für Company)
/company/documents|invoices|messages|settings

/greeter-dashboard              → GreeterDashboard
/greeter-dashboard/missions     → GreeterMissions
/greeter-dashboard/missions/:id → GreeterMissionDetail
/greeter-dashboard/profile|availability|sop|messages|settings

/talent              → TalentDashboard
/talent/journey      → TalentJourney
/talent/greeter      → TalentGreeter
/talent/documents|messages|settings
```

---

## 2. AKTUELLER STAND (was funktioniert)

✅ Deploy auf Vercel läuft (Commit f8a9e5a+)
✅ Login + Auth + RLS korrekt konfiguriert
✅ Schema korrekt in Supabase Live-DB
✅ Company → Mission anfordern (`createMission` in missionEngine.js)
✅ Admin → Greeter zuweisen (ReassignDialog, Matching-Engine nach Stadt/Sprache)
✅ GreeterMissionDetail Ankunftstag-Flow: accept → ETA → on_the_way → arrived → complete
✅ Offline-Support + Sync-Indikator in GreeterMissionDetail
✅ Talent-Kontakt (Call/WhatsApp/Chat) im GreeterMissionDetail
✅ OperationsCenterDashboard (neues Admin-Dashboard) fertig gebaut
✅ TalentDashboard visuell stark (Hero, Fortschrittsbalken, emotionale Texte)
✅ `completeJourneyStep()` in missionEngine.js existiert und funktioniert
✅ `useRealtimeMessages()` Hook existiert und funktioniert
✅ Design-System vollständig (`Card`, `Button`, `Pill`, `Avatar`, `SectionHeader`, etc.)

---

## 3. KRITISCHE BUGS (kaputt jetzt)

### BUG 1 — Gebrochene Verbindung: Talent schreibt, Greeter liest nie
**Wo:** `TalentGreeter.jsx` nutzt `useRealtimeMessages()` → Talent kann Nachrichten senden.
`GreeterMissionDetail.jsx` (859 Zeilen!) hat **kein einziges** Message-Panel und keinen
`useRealtimeMessages()`-Aufruf. Talent schreibt "Ich habe meinen Pass vergessen" →
der Greeter sieht es **nirgends**.

**Fix:** In `GreeterMissionDetail.jsx` ein Message-Panel einbauen (~40 Zeilen).
Pattern aus `TalentGreeter.jsx` kopieren + `useRealtimeMessages({ missionId })`.

### BUG 2 — Greeter hat nach Ankunftstag nichts zu tun im System
**Wo:** `GreeterMissionDetail.jsx` — kein einziger `JourneyStep.filter()`-Aufruf.
Nach `status = in_progress` (Talent angekommen) existieren für den Greeter keine
Onboarding-Schritte im Interface. Die nächsten 4–6 Wochen (Anmeldung, Bankkonto,
Krankenversicherung) haben **null UI**. `completeJourneyStep()` ist gebaut aber
wird von keiner Greeter-Seite aufgerufen.

**Fix:** Steps laden + abhaken in `GreeterMissionDetail.jsx` im `in_progress`-Zustand.

### BUG 3 — TalentJourney zeigt immer statische Fake-Liste
**Wo:** `TalentJourney.jsx` Zeile ~28:
```js
if (js.length >= 8) {
  setSteps(js); // echte DB-Steps
} else {
  setSteps(JOURNEY_STEPS.map(...)); // statische Fallback-Liste ← immer aktiv
}
```
Wenn Admin 7 oder 9 Steps plant → Talent sieht nie den echten Plan.
Außerdem: Icons werden per Array-Index gemappt statt per `step.key` → custom Steps
bekommen falsche Icons.

**Fix:** Bedingung ändern auf `js.length > 0`. Icon-Mapping auf `key` statt Index.

### BUG 4 — DEFAULT_JOURNEY_STEPS sind falsch
**Wo:** `missionEngine.js` Zeile 1–10. Die Steps die automatisch beim Zuweisen
angelegt werden:
```js
const DEFAULT_JOURNEY_STEPS = [
  { title: 'Arrival Check', ... },
  { title: 'Meet Client', ... },
  // generisch, falsch
];
```
Die echten Steps stehen bereits in `journeySteps.js`:
```js
export const JOURNEY_STEPS = [
  { key: 'ankunft', title: 'Ankunft', ... },
  { key: 'wohnung', title: 'Unterkunft', ... },
  { key: 'sim',     title: 'SIM-Karte', ... },
  { key: 'anmeld',  title: 'Anmeldung', ... },
  { key: 'bank',    title: 'Bankkonto', ... },
  // ...
];
```
**Fix:** `DEFAULT_JOURNEY_STEPS` mit Daten aus `JOURNEY_STEPS` (journeySteps.js) befüllen.

### BUG 5 — CompanyArrivalForm CRASHT beim Absenden
**Wo:** `CompanyArrivalForm.jsx:60` ruft `base44.entities.Arrival.create(...)` auf.
`base44.entities` ist ein **fixes Objekt** das nur registrierte Entity-Namen kennt
(siehe `base44Client.js:264-265`). `Arrival` ist NICHT registriert →
`Cannot read properties of undefined` → die gesamte Form-Submission wirft einen Fehler.
Das ist kein totes Datenbankrauschen — es ist ein **aktiver Crash**.

**Fix:** `base44.entities.Arrival.create(...)` komplett entfernen. Nur `Mission` erstellen.
Keine DB-Änderung nötig, nur diese eine Zeile entfernen.

### BUG 6 — Zwei verschiedene DEFAULT_JOURNEY_STEPS (doppelte Quelle)
**Wo:** Es gibt zwei separate `assignGreeter`-Pfade:
- `AdminMissionDetail.jsx:330` → ruft `assignGreeter` aus `@/api` (`missionWriteApi.ts`)
- `GreeterDashboard.jsx:48` → ruft ebenfalls `assignGreeter` aus `@/api`

`missionWriteApi.ts` hat eine **eigene Kopie** von `DEFAULT_JOURNEY_STEPS` — diese wird
bei der Zuweisung genutzt. `missionEngine.js` hat eine andere Kopie — diese nutzt
`completeJourneyStep` / `transitionMission`. Zwei Quellen, zwei Listen, potentiell
unterschiedliche Steps je nach Pfad.

**Fix:** Eine einzige Quelle. `missionWriteApi.ts` und `missionEngine.js` beide auf
`JOURNEY_STEPS` aus `journeySteps.js` umstellen und die Duplikate entfernen.

### BUG 7 — "Invalid transition" wenn letzter Step abgehakt wird (Produktentscheidung getroffen)
**Wo:** `completeJourneyStep → transitionMission` in `missionEngine.js` erlaubt nur
`in_progress → completed`. Wenn der letzte Step abgehakt wird während die Mission
noch `assigned` oder `arrived` ist, wirft es **"Invalid transition"**.

**Produktentscheidung: Option A — "Abschließen" am Ankunftstag setzt Mission auf `in_progress`**

Begründung: "Abschließen" am Flughafen bedeutet Talent ist angekommen und das
Onboarding **startet** — nicht endet. Anmeldung, Bankkonto, KV sind noch offen.
`in_progress` ist der korrekte State für die Onboarding-Wochen.
`completed` = letzter JourneyStep abgehakt = Talent ist vollständig onboarded.

Konkrete Änderung in `missionEngine.js`:
```js
// transitionMission: State Machine erweitern
const TRANSITIONS = {
  open:        ['matched', 'cancelled'],
  matched:     ['assigned', 'cancelled'],
  assigned:    ['in_progress', 'cancelled'],   // ← Ankunftstag "Abschließen" → in_progress
  in_progress: ['completed', 'cancelled'],     // ← letzter Step → completed (auto)
  completed:   [],
  cancelled:   [],
};
```

In `GreeterMissionDetail.jsx`: Der "Abschließen"-Button (Ankunftstag) ruft
`transitionTo('in_progress')` statt `transitionTo('completed')` auf.
Danach zeigt die Detail-Seite die Journey-Steps für die Onboarding-Wochen.
Der letzte Step (z.B. "Onboarded") triggert via `completeJourneyStep` → `transitionMission`
automatisch `completed`.

---

## 4. WAS WEG KANN (löschen / zusammenführen)

### 4a. CompanyMissions-Seite — komplett entfernen
`CompanyMissions.jsx` (267 Z.) zeigt identischen Inhalt wie `CompanyDashboard.jsx` (244 Z.).
Beide zeigen Mission-Liste + Stats. Kein Mehrwert.
- Route `/company/missions` → redirect auf `/company` oder einfach entfernen
- `RequestForm`-Komponente in CompanyMissions ebenfalls entfernen (Duplikat von CompanyArrivalForm)

### 4b. AdminDashboard (alt) — entfernen
`AdminDashboard.jsx` (236 Z.) existiert neben dem neuen `OperationsCenterDashboard.jsx` (1264 Z.).
Route `/admin` zeigt bereits den neuen. Das alte löschen.

### 4c. Route `/company/candidates` — entfernen oder ersetzen
Rendert `AdminCandidates` für Company-User. Company sieht Admin-Daten die sie nicht
braucht. Route entfernen; Talent-Infos sind im CompanyMissionDetail zugänglich.

### 4d. Admin-Seiten konsolidieren (15 → ~8)
Folgende Seiten sind vermutlich Skeleton-Seiten und können zusammengeführt werden:
- `AdminTeam.jsx` + `AdminGreeters.jsx` → eine "Team"-Seite
- `AdminQuality.jsx` + `AdminAnalytics.jsx` → eine "Analytics"-Seite
- `AdminSOPs.jsx` und `GreeterSOP.jsx` → können dieselbe Quelle nutzen
- `AdminExecution.jsx` + `AdminActivityLog.jsx` → eine "Operations"-Seite
Nur zusammenführen wenn es sich um leere/doppelte Seiten handelt — erst prüfen.

---

## 5. WAS UMGEBAUT WIRD

### 5a. CompanyDashboard → CompanyHome
Die neue Haupt-Company-Seite vereint Dashboard + Missions auf einer Seite:
```
CompanyHome (ersetzt CompanyDashboard)
├── Stat-Zeile: Aktiv · Abgeschlossen · Talente  (kompakt, nicht aufgebläht)
├── Button "Neue Ankunft" → öffnet CompanyArrivalForm (3-Schritt-Wizard)
└── Missions-Liste: Aktive oben, geplante darunter, abgeschlossene einklappbar
    (inkl. Suche/Filter — aus CompanyMissions übernehmen)
```
Nav-Punkte Company: Übersicht · Dokumente · Rechnungen (3 statt 4)

### 5b. GreeterDashboard → Task-View
Greeter denkt nicht in Missionen, sondern in Aufgaben.
```
GreeterDashboard (umbau)
├── Hero: Begrüßung + heute-Zähler (bleibt)
├── "Heute" — alle fälligen Steps aus ALLEN Missionen zusammen
│     "14:30 — Flughafen · Maria Müller" (Link → GreeterMissionDetail)
│     "— — — · Kein Termin heute"
├── "Diese Woche" — nächste 7 Tage
├── Neue Anfragen (bleibt)
└── Meine Missionen (bleibt, aber sekundär)
```
Dafür braucht der Greeter-Dashboard einen Query:
`JourneyStep.filter({ greeter_id: profile.id })` oder über alle eigenen Missionen
die Steps mit `scheduled_at` für heute/diese Woche aggregieren.

### 5c. TalentDashboard + TalentJourney → ein Screen
Beide Seiten zeigen Journey-Progress. Zusammenführen:
```
TalentDashboard (behalten, TalentJourney optional als Alias)
├── Hero (bleibt — sehr gut)
├── Zone 1: "Jetzt" — aktueller Step + was mitbringen
├── Zone 2: Timeline — alle Steps mit scheduled_at wenn vorhanden
└── Greeter-Card (schneller Kontakt)
```

---

## 6. WAS NEU GEBAUT WIRD

### Phase 1 — Sofort (gebrochene Verbindungen fixen)

#### 6.1 DB-Migration: `scheduled_at` Spalte
```sql
-- supabase/migrations/2026-05-journey-step-scheduled-at.sql
alter table public.journey_steps
  add column if not exists scheduled_at timestamptz;
```
Diese Migration einmal im Supabase SQL-Editor ausführen.
Auch in `supabase/schema.sql` den idempotenten ALTER aufnehmen.

#### 6.2 MissionStepPlanner (Admin)
Neue Datei: `src/components/mission/MissionStepPlanner.jsx`
- Lädt Steps für mission_id, sortiert nach `order`
- **Vorlage anwenden**: Dropdown (Klinik-Onboarding / Standard Relocation) → Modal
  "Ersetzen oder Anhängen?" → bulkCreate mit scheduled_at aus offsetDays
- **Step hinzufügen**: Titel + optionale Notiz + optionales Datum
- **Inline-Edit**: Klick auf Step-Titel → editierbar
- **Hoch/Runter**: order als 10/20/30 (Lücken), Update nur die zwei betroffenen
- **Löschen**: mit Bestätigung
- **Optimistic UI**: sofort lokal neu sortieren, im Hintergrund speichern
- **Guard vor Greeter-Zuweisung**: wenn steps.length === 0 → Warnung in AdminMissionDetail
- Steps-Persistenz: `base44.entities.JourneyStep` create/update/delete/bulkCreate

Templates (neue Datei `src/lib/missionTemplates.js`):
```js
export const MISSION_TEMPLATES = [
  {
    name: 'Klinik-Onboarding (Pflege)',
    steps: [
      { title: 'Flughafenabholung',              offsetDays: 0  },
      { title: 'Unterkunft & Check-in',           offsetDays: 0  },
      { title: 'Wohnungsgeberbescheinigung',       offsetDays: 1  },
      { title: 'Ersteinkauf',                      offsetDays: 1  },
      { title: 'SIM-Karte',                        offsetDays: 2  },
      { title: 'Anmeldung Einwohnermeldeamt',       offsetDays: 5  },
      { title: 'Bankkonto',                        offsetDays: 14 },
      { title: 'Krankenversicherung',              offsetDays: 14 },
      { title: 'Abschluss & Feedback',             offsetDays: 30 },
    ],
  },
  {
    name: 'Standard Relocation',
    steps: [/* aus JOURNEY_STEPS ableiten */],
  },
];
```
`offsetDays` → `scheduled_at = mission.datetime + offsetDays` (nur wenn mission.datetime vorhanden)

Einbau: In `AdminMissionDetail.jsx` die read-only Checkliste (Z. 257ff.) durch
`<MissionStepPlanner missionId={mission.id} missionDatetime={mission.datetime} />` ersetzen.

#### 6.3 Steps + Messages in GreeterMissionDetail
In `GreeterMissionDetail.jsx` — **nur** wenn `mission.status === 'in_progress'`:

**Steps-Section:**
```jsx
// laden
const [steps, setSteps] = useState([]);
useEffect(() => {
  base44.entities.JourneyStep
    .filter({ mission_id: id }, 'order')
    .then(js => setSteps(js.sort((a,b) => a.order - b.order)));
}, [id]);

// abhaken
const onComplete = async (stepId) => {
  await completeJourneyStep(stepId, user?.email);
  setSteps(prev => prev.map(s => s.id === stepId
    ? { ...s, status: 'completed', completed_at: new Date().toISOString() }
    : s));
};
```

Anzeige: Kompakte Checkliste. Status-Badge (pending/in_progress/completed).
Datum als relativer Text: "heute", "in 3 Tagen", "2 Tage überfällig" (aus `scheduled_at`).
Großer Abhak-Button (thumb-friendly, mobile).

**Message-Panel:**
```jsx
const { thread, send } = useRealtimeMessages({ missionId: id });
// Thread anzeigen + Eingabefeld
```
Nachrichten vom Talent erscheinen hier. Greeter kann antworten.

#### 6.4 scheduled_at in TalentJourney + TalentDashboard anzeigen
Wenn `step.scheduled_at` gesetzt: "geplant: 14.06." oder "in 12 Tagen" anzeigen.
Relativen Text per Hilfsfunktion:
```js
function relativeStepDate(scheduled_at) {
  const diff = Math.ceil((new Date(scheduled_at) - Date.now()) / 86400000);
  if (diff === 0) return 'heute';
  if (diff === 1) return 'morgen';
  if (diff > 1) return `in ${diff} Tagen`;
  if (diff === -1) return 'gestern fällig';
  return `${Math.abs(diff)} Tage überfällig`;
}
```

### Phase 2 — Diese Woche

#### 6.5 Proaktive Step-Erinnerungen (Supabase pg_cron)
Supabase Edge Function die täglich läuft:
- Alle Steps mit `scheduled_at` zwischen heute und heute+3
- Notification erstellen: `createNotification(greeterEmail, 'Anmeldung in 2 Tagen', ...)`
- Überfällige Steps (scheduled_at < heute, status != completed): Eskalation an Admin

```sql
-- In Supabase: cron job
select cron.schedule(
  'step-reminders',
  '0 8 * * *',
  $$ select net.http_post(
    url := 'https://DEINE-SUPABASE-URL/functions/v1/step-reminders',
    headers := '{"Authorization": "Bearer SERVICE_KEY"}'::jsonb
  ) $$
);
```

#### 6.6 Flug-Tracking
Neues Feld `flight_number text` in `missions`-Tabelle:
```sql
alter table public.missions add column if not exists flight_number text;
```
Edge Function (`supabase/functions/flight-tracker/index.ts`):
- Täglich: alle Missionen mit `datetime = today` und `flight_number` → AviationStack API
- Bei Landung: `createNotification(greeterEmail, 'LH456 gelandet — MUC T2', ...)`
- AviationStack Free Tier: 500 Requests/Monat (reicht für 20 Missionen/Monat)

---

## 7. LEITPRINZIPIEN FÜR DEN UMBAU

### Proaktiv statt reaktiv (Floqque-Prinzip)
Das System soll pushen, nicht warten. Greeter muss nicht nachschauen — er bekommt
eine Meldung. Admin muss nicht jede Mission öffnen — er sieht die Ausnahmen-Queue.

### Jede Rolle denkt anders
- **Company** denkt in **Mitarbeitern** ("Wie geht's Müller?")
- **Greeter** denkt in **Aufgaben** ("Was mache ich heute?")
- **Talent** denkt in **nächsten Schritten** ("Was kommt?")
- **Admin** denkt in **Missionen** und **Ausnahmen** ("Wo hakt es?")
Jede UI muss in der Sprache ihrer Rolle sprechen.

### Design-System konsequent nutzen
Alle vorhandenen Komponenten verwenden: `Card`, `Button`, `Pill`, `Avatar`,
`SectionHeader`, `StatusPill`, `EmptyState`, `SkeletonCard`.
Design Tokens: `var(--ds-card)`, `var(--ds-t1/t2/t3)`, `var(--ds-card-border)`.
Gold-Akzent: `#c49228`, `text-gold`, `bg-gold/15`.
Font: `font-serif` für Überschriften, system-font für Body.

### Mobile-First für Greeter
Greeter arbeitet am Flughafen, am Amt, unterwegs. Alle Greeter-UIs müssen mit
dem Daumen bedienbar sein. Buttons mindestens 44px. Steps mit großem Tap-Target.

### Keine Regression
Bestehende funktionierende Flows (Ankunftstag-Flow im GreeterMissionDetail,
TalentDashboard Hero, CompanyArrivalForm Wizard) nicht anfassen — erweitern.

---

## 8. REIHENFOLGE DER IMPLEMENTIERUNG

```
Priorität 1 (Bugs die jetzt schon crashen oder blockieren):
  □ CompanyArrivalForm.jsx:60 — base44.entities.Arrival.create() entfernen → CRASH-FIX
  □ missionWriteApi.ts + missionEngine.js — DEFAULT_JOURNEY_STEPS auf JOURNEY_STEPS
    aus journeySteps.js vereinen (eine Quelle, beide Assign-Pfade)
  □ missionEngine.js TRANSITIONS — assigned → in_progress ergänzen
  □ GreeterMissionDetail.jsx — "Abschließen" → transitionTo('in_progress')
  □ TalentJourney.jsx: js.length >= 8 → js.length > 0, Icon-Mapping per key
  □ GreeterMissionDetail.jsx: Steps laden + abhaken (wenn status === 'in_progress')
  □ GreeterMissionDetail.jsx: Message-Panel (useRealtimeMessages einbauen)

Priorität 2 (Kern-Feature):
  □ DB: ALTER journey_steps ADD COLUMN scheduled_at
  □ src/lib/missionTemplates.js (neu)
  □ src/components/mission/MissionStepPlanner.jsx (neu)
  □ AdminMissionDetail.jsx: Checkliste → MissionStepPlanner
  □ TalentJourney + TalentDashboard: scheduled_at anzeigen (relativ)

Priorität 3 (Konsolidierung):
  □ CompanyDashboard + CompanyMissions → CompanyHome
  □ Route /company/missions entfernen
  □ Route /company/candidates entfernen
  □ AdminDashboard.jsx (alt) löschen
  □ GreeterDashboard: Task-View (heute-Steps aggregiert)

Priorität 4 (Proaktiv / Nächste Phase):
  □ Supabase pg_cron: Step-Erinnerungen
  □ Feld flight_number in missions
  □ Edge Function: Flug-Tracking via AviationStack
  □ Company: Status-Emails bei Mission-Wechsel
  □ Talent-Portal: Sprachauswahl DE/EN

Später:
  □ CSV-Import für Company (Bulk-Anforderung)
  □ "Was mitbringen"-Checkliste pro Step-Typ
  □ Template-Editor in Admin-UI (ohne Deploy)
  □ SLA-Dashboard für Company
```

---

## 9. VERIFIKATION

Nach jeder Priorität:
1. `node node_modules/vite/bin/vite.js build` → grün, keine TypeScript/Import-Fehler
2. Als **Greeter** Mission öffnen (in_progress) → Steps sichtbar, abhaken funktioniert,
   Talent-Nachrichten sichtbar
3. Als **Talent** TalentJourney öffnen → echte DB-Steps sichtbar (nicht Fake-Liste)
4. Als **Admin** Mission öffnen → MissionStepPlanner: Vorlage anwenden, Step hinzufügen,
   Datum setzen, hoch/runter, löschen → Reload: alles persistiert
5. Als **Company** → eine Seite (kein /missions-Link mehr), Neue Ankunft Button
   öffnet Wizard

---

## 10. NICHT ANFASSEN

- `supabase/SETUP_ALL.sql` nicht gegen Live-DB ausführen (löscht Daten)
- `auth.users` Tabelle nicht verändern
- `GreeterMissionDetail.jsx` Ankunftstag-Flow (accept→ETA→on_the_way→arrived) bleibt
- `CompanyArrivalForm.jsx` 3-Schritt-Wizard bleibt (nur Arrival-Entity-Erstellung raus)
- `OperationsCenterDashboard.jsx` (neues Admin-Dashboard) bleibt wie es ist
- Keine Drag&Drop-Bibliotheken einführen (hoch/runter per Button reicht)
- Keine neue Realtime-/Query-Architektur (React Query bleibt)
