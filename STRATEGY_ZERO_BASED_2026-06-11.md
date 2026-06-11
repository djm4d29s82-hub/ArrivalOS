# ARRIVALOS — ZERO-BASED STRATEGIE-AUDIT

**Datum:** 11.06.2026 · **Perspektive:** Neuer Gründer / CTO / Produktstratege / UX / Relocation-Manager / Investor — sieht das Projekt zum ersten Mal.
**Auftrag:** Nicht Fehler finden. Nicht optimieren. Alles grundsätzlich hinterfragen.

> Das Wichtigste vorweg, in einem Satz: **ArrivalOS hat das falsche Kernobjekt.** Es ist als Dispatch-System für dreistündige Einsätze („Missionen") gebaut — verkauft wird aber ein 90-Tage-Versprechen an einen Arbeitgeber. Fast alle Schwächen des Produkts folgen aus dieser einen Fehlentscheidung.

---

# PHASE 1 — DAS PROBLEM (unabhängig vom Produkt)

## Welches Problem existiert wirklich?

Eine internationale Fachkraft, die in Deutschland anfängt — Pflegekraft aus Indien, Elektriker aus Pakistan, Entwicklerin aus Mexiko — durchläuft zwischen Vertragsunterschrift und „funktioniert im Alltag" einen 3–6-monatigen Hindernislauf: Visum/§81a-Verfahren, Berufsanerkennung, Flug, Wohnung, Anmeldung (Termin-Knappheit!), Bankkonto (braucht Anmeldung), Krankenkasse (braucht Konto), SIM, Aufenthaltstitel, Familiennachzug, Sprache, Einsamkeit.

Drei Parteien leiden:

1. **Der Arbeitgeber** (Klinik, Mittelständler) hat 15.000–50.000 € in Recruiting investiert. Jede Woche Verzögerung kostet Besetzungstage; jede Frühkündigung in den ersten 6 Monaten vernichtet die gesamte Investition. HR koordiniert heute per E-Mail, WhatsApp, Excel und Anrufen — 10–20 Stunden pro Zuzug, ohne Überblick, ohne Nachweis.
2. **Das Talent** ist gestresst, versteht das System nicht, hat Angst, Fehler mit Behörden zu machen, und entscheidet in den ersten 4 Wochen emotional, ob es bleibt.
3. **Der Betreiber** (Relocation-Dienstleister) arbeitet heute wie eine Agentur: Menschen + Telefon + Bauchgefühl. Teuer, intransparent, nicht skalierbar.

## Wer bezahlt? Wer nutzt? Wer profitiert?

| Frage | Antwort |
|---|---|
| Wer bezahlt? | **Nur der Arbeitgeber.** (490–900 €/Ankunft laut aktuellem Pricing — plausibel.) Talente zahlen nie; Greeter werden bezahlt. |
| Wer nutzt täglich? | Der **Betreiber/Ops** (ganztags), **Greeter** (an Einsatztagen), das **Talent** (während seiner 90 Tage, mobil). HR schaut **wöchentlich** 5 Minuten rein. |
| Wer profitiert? | Arbeitgeber: Planbarkeit + Zeit + Retention. Talent: Sicherheit + Würde. Betreiber: Marge pro Fall + Partner-Provisionen. |

Konsequenz, die das heutige Produkt ignoriert: **Der Zahler (HR) ist ein Wenig-Nutzer.** Sein Portal muss in 5 Minuten pro Woche Vertrauen erzeugen — nicht ihn mit Ops-Mechanik beschäftigen. Die tägliche Software gehört Ops, Greeter und Talent.

## Mensch vs. Software

**Was heute ein Mensch macht (und Software übernehmen sollte):** Status nachhalten, erinnern, Termine jagen und koordinieren, Dokumente einsammeln und prüfen, dieselben 50 Fragen beantworten („Was ist Anmeldung?"), Übergaben zwischen Beteiligten, Abrechnung, Nachweise führen.

**Was Software niemals übernehmen sollte:** Am Gate stehen und lächeln. Vertrauen aufbauen. In der Krise urteilen (Talent weint am Flughafen, Vermieter taucht nicht auf). Mit dem Sachbearbeiter im Bürgeramt verhandeln. **Der Mensch ist das Produkt; die Software ist sein Exoskelett.** Das aktuelle Produkt versteht das halb: Es hat Greeter — aber es behandelt sie als austauschbare Gig-Ressource (Marktplatz-Matching, Ratings), nicht als das Gesicht der Marke.

---

# PHASE 2 — REALITÄT DES BETRIEBS

## Wie Relocation wirklich abläuft

**Vor der Anreise (Woche −12 bis −1):** Visum/beschleunigtes Fachkräfteverfahren, Anerkennungsbescheid (Pflege: Defizitbescheid? Kenntnisprüfung?), Apostillen, Übersetzungen, Flugbuchung, Wohnungssuche (das härteste Problem in jeder Großstadt), erste Gehaltsfragen, Familienplanung. **Hier entstehen 80 % der Verzögerungen und Eskalationen** — Visum verzögert, Dokument fehlt, Wohnung platzt. *Das aktuelle Produkt beginnt faktisch am Flughafen und verpasst diese Phase fast vollständig* (ein `has_issue`-Flag „Visum verzögert" ist keine Prozessunterstützung).

**Ankunftstag:** Abholung, Schlüssel, SIM, Grundeinkauf, Orientierung. Reale Störungen: Flugverspätung, Talent nicht am Gate, Gepäck weg, Erschöpfung. Dauer: ein Nachmittag. *Das ist der einzige Teil, den das Produkt heute wirklich gut abbildet.*

**Erste Woche:** Anmeldung (Termin oft 2–6 Wochen Vorlauf → muss VOR Anreise gejagt werden), Bankkonto, Krankenkasse, Lohndaten an Arbeitgeber, ÖPNV, Arbeitsbeginn. Engpass ist nicht Begleitung, sondern **Terminbeschaffung**.

**Erster Monat:** Aufenthaltstitel/Fiktionsbescheinigung, Anerkennung läuft weiter, Sprachkurs, Familiennachzug-Anträge, soziale Anbindung. **Hier entscheidet sich Retention** — und hier endet das Produkt heute komplett (Mission `completed` nach dem Welcome Day).

## Welche Probleme treten wirklich auf — und welche nie?

**Wirklich:** Visum-/Anerkennungs-Verzögerung · kein Anmeldetermin · keine Wohnung · Dokument fehlt/falsch beglaubigt · Talent erreicht niemanden (keine deutsche SIM, kein Datenvolumen) · Greeter fällt kurzfristig aus · Talent ist einsam und kündigt in Woche 6 · HR fragt „Wie ist der Stand?" und niemand weiß es.

**Nie (so):** Niemand beobachtet sekündlich eine Status-Maschine mit 13 Zuständen. Kein Ops-Mensch schaut auf eine Deutschland-Heatmap. Kein HR-Mensch will wissen, ob die Mission `met_talent` oder `arrived` ist. SLA-Farbeskalation für eine Flughafenabholung ist Kontrollraum-Theater — die reale „Eskalation" ist ein Anruf.

## Fehlende vs. erfundene Prozesse

| Fehlt (real, geschäftskritisch) | Erfunden (im Produkt, ohne reales Gegenstück) |
|---|---|
| Pre-Arrival-Vorbereitung (Visum-Tracking, Dokumenten-Checkliste, Termin-Jagd) | 13-Status-State-Machine mit `met_talent`/`arrived`-Differenzierung |
| Wohnungs-Workflow (Suche, Besichtigung, Übergabe, Kaution) | Missions-Marktplatz (open→matched→assigned-Bidding) bei <50 Greetern |
| Anerkennung (Pflege!) als eigener Track | Live-Ops-Heatmap, Activity-Feed, Hover-Previews |
| Tag 8–90: Aufenthaltstitel, Familie, Sprachkurs, Check-ins | SLA-Breach-Timer auf Einsatzebene |
| Termin-Management (Bürgeramt-Slots!) | Offline-Konfliktauflösungs-Dialoge (nicht mal eingebunden) |
| No-Show-/Ausfall-Protokolle | Ratings-System ohne Konsequenz |

---

# PHASE 3 — ZERO-BASED REDESIGN

Vergiss den Code. Heute neu gegründet, sähe das Produkt so aus:

## Das Kernobjekt: der **Arrival Case** (Fall)

Ein Fall = ein Talent × ein Arbeitgeber × eine Stadt × ein Zeitraum (Vertrag unterschrieben → Tag 90). Der Fall ist das, was der Arbeitgeber kauft, was Ops betreibt, was das Talent durchlebt. Alles andere hängt am Fall:

```
ArrivalCase
├── Phase:    Vorbereitung → Anreise → Erste Woche → Stabilisierung → Abgeschlossen
├── Health:   🟢 on track | 🟡 Aufmerksamkeit | 🔴 blockiert (+ Grund, + Verantwortlicher, + Frist)
├── Timeline: geordnete Liste von Items
│   ├── Task        (jemand muss etwas tun: Talent / Companion / Ops / HR)
│   ├── Termin      (zeitgebunden, ggf. mit Begleitung = „Einsatz")
│   └── Ereignis    (passiert: Visum erteilt, Flug gelandet, Anmeldung bestätigt)
├── Dokumente  (je Item anforderbar, mit Status geprüft/fehlt)
├── Konversation (EIN Thread pro Fall, kanal-agnostisch: App/WhatsApp/E-Mail)
├── Services   (Wohnung, Konto, Versicherung, Sprachkurs — Partner-Aufträge)
└── Beteiligte (Talent, HR-Kontakt, Companion(s), Ops-Owner)
```

Der heutige Geniestreich, der bleiben darf: Ein **Termin mit Begleitung** ist das, was heute „Mission" heißt — aber als *Kind des Falls*, nicht als Zentrum des Universums. Sein Lebenszyklus: `angeboten → bestätigt → erledigt | ausgefallen`. Vier Zustände. Fertig.

## Rollen

**Existieren:** Talent · Employer (HR; Käufer + Wochen-Betrachter) · Companion (heute „Greeter" — bewusst umbenennen: er begleitet 90 Tage, nicht 3 Stunden) · Operator (Ops = Admin = Support; bei dieser Firmengröße eine Rolle) · später: Partner (read-only auf eigene Aufträge).

**Existieren nicht:** separates „Support-Team" (das ist der Operator) · „Candidate" als von „Talent-User" getrenntes Objekt (heute zwei Entitäten + Verknüpfungsfeld — eine Person ist eine Person) · anonymer Marktplatz-Greeter-Pool.

## Daten (minimal)

Person (Talent mit Sprache, Herkunft, Beruf, Familienstand) · Employer (+ HR-Kontakte) · Companion (+ Städte, Sprachen, Verfügbarkeit, **private** Auszahlungsdaten) · ArrivalCase · TimelineItem · Document · Message/Thread · ServiceOrder · LedgerEntry (Forderung an Employer / Verbindlichkeit an Companion — Abrechnung **pro Fall**, nicht pro Mission). Dazu Playbooks: Vorlagen je (Stadt × Visa-Typ × Beruf), die einen Fall mit 30–50 Timeline-Items instanziieren.

## Prozesse

**Nötig:** Fall-Intake (HR legt Person an → Playbook instanziiert → Preis sichtbar) · Termin-Jagd & Scheduling · Dokumenten-Einsammlung mit Prüfstatus · Kommunikation mit Routing (Talent schreibt einmal; Ops/Companion sehen es im Fall) · Eskalation (rot = Inbox-Eintrag mit Owner + Frist) · Companion-Disposition (Wochenplan, nicht Einzel-Bidding) · Abrechnung & Auszahlung je Fall/Einsatz · 90-Tage-Check-ins.

**Unnötig:** Matching-Marktplatz-Mechanik · Realtime-State-Sync über BroadcastChannel · Offline-Konfliktauflösung · Audit-Viewer · SLA-Engine auf Einsatzebene.

---

# PHASE 4 — MISSIONEN HINTERFRAGEN

**Denkt irgendein Nutzer in Missionen? Nein.**

| Nutzer | Denkt in… | Fragt sich… |
|---|---|---|
| HR | **Personen** | „Wie steht es um Priya? Kommt sie am 2.6.? Muss ich etwas tun?" |
| Talent | **nächsten Schritten** | „Was muss ich als Nächstes tun? Wer hilft mir?" |
| Companion | **Terminen heute/diese Woche** | „Wann, wo, wer, was mitbringen?" |
| Operator | **Fällen + Ausnahmen** | „Welche Fälle sind rot, und was ist der nächste Zug?" |

„Mission" ist die Innensicht eines Dispatch-Systems (Uber-Metapher aus dem CLAUDE.md: „Uber Dispatch + Airline Ops"). Sie erzeugt nachweisbar Schäden im heutigen Produkt: HR sieht Status wie „Matched" (bedeutungslos für ihn); das Talent-Erlebnis endet mit `completed` nach dem Ankunftstag; die Abrechnung klebt an Missionen statt am verkauften Paket; und Ops verwaltet pro Zuzug 3–6 künstliche Missions-Objekte, wo ein Fall mit Timeline reichte.

**Das bessere Modell** steht in Phase 3: Case + Timeline + Termin-mit-Begleitung. Health-Ampel statt State-Machine. Die bestehende `mission_services`/`partners`/`consents`-Struktur passt übrigens hervorragend in dieses Modell — sie ist heimlich schon fall-orientiert.

---

# PHASE 5 — UX NEU DENKEN

## Seitenbestand vs. Bedarf

Heute: **34 Routen** (19 Admin, 7 Company, 8 Greeter, 5 Talent). Zero-based braucht es **~12**.

**Operator — heute 19 Seiten, nötig sind 3:**
1. **Heute** — Termin-Liste des Tages + Ausnahmen-Inbox (alle 🔴/🟡 mit nächstem Zug). Ersetzt: OperationsCenter, Execution, Logs, Quality.
2. **Fälle** — Liste aller Cases mit Phase/Health/Owner, Drill-in = Fall-Akte. Ersetzt: Missions, Candidates, Messages (Thread lebt im Fall).
3. **Abrechnung** — Forderungen + Auszahlungen. Ersetzt: Invoices, Payouts.
Companions, Unternehmen, Partner, Playbooks, Einstellungen = Verwaltung hinter einem Menüpunkt, keine Hauptnavigation.

**Employer — heute 7 Seiten, nötig ist im Kern 1:** Personenliste mit Fortschrittsbalken + Ampel; Klick = Fall-Sicht (Timeline, nächste Schritte, Kontakt); Button „Neuer Zuzug". Dazu Rechnungen. SLA-Seite, separate Dokumente-Seite, separater Messages-Bereich: weg — alles gehört in den Fall.

**Talent — 1 Screen:** „Dein nächster Schritt" groß oben, Timeline darunter, Companion-Karte mit Anruf/Chat, Dokumente inline am jeweiligen Schritt. (Das heutige TalentDashboard ist nah dran — beste Seite des Produkts.)

**Companion — 2 Screens:** Heute/Woche (Terminliste mit Route) + Termin-Detail (Person, Kontext, Checkliste, Aktionen). (Der heutige Greeter-Flow ist gut — er braucht nur den Wochen-/Mehrpersonen-Blick.)

## Antworten auf die Prüffragen

Versteht ein neuer Nutzer sofort, was zu tun ist? **HR: nein** (Jargon „Matched/Zugewiesen", kein geführter Erststart). **Talent: fast** (sobald EN Default ist). **Greeter: ja.** **Admin: nur der Erbauer selbst** — 19 Seiten setzen voraus, dass man das System gebaut hat. Zu viele Klicks? Ja: Admin-Missionsdetail ↔ Kandidat ↔ Nachrichten sind drei Orte für einen Vorgang. Zu viele Informationen? Ops-Center ja (Heatmap, Feed, Hover-Preview konkurrieren um Aufmerksamkeit); Talent nein.

**Verschwinden sollten:** OperationsCenterDashboard (in „Heute"-Inbox aufgehen), AdminExecution, AdminQuality, AdminSOPs (→ in Playbooks), AdminTemplates (→ Playbooks), CompanySLA (→ ein Block im Dashboard), AdminActivityLog (→ Verlauf im Fall), AdminAnalytics (bis es echte Kohorten gibt).
**Fehlen:** Ausnahmen-Inbox · Fall-Akte als EIN Ort pro Person · Playbook-Editor · Termin-Verwaltung mit Slot-Jagd · Wochen-Dispo für Companions · Employer-Erststart-Wizard.

---

# PHASE 6 — TALENT EXPERIENCE (nur aus Talent-Sicht)

Priya, 26, Pflegefachkraft aus Kerala, B1-Deutsch, erster Flug ihres Lebens, Vertrag bei einer Klinik in Wuppertal.

**Versteht sie sofort, was passiert?** Heute: Sie bekommt eine **deutsche** Login-Maske („Willkommen zurück" — sie war nie da), muss ein Passwort setzen, findet ein Dashboard, dessen Standardsprache Deutsch ist, und dessen Inhalt erst am Ankunftstag lebendig wird. Vorher: Leere. Ihre dringendsten Fragen — *Bekomme ich mein Visum rechtzeitig? Wo werde ich wohnen? Wer holt mich ab? Was, wenn ich niemanden erreiche?* — beantwortet das Produkt nicht oder zu spät.

**Was fehlt:** EN/Native-first ab dem allerersten Touchpoint · Pre-Arrival-Begleitung ab Woche −8 (Checkliste mit Erklärungen: „Was ist die Anmeldung? Warum brauchst du sie? Wir machen den Termin — du musst nur kommen") · ein Gesicht („Das ist Miriam. Sie holt dich ab. Hier ist ihr Foto, hier ihre Nummer") **vor** dem Flug · ein Kanal, der ohne deutsche SIM funktioniert (WhatsApp) · Offline-fähiges „Ankunfts-Ticket" (Wer holt mich ab, wo, Notfallnummer — als Screenshot/Wallet-Pass, denn am Flughafen gibt es kein WLAN-Vertrauen) · Tag 8–90 (Aufenthaltstitel, Familiennachzug, „Wie geht es dir wirklich?"-Check-ins).

**Was verwirrt:** Drei Markennamen (Arrival Germany / ArrivalOS / NeuLand) · Begriff „Mission" / „Greeter" (ihr Begleiter ist kein Grüßer) · Settings/Suche/Glocke-Apparat eines B2B-Tools für jemanden, der genau eine Reise macht.

**Die perfekte Talent Experience** ist gar keine App, sondern ein Gefühl: *„Da ist ein Mensch, der mich kennt, und ein Plan, der stimmt."* Konkret: WhatsApp als Hauptkanal, die Web-App als schöner, stiller Plan dahinter (ein Screen, Muttersprache, nächster Schritt riesig), null Pflicht-Logins vor der Ankunft (Magic-Link), und nach Tag 1 genau drei Dinge: Timeline, Mensch, Notfallknopf.

---

# PHASE 7 — COMPANION/GREETER EXPERIENCE

**Kann ein Greeter heute täglich damit arbeiten?** Für 1–3 parallele Einsätze: ja, der Flow ist gut. **Kann er 20 Talente gleichzeitig betreuen? Nein** — und genau das ist der Skalierungsfall des Geschäftsmodells (ein guter Companion in Köln betreut eine ganze Klinik-Kohorte):

- Es fehlt die **Wochen-/Kalenderansicht** über alle Personen (heute: Missionsliste, eine nach der anderen).
- Es fehlt das **Mini-CRM pro Talent** (Sprache, Familie, Eigenheiten, Verlauf, letzte Nachricht) — heute stehen Notizen am Kandidaten-Objekt, das der Greeter kaum sieht.
- Es fehlen **Routen/Tagesplanung** (3 Termine in 3 Stadtteilen), **Konfliktwarnung** bei Überschneidung, ICS-Export.
- Es fehlen **Automatisierungen, die Profis ausmachen:** vorausgefüllte Anmeldeformulare (Daten sind ja alle da!), automatische „Bring mit"-Listen an das Talent am Vorabend, Terminbestätigungs-Pings, Wegbeschreibung als Deeplink.
- **Zu kompliziert:** Spesen-Workflow mit Belegfoto ist gut, aber Auszahlung intransparent (kein Datum, kein Beleg-PDF); Statuskette mit 5 Pflicht-Taps (unterwegs→da→getroffen→läuft→fertig) — zwei reichen (unterwegs, erledigt), der Rest ist Ops-Theater auf Kosten des Greeters.

Strategisch: Der Companion ist das Produkt (Phase 1). Die App muss ihn **stolz und schnell** machen — nicht überwachen.

---

# PHASE 8 — EMPLOYER EXPERIENCE

**Warum bezahlt ein Arbeitgeber?** Nicht für Software. Für ein **Ergebnis mit Beweis**: „Ihre Pflegekraft ist am Tag X arbeitsfähig (angemeldet, versichert, Konto, wohnt), Sie mussten nichts tun, und hier ist der Nachweis." Plus den unausgesprochenen Grund: **Retention** — wer gut ankommt, bleibt.

**Was er in 5 Minuten erkennen muss (und heute nicht erkennt):**
1. Liste seiner Leute mit Ampel + „Arbeitsfähig ab"-Datum. *(Heute: Missions-Karten mit „Matched".)*
2. Bei Rot: Klartext-Grund + wer es löst + bis wann. *(Heute: issue_message-Flag ohne Prozess.)*
3. Was es kostet. *(Heute: Preis erscheint nirgends vor der Rechnung.)*
4. Ein PDF pro Monat für seinen Chef. *(Existiert nicht.)*

**Was ihn nicht interessiert (heute aber prominent ist):** Missions-Status-Mechanik, Greeter-Ratings, Live-Feeds, Kennzahlen-Seite mit Ops-Metriken, das gesamte Vokabular des Dispatch-Systems.

**Fehlende Dashboards:** Kohorten-/Retention-Sicht („12 von 12 angekommen, 11 nach 90 Tagen an Bord — 92 %") — das ist das Verkaufsargument für die Vertragsverlängerung und der einzige Chart, den ein Geschäftsführer je ansehen wird. **Unnötige Dashboards:** CompanySLA in heutiger Form.

---

# PHASE 9 — VISUELLES DESIGN (strategisch)

**Wirkt es modern/professionell/vertrauenswürdig/hochwertig/enterprise-tauglich?** Modern: ja. Professionell: überwiegend. Hochwertig: an guten Stellen (Talent-Dashboard, Greeter-Aktionsleiste) ja. Vertrauenswürdig: **gebremst** durch drei Markennamen, Mini-Schriften (10–13 px), schwache Kontraste in der Sidebar und Emoji in B2B-Aktionen. Enterprise-tauglich: noch nicht — Enterprise-Einkäufer lesen Barrierefreiheit, Konsistenz und ruhige Dichte als Reife-Signale.

**Bereits stark (behalten als Design-Fundament):** Navy/Gold/Serif-Marke mit dem Deutschland-Strich im Logo · Design-Token-System mit sauberem Dark/Light · Talent-Dashboard (Wärme) · Greeter-Primäraktionsleiste · Empty-States.

**Komplett neu gestalten:** Ops-Center (Kontrollraum-Ästhetik → ruhige Inbox: „Was braucht jetzt meine Entscheidung?") · Company-Dashboard (Dispatch-Jargon → Personen-Liste mit Ampeln) · Login/Erst-Kontakt (zweisprachig, einladend statt „internes Tool") · Tabellen-Seiten im Admin (derzeit Roh-Listen ohne Hierarchie).

**Design-Leitsatz für die Neufassung:** Das Produkt verkauft *Ruhe in einem nervösen Prozess*. Jede Oberfläche muss die Frage beantworten: „Muss ich etwas tun — ja oder nein?" Farbige Dichte (Heatmaps, Feeds, 13 Statusfarben) erzeugt das Gegenteil.

---

# PHASE 10 — ARRIVALOS ALS BETRIEBSSYSTEM

Wenn ArrivalOS das Betriebssystem für die ersten 90 Tage einer Fachkraft wäre, hätte es **acht Kernobjekte** — und „Mission" ist keines davon:

| Kernobjekt | Rolle im OS |
|---|---|
| **Arrival Case** | Der Prozess. Eine Akte pro Person, Phase + Health. |
| **Person (Talent)** | Der Mensch. Sprache, Beruf, Familie, Historie. |
| **Employer** | Der Kunde. Kontakte, Verträge, Kohorten. |
| **Timeline-Item** | Die Arbeit. Task/Termin/Ereignis, mit Owner und Frist. Termin-mit-Begleitung = der „Einsatz" (Rest-DNA der Mission, 4 Zustände). |
| **Document** | Der Beweis. An Items gebunden, mit Prüfstatus. |
| **Thread** | Die Kommunikation. Ein Gespräch pro Fall, Kanäle (App/WhatsApp/E-Mail) sind nur Transport. |
| **ServiceOrder** | Das Ökosystem. Wohnung/Konto/Versicherung/Sprachkurs an Partner, mit Consent + Provision. *(Im heutigen Code bereits richtig angelegt!)* |
| **LedgerEntry** | Das Geld. Forderung je Fall, Verbindlichkeit je Einsatz/Companion. |

Dazu drei OS-„Dienste": **Playbooks** (Prozess-Templates je Stadt/Visum/Beruf — das eigentliche IP des Unternehmens, heute nur rudimentär als mission_templates), **Notifications** (ein Regelwerk, alle Kanäle) und **Ausnahmen-Inbox** (alles Rote landet genau an einem Ort).

**Sind Missionen noch notwendig?** Als Wort: nein. Als Konzept: nur die abgespeckte Form „begleiteter Termin". Alles andere am Missionssystem — Marktplatz-Status, Matching-Arrays, SLA-Maschine, Stage-Tracking — ist Komplexität ohne Nutzer.

---

# PHASE 11 — RADIKALE LISTEN (4 × 50)

## A. Top 50 — ENTFERNEN

1. „Mission" als Kernobjekt und Wort im UI
2. Status open/matched (Marktplatz-Bidding)
3. Status met_talent (vs. arrived unentscheidbar)
4. Status issue_reported UND issue_open (ein Flag reicht)
5. greeter_stage als Parallel-Statusfeld
6. matched_greeters-Array (direkte Disposition statt Pool)
7. SLA-Engine + Breach-Timer auf Einsatzebene
8. Deutschland-Heatmap im Ops-Center
9. Live-Activity-Feed mit Hover-Previews
10. missionRealtimeSync (BroadcastChannel-Sync)
11. missionOfflineQueue + Konflikt-Dialoge (ungenutzt)
12. AuditTrailViewer + auditIntegration (ungenutzt)
13. missionEngine.js (deprecated, lebt trotzdem)
14. missionKernel.js (drittes Statusmodell)
15. LEGACY_TRANSITIONS im Ops-Center (viertes)
16. localStorage-Mock + 600-LOC-Seed im Prod-Bundle
17. DEV_USERS-Schnell-Login (tot durch Fallbacks)
18. rls-policies.sql (Konflikt-Duplikat)
19. Schema-Spiegelung in schema.sql + Migrationen (eine Wahrheit)
20. AdminExecution-Seite
21. AdminQuality-Seite (in Fall-Akte/Reports)
22. AdminSOPs als eigene Seite (in Playbooks)
23. AdminTemplates als eigene Seite (in Playbooks)
24. AdminActivityLog-Seite (Verlauf gehört in den Fall)
25. AdminAnalytics in heutiger Platzhalter-Form
26. CompanySLA-Seite
27. Separate CompanyDocuments-Seite (Dokumente leben im Fall)
28. Notifications-Glocke UND Messages-Icon als getrennte Inboxen
29. Candidate als von Talent-User getrennte Entität
30. „Greeter"-Begriff (→ Companion/Begleiter)
31. Drei Markennamen (ArrivalOS/NeuLand/Arrival Germany → einer)
32. Emoji in Aktions-Buttons
33. 10-px-Uppercase-Tracking-Labels
34. JS-Hover-Handler (onMouseEnter-Styling) projektweit
35. Such-Palette (⌘K) für Talent-Rolle
36. Sprach-Toggle nur für Talent (alle Rollen oder Browser-Locale)
37. Flugnummer/Telefon als Pflichtfelder im Wizard
38. 5-Tap-Statuskette für Greeter (2 reichen)
39. Hardcodierte Supabase-Fallback-Credentials
40. Offene notify-*-Endpoints (bis Secret-Prüfung)
41. IBAN/Steuer-ID aus der für alle lesbaren greeter_profiles-Sicht
42. Demo-Seeds (SEED_DEMO) aus der Produktions-DB
43. Calm Canvas (2).zip + .docx aus dem Repo
44. netlify.toml ODER vercel.json (eine Deploy-Wahrheit)
45. „100+ Tests"-/„Completed Systems"-Behauptungen aus CLAUDE.md
46. docs/legacy-Phasenberichte aus dem Arbeitskontext (archivieren)
47. Polling-Intervalle (8 s/12 s) als Datenstrategie
48. select('*')-Vollabzüge ganzer Tabellen
49. Talent-Settings-Seite (fast leer — in Profil-Sheet)
50. WaitingForApproval-Sackgasse ohne Admin-Inbox-Gegenstück

## B. Top 50 — KOMPLETT NEU BAUEN

1. Domänenmodell: ArrivalCase als Kernobjekt
2. Timeline-Item-Modell (Task/Termin/Ereignis, Owner, Frist)
3. Einsatz = begleiteter Termin mit 4 Zuständen
4. Health-Ampel mit Pflicht-Grund + Owner + Frist
5. Playbook-System (Stadt × Visum × Beruf → Timeline-Instanz)
6. Ops-„Heute"-Inbox (Ausnahmen + Tagestermine)
7. Fall-Akte als EIN Ort (Timeline+Doku+Thread+Geld)
8. Employer-Dashboard als Personenliste mit Ampeln
9. Employer-Fall-Sicht (read-only Timeline + Eskalationsknopf)
10. Talent-Onboarding ab Woche −8 (Pre-Arrival-Track)
11. Talent-Screen als Ein-Seiten-Timeline (nächster Schritt groß)
12. Companion-Wochenkalender über alle Personen
13. Companion-Mini-CRM je Talent
14. Kommunikationsmodell: ein Thread pro Fall, echte Empfänger
15. WhatsApp-Business-Integration als Talent-Hauptkanal
16. Benachrichtigungs-Regelwerk (Ereignis × Rolle × Kanal)
17. Statuswechsel serverseitig (RPC + Prüfung statt Client-State-Machine)
18. RLS von Grund auf entlang des Fall-Modells
19. Abrechnung pro Fall: Auftrag → Leistungsnachweis → Rechnung-PDF
20. Auszahlung pro Einsatz: Gutschrift-PDF + SEPA-Export
21. Preis-Engine (Paket + Extras + Spesen) sichtbar ab Intake
22. Dokumenten-Checkliste mit Prüf-Workflow (fehlt/da/geprüft)
23. Termin-Management inkl. Bürgeramt-Slot-Jagd-Workflow
24. No-Show-/Ausfall-Protokoll mit Re-Disposition
25. Eskalations-Objekt (statt has_issue-Flag)
26. Companion-Onboarding-Pipeline (Vetting, Vertrag, Schulung)
27. Employer-Erststart-Wizard (erster Fall in 10 Minuten)
28. Talent-„Ankunfts-Ticket" (offline-fähig, Wallet/Screenshot)
29. Kohorten-/Retention-Report für Employer (PDF)
30. Monats-Report-Generator (automatisch per Mail)
31. Auth-Flows: Passwort-Reset, zweisprachig, Magic-Link-Ziel
32. Rollen-Routing ohne „Admin-Seiten für alle Rollen"-Recycling
33. i18n-Architektur produktweit (nicht nur Talent-Portal)
34. Such-/Filterzustand in URLs (teilbare Sichten)
35. Datenzugriff: scoped Queries + Realtime statt Polling
36. Mobile-Strategie: Companion-PWA mit echter Offline-Stufe (bewusst, schlank)
37. Flight-Tracking ereignisgesteuert am Ankunftstag (stündlich + Webhook)
38. Erinnerungs-Engine (Vorabend-Pings, Frist-Eskalation)
39. Anmeldeformular-Vorbefüllung aus Falldaten (PDF-Generator)
40. Partner-Auftrags-Flow Ende-zu-Ende (Anfrage→Consent→Bestätigung→Provision)
41. Admin-Nutzerfreigabe-Inbox (pending_approval)
42. Audit-Verlauf je Fall (serverseitig, fälschungssicher, im UI sichtbar)
43. Test-/CI-Fundament (Vitest, RLS-Tests, Typecheck im Build)
44. Staging-Umgebung mit eigenem Seed
45. Design-System als Komponenten (statt Inline-Style-Kopien)
46. Tabellen-Standard (Sortierung, Pagination, Sticky-Header)
47. Leere-Zustände mit nächster Aktion auf jeder Kernseite
48. Fehler-Zustände (Query-Fehler sichtbar, Retry)
49. Onboarding-Checklisten im Produkt je Rolle
50. Marken-/Wording-System (ein Name, ein Glossar: Fall, Begleiter, Termin)

## C. Top 50 — FEHLT KOMPLETT

1. Pre-Arrival-Phase (Visum-Status, Checklisten, Countdown)
2. Anerkennungs-Track für reglementierte Berufe (Pflege!)
3. Wohnungs-Modul (Suche/Besichtigung/Übergabe/Kaution)
4. Familiennachzug-Track
5. Sprachkurs-Vermittlung + Fortschritt
6. Tag-8-bis-90-Programm (Check-ins, Aufenthaltstitel)
7. Retention-Messung (90-Tage-Verbleib je Kohorte)
8. WhatsApp/SMS-Kanal
9. Mehrsprachigkeit über DE/EN hinaus (HI, AR, ES, FR, TL)
10. Übersetzung im Thread (KI-gestützt, DE↔Talent-Sprache)
11. Passwort-Reset
12. Employer-Team-Verwaltung (zweiter HR-Nutzer)
13. Preis-Transparenz vor Beauftragung
14. Rechnungs-PDF (§14 UStG) + Nummernkreis
15. Zahlungsabwicklung (SEPA-Einzug/Stripe)
16. Mahnwesen
17. Companion-Gutschriften (PDF, Steuer)
18. Companion-Vetting (Ausweis, Führungszeugnis-Option)
19. Versicherung für Einsätze (Haftpflicht)
20. Notfall-Prozess hinter dem SOS-Knopf (Rufkette, Reaktionszeit)
21. Bürgeramt-Termin-Radar je Stadt
22. ICS-Kalender-Feeds (Companion, Talent, HR)
23. Maps-Deeplinks + Routenplanung
24. Dokument-Vorlagen (Anmeldung, GEZ, Kontoeröffnung)
25. Wissens-Hub für Talente („So funktioniert Deutschland", mehrsprachig)
26. FAQ-/KI-Assistent für Standardfragen
27. Risiko-Score je Fall (Visum+Termine+Dokumente)
28. Übergabe-Zusammenfassungen (Companion-Wechsel, KI)
29. Kapazitätsplanung (Ankünfte vs. Companion-Verfügbarkeit je Stadt)
30. Companion-Recruiting-Funnel auf der Website
31. Companion-Academy (Schulung vor Freischaltung)
32. NPS/Zufriedenheit (Talent Tag 7/30/90, HR je Quartal)
33. Eskalations-SLA auf Fallebene (vertraglich, nicht Einsatz-Theater)
34. DSGVO-Selbstauskunft/-Löschung per Knopf
35. AVV-/Compliance-Paket für Enterprise-Einkauf
36. Audit-Export je Fall (für Kunden-Nachweis)
37. HRIS-Integration (Personio zuerst)
38. API/Webhooks für Kunden
39. SSO (SAML/OIDC) für Klinikkonzerne
40. White-Label-Talentsicht je Employer
41. Multi-Country-Datenmodell (AT/CH-Expansion)
42. Referral-/Partnerportal (Partner sieht eigene Aufträge)
43. Warteliste/Fallback wenn keine Companions in Stadt
44. Feiertags-/Öffnungszeiten-Logik je Bundesland (Termine!)
45. Slot-Doppelbuchungs-Schutz für Companions
46. Lohndaten-Übergabe-Checkliste an Arbeitgeber-Payroll
47. Krankenkassen-Anmelde-Workflow
48. Status-Page + Incident-Kommunikation
49. Sales-Demo-Modus (sauber getrennt von Prod)
50. Gründer-unabhängige Betriebs-Doku (Runbook je Prozess statt Agenten-Lyrik)

## D. Top 50 — GRÖSSTER BUSINESS-IMPACT (sortiert)

1. Fall-Modell statt Missionen (macht alles Folgende erst möglich)
2. Pre-Arrival-Phase (verdoppelt den abgedeckten Wert je Kunde)
3. WhatsApp-Kanal (Talent-Erreichbarkeit = Betriebsfähigkeit)
4. Retention-Report (das Verkaufsargument für Verlängerung + Preiserhöhung)
5. Rechnungs-PDF + Zahlung (ohne das: kein legales Inkasso)
6. Sicherheits-P0s (IBAN-Leak etc. — ein Vorfall killt die Firma)
7. Playbooks (das skalierende IP; Agentur → Software)
8. Ausnahmen-Inbox (Ops-Hebel: 3× mehr Fälle pro Operator)
9. Preis im Intake (verkürzt Sales, verhindert Rechnungsstreit)
10. Employer-Personenliste mit Ampeln (5-Minuten-Wow für den Zahler)
11. Anerkennungs-Track Pflege (öffnet den größten Vertikal-Markt)
12. Bürgeramt-Termin-Radar (löst DEN Engpass; PR-fähiges Feature)
13. Wohnungs-Service via Partner (höchster Add-on-Umsatz je Fall)
14. Companion-Wochenkalender (1 Companion : 20 Talente = Marge)
15. Erinnerungs-Engine (No-Shows kosten bar Geld)
16. Kohorten-Intake per CSV+Wizard (Kliniken kaufen in Kohorten)
17. Monats-Report-PDF automatisch (Sichtbarkeit beim Entscheider)
18. No-Show-/Backup-Protokoll (Servicegarantie glaubwürdig machen)
19. Companion-Vetting + Versicherung (Enterprise-Einkaufshürde)
20. Talent-NPS Tag 30 (Frühwarnung vor Kündigung = Kernversprechen)
21. KI-Briefing ausbauen zu Risiko-Score (vorhandene Function nutzen)
22. Krankenkassen+Konto-Workflows (Zeit bis „arbeitsfähig" verkürzen)
23. Partner-Provisions-Tracking Ende-zu-Ende (zweite Umsatzlinie)
24. Personio-Integration (Mittelstand-Vertriebsöffner)
25. Sales-Demo-Umgebung (heute: Demo-Daten in Prod = Deal-Risiko)
26. Zweisprachiger Erst-Kontakt (Aktivierungsquote der Talente)
27. Ankunfts-Ticket offline (der eine Moment, der nie scheitern darf)
28. SEPA-Auszahlungsdatei (Companion-Zufriedenheit = Angebotsqualität)
29. Mahnwesen (Cash-Flow)
30. Eskalations-SLA auf Fallebene im Vertrag (Premium-Pricing)
31. Companion-Recruiting-Funnel (Angebotsseite ist der Wachstums-Engpass)
32. Fall-Audit-Export (Compliance als Verkaufsargument an Kliniken)
33. Sprachkurs-Vermittlung (Add-on + Retention zugleich)
34. Familiennachzug-Service (höchste Zahlungsbereitschaft der Talente→Arbeitgeber)
35. Kapazitätsplanung (verhindert Überbuchung = Reputationsschutz)
36. White-Label-Talentsicht (Enterprise-Upsell)
37. API/Webhooks (Plattform-Lock-in)
38. SSO (Konzern-Pflicht)
39. Multi-Country-Vorbereitung (Exit-Story für Investoren)
40. Wissens-Hub mehrsprachig (Support-Entlastung, SEO)
41. KI-Thread-Übersetzung (Companion-Pool nicht mehr sprachlimitiert)
42. Übergabe-Zusammenfassungen (Companion-Ausfall ohne Qualitätsverlust)
43. Status-Page (Enterprise-Vertrauen)
44. Termin-Selbstbestätigung Talent (weniger Ops-Pingpong)
45. Dokument-Vorbefüllung (Behördengänge von 2 h auf 40 min)
46. Quality-Loop: Review → Playbook-Verbesserung (lernende Organisation)
47. Referral-Programm Arbeitgeber→Arbeitgeber (Kliniken vernetzt)
48. Talent-Alumni-Community (Retention + nächste Greeter-Generation!)
49. Saisonale Kapazitäts-Forecasts (Pflege-Examenstermine in Herkunftsländern)
50. Daten-Asset: anonymisierte Durchlaufzeiten je Amt/Stadt (einzigartiger Content/PR)

---

# PHASE 12 — ABSCHLUSS: DIE 1-MILLION-EURO-FRAGE

## Weiterentwickeln oder neu aufbauen?

**Antwort: Neu strukturieren — aber nicht neu schreiben.** Kein Full-Rewrite (der klassische Startup-Tod), sondern eine **Re-Fundierung des Produktmodells auf bestehendem Stack**:

- **Behalten (≈ 50–60 % verwertbar):** Stack (React/Vite/Supabase), Design-Tokens & Marke, Invite-System, Storage-Konzept, Edge-Function-Infrastruktur, `mission_services`/`partners`/Consent-Modell (passt 1:1 ins Fall-Modell), der Greeter-Mobile-Flow als UI-Vorlage, Talent-Dashboard als UI-Vorlage.
- **Ersetzen:** das Missions-Domänenmodell, die Admin-/Company-Informationsarchitektur, das Kommunikationsmodell, die Abrechnungslogik, die RLS-Schicht (entlang des neuen Modells), alle vier parallelen Status-Systeme.
- **Löschen:** Liste A (oben).

Begründung als Investor: Das Team hat bewiesen, dass es schnell und mit Geschmack bauen kann — aber auf einer geliehenen Metapher (Uber-Dispatch). Eine Million in „mehr Features auf Missions-Basis" vergrößert den Fehler. Eine Million in „Fall-Modell + Pflege-Vertikale + 3 Städte" kauft ein verteidigbares Produkt.

## Die neue Produktvision (ein Satz)

> **„Arrival Germany ist das Betriebssystem für die ersten 90 Tage einer internationalen Fachkraft — wir garantieren dem Arbeitgeber den arbeitsfähigen Tag X und dem Menschen eine Ankunft mit Würde; ein Begleiter vor Ort, eine Akte, ein Plan."**

Wedge-Markt: **Pflegekräfte** (reguliert, hohe Volumina, klare Playbooks, verzweifelte Arbeitgeber) in **3 Städten** (NRW-Cluster). Expansion erst nach Playbook-Beweis.

## Neue Informationsarchitektur

```
TALENT (mobil, Muttersprache, WhatsApp-first)
└── Meine Ankunft  (ein Screen: nächster Schritt · Timeline · mein Begleiter · Hilfe)

COMPANION (mobil)
├── Heute / Woche   (Termine über alle Personen, Routen)
└── Meine Personen  (Mini-CRM, Threads, Verdienst)

EMPLOYER (Desktop, 5 Min/Woche)
├── Meine Leute     (Ampel-Liste, „Neuer Zuzug", Kohorten-Import)
├── Fall-Sicht      (read-only Timeline + Eskalation + Dokumente)
└── Abrechnung      (Rechnungen, Monats-Report)

OPERATOR (Desktop, ganztags)
├── Heute           (Ausnahmen-Inbox + Tagestermine)
├── Fälle           (alle Akten, Filter, Disposition)
├── Abrechnung      (Forderungen, Auszahlungen)
└── Verwaltung      (Companions, Kunden, Partner, Playbooks, Einstellungen)
```

## Neue User Journey (Kohorte Klinik, 5 Pflegekräfte)

1. **Verkauf → Intake:** HR lädt Liste hoch oder legt Personen einzeln an. Pro Person: Playbook „Pflege · Indien · Wuppertal" instanziiert 42 Timeline-Items, Preis erscheint sofort. Auftrag bestätigt → Rechnung (Anzahlung) automatisch.
2. **Woche −8 bis −1:** Talent bekommt WhatsApp-Willkommen in Muttersprache + Magic-Link. Dokumente-Checkliste läuft; Ops jagt Anmeldetermine; Companion wird zugeteilt und stellt sich mit Foto vor; Wohnung als ServiceOrder an Partner. HR sieht nur die Ampel.
3. **Ankunftstag:** Flug-Webhook → Companion-Ping. Ankunfts-Ticket offline beim Talent. Einsatz „Abholung" läuft (2 Taps: unterwegs/erledigt). Störung → Ausnahmen-Inbox → Anrufkette.
4. **Woche 1:** Begleitete Termine (Anmeldung, Konto, Krankenkasse) aus dem Plan; jedes Dokument landet geprüft in der Akte; Lohndaten-Checkliste geht an HR-Payroll.
5. **Tag 8–90:** Automatisierte Check-ins, Aufenthaltstitel-Track, Sprachkurs, Familiennachzug optional. Tag-30-NPS. Rote Antworten → Inbox.
6. **Abschluss:** Tag 90: Fall schließt, Schlussrechnung + Fall-Report-PDF an HR, Retention-Zähler aktualisiert, Companion-Gutschrift + SEPA-Lauf. HR-Quartalsreport zeigt: „5/5 arbeitsfähig ⌀ Tag 6, 5/5 an Bord nach 90 Tagen."

## Neue Kernobjekte & Workflows

Kernobjekte: siehe Phase 10 (ArrivalCase, Person, Employer, TimelineItem, Document, Thread, ServiceOrder, LedgerEntry + Playbooks/Inbox/Notifications als Dienste). Workflows: Intake → Playbook → Disposition → Begleitung → Prüfung → Abrechnung → Retention-Messung; quer dazu: Eskalation und Kommunikation. Statuswechsel ausschließlich serverseitig; die Ampel ist berechnet, nie von Hand gesetzt (Hand setzt nur den Grund).

## Migrationspfad (damit es keine Rewrite-Falle wird)

1. **Sprint 1–2:** Sicherheits-P0s (aus dem techn. Audit) + `arrival_cases`-Tabelle einführen; bestehende Missionen werden Kinder eines Falls (1 Fall je candidate). Read-Models zuerst.
2. **Sprint 3–5:** Operator-„Heute"-Inbox + Fall-Akte als neue Admin-Oberfläche neben den Alt-Seiten; Employer-Sicht auf Personenliste umstellen; Alt-Seiten abschalten, sobald Nutzung null.
3. **Sprint 6–8:** Timeline/Playbooks ersetzen journey_steps+templates; Einsatz-Objekt ersetzt Missionsstatus; Abrechnung auf Fall umziehen; WhatsApp-Kanal.
4. **Danach:** Pre-Arrival-Track, Pflege-Playbook, Retention-Report → Vertrieb.

**Schlusswort des Investors:** Die heutige Codebasis ist kein Totalschaden — sie ist ein gut gebautes Produkt für die falsche Frage („Wie dispatche ich Einsätze?"). Die richtige Frage lautet: „Wie führe ich einen Menschen sicher durch 90 deutsche Tage — und beweise es dem, der dafür zahlt?" Wer das Produkt um diese Frage herum neu ordnet, hat etwas, das Deel und Personio nicht einfach nachbauen können: Playbooks, Begleiter vor Ort und die Daten darüber, wie Ankommen in Deutschland wirklich funktioniert.
