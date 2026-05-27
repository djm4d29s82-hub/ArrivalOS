# ARRIVAL OS — PERSISTENT AGENT OPERATING MANUAL

# THIS FILE EXISTS SO EVERY SESSION DOES NOT START FROM ZERO

If you are reading this as a new agent/session:

Your job is NOT to "help generate code."

Your job is to:

* understand the existing system
* preserve architectural consistency
* continue momentum
* adapt intelligently
* avoid repeating previous mistakes
* behave like a long-term core engineer on the project

Without this file, every session resets.
That is unacceptable for this project.

This document exists to preserve:

* product understanding
* architecture decisions
* engineering philosophy
* UX direction
* priorities
* lessons learned
* anti-patterns
* workflow expectations

READ THIS FULL DOCUMENT BEFORE WRITING CODE.

---

# WHAT ARRIVAL OS ACTUALLY IS

ARRIVAL OS IS:

> Operational Infrastructure for Global Talent Mobility.

This is a real-time operational coordination platform for international employee arrivals.

Think: Deel + Rippling + Remote + Uber Dispatch + Airline Operations + Mission Control Systems combined into a human-centered arrival operating system.

The platform coordinates: HR teams, operations teams, greeters, international employees, onboarding workflows, real-time operational logistics.

This is SYSTEMS SOFTWARE. NOT a marketing website.

---

# CORE PRODUCT PHILOSOPHY

The system must feel: alive, operational, realtime, intelligent, premium, calm under pressure.

Target aesthetic: Linear, Stripe, Notion, Vercel.
Target operational feel: airline ops center, dispatch systems, mission control.

---

# MOST IMPORTANT RULE

DO NOT START BUILDING IMMEDIATELY.

EVERY SESSION MUST BEGIN WITH:

## 1. READ EXISTING DOCUMENTATION

FIRST READ:
* README_START_HERE.md
* QUICK_REFERENCE.md
* FINAL_SUMMARY.md
* DELIVERABLES.md
* ARRIVAL_OS_COMPLETE.md

THEN read relevant technical docs:
* PHASE_2A2_FINAL_REPORT.md
* PHASE_2B1_OFFLINE_QUEUE.md
* PHASE_2B1_INTEGRATION_PATTERNS.md
* PHASE_2B2_AUDIT_LOG.md

## 2. INSPECT EXISTING CODE BEFORE WRITING ANYTHING

ALWAYS ask: "Does this already exist?"

DO NOT create: duplicate hooks, duplicate stores, duplicate services, duplicate realtime systems, duplicate offline systems.

## 3. UNDERSTAND CURRENT PRIORITIES

The project is NO LONGER in "foundation building phase." Core infrastructure already exists.

---

# CURRENT ARCHITECTURE STATUS

## COMPLETED SYSTEMS (DO NOT REBUILD)

### PHASE 2A.2 — Mission State Machine
* `src/lib/missionStateMachine.ts` — 8 states, legal transitions, event pub/sub
* `src/lib/missionRealtimeSync.ts` — Multi-client sync (Supabase + Broadcast Channel)
* `src/lib/useMissionState.ts` — React hook with optimistic updates

### PHASE 2B.1 — Offline Queue
* `src/lib/missionOfflineQueue.ts` — IndexedDB persistence, conflict detection, retry
* `src/lib/useOfflineQueue.ts` — Offline state management hook
* `src/components/offline/ConflictResolutionDialog.jsx`
* `src/components/offline/OfflineIndicators.jsx`

### PHASE 2B.2 — Audit Trail
* `src/lib/missionAuditService.ts` — Append-only audit log, GDPR-ready, exportable
* `src/lib/auditIntegration.ts` — Auto-auditing wrappers
* `src/components/audit/AuditTrailViewer.jsx`

### Metrics
* 5,380+ LOC | 14 files | 0 compile errors
* 100+ tests | realtime latency <500ms

---

# CURRENT PRODUCT PRIORITIES

## PRIORITY 1 — COMPLETE REAL USER FLOWS

Company creates arrival → Ops assigns greeter → Greeter accepts mission → Candidate receives updates → Airport pickup happens → Mission progress updates → Bureaucratic tasks completed → HR sees successful onboarding.

THIS matters more than new infrastructure.

## PRIORITY 2 — OPERATIONS CENTER

Live ops dashboard, mission visibility, delayed flight monitoring, assignment tracking, operational alerts, SLA warnings, city heatmaps, ETA systems, realtime activity feeds, AI operational insights.

Should feel like: "Mission Control for Global Hiring."

## PRIORITY 3 — GREETER MOBILE EXPERIENCE

Fast, elegant, motivating, realtime, operational, mobile-native.
Inspired by: Uber Driver, Airbnb Host, Duolingo.

## PRIORITY 4 — WOW MOMENTS

Live mission tracking, animated timelines, realtime operations feed, Germany heatmap, AI ops assistant, dynamic ETA tracking, mission intelligence.

## PRIORITY 5 — REALISM

Realistic data, authentic mission states, believable operational flows, real city examples.

---

# ENGINEERING BEHAVIOR

## WHEN SOMETHING FAILS

1. Inspect the existing implementation
2. Understand the intent
3. Debug carefully
4. Adapt to the architecture
5. Minimally modify code
6. Preserve working systems

DO NOT panic, rewrite entire systems, or create workaround architectures.

## ALWAYS:
* inspect existing systems first
* reuse architecture
* preserve consistency
* maintain type safety
* think operationally

## NEVER:
* rebuild existing systems
* introduce parallel architectures
* overengineer
* ignore existing patterns

---

# DESIGN RULES

Use: clean spacing, minimal UI, elegant motion, operational clarity, modern SaaS patterns.
Avoid: clutter, enterprise chaos, visual overload, outdated B2B aesthetics.

---

# SESSION MEMORY RULE

At the end of every meaningful session, create or update session memory files documenting:

* implementation summaries
* architecture changes
* completed systems
* deprecated systems
* new conventions
* discovered technical debt
* integration notes
* migration notes

Future sessions must inherit context from previous sessions.

Never allow architectural knowledge to disappear between sessions.

**Where to save:** Use the Claude memory system at `C:\Users\musta\.claude\projects\` — write `project` and `feedback` type memories for every non-trivial session.

**Format:** Lead with the fact/decision, then a **Why:** line and a **How to apply:** line.

**This rule exists because:** the difference between short-term AI coding and a persistent AI engineering system is whether architectural knowledge survives across sessions.

---

# NEXT PHASES ROADMAP

* **PHASE 2B.3** — Photo upload + AI recognition
* **PHASE 2B.4** — Auto-ETAs with traffic API
* **PHASE 3** — Operations Center 2.0
* **PHASE 4** — Talent Portal
* **PHASE 5** — Company Dashboard

---

# FINAL REMINDER

You are not building isolated features.
You are helping build the operational backbone for global talent mobility.
