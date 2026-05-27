import { MissionStatus, getTimelineIndex } from './missionStateMachine';
import { JOURNEY_STEPS, journeyProgress } from './journeySteps';

/**
 * Pure mapping helpers for the MissionKernel — "1 statement · 1 action".
 * No JSX, no side effects. Each portal supplies the wiring (onClick) itself.
 */

const GREETER_TIMELINE_TOTAL = 6; // ASSIGNED→ACCEPTED→ON_THE_WAY→ARRIVED→MET_TALENT→COMPLETED

/**
 * Greeter view: maps mission status → one human statement + the single next action.
 * Mirrors the PrimaryActionBar transition logic so the kernel and the action bar agree.
 */
export function greeterKernel(mission, candidateName) {
  const name = candidateName || 'das Talent';
  switch (mission?.status) {
    case MissionStatus.ASSIGNED:
      return { statement: `Neuer Einsatz: ${name} braucht dich.`, actionLabel: 'Annehmen', nextStatus: MissionStatus.ACCEPTED };
    case MissionStatus.ACCEPTED:
      return { statement: `${name} wartet. Sende deine Ankunftszeit.`, actionLabel: 'ETA senden', nextStatus: MissionStatus.ON_THE_WAY };
    case MissionStatus.ON_THE_WAY:
      return { statement: `Du bist unterwegs zu ${name}.`, actionLabel: 'Vor Ort — Check-in', nextStatus: MissionStatus.ARRIVED };
    case MissionStatus.ARRIVED:
    case MissionStatus.MET_TALENT:
      return { statement: `Du bist bei ${name}.`, actionLabel: 'Abschließen', nextStatus: MissionStatus.COMPLETED };
    case MissionStatus.COMPLETED:
      return { statement: 'Einsatz abgeschlossen.', actionLabel: null, nextStatus: null };
    case MissionStatus.CANCELLED:
      return { statement: 'Einsatz storniert.', actionLabel: null, nextStatus: null };
    default:
      return { statement: mission?.title || 'Einsatz', actionLabel: null, nextStatus: null };
  }
}

/** Greeter progress as {index, total} for the kernel's calm progress line. */
export function greeterProgress(mission) {
  const idx = getTimelineIndex(mission?.greeter_stage || mission?.status);
  return { index: idx >= 0 ? idx : 0, total: GREETER_TIMELINE_TOTAL };
}

/**
 * Builds up to 2 real blockers for a greeter mission (hard cap enforced by the component).
 * Only surfaces a blocker when it is genuinely true — no permanent red zone.
 */
export function greeterBlockers(mission, docs = []) {
  const out = [];
  if (mission?.has_issue) out.push({ label: 'Problem gemeldet', tone: 'red' });
  const unverified = docs.filter((d) => d && d.verified === false).length;
  if (unverified > 0) out.push({ label: `${unverified} Dokument${unverified > 1 ? 'e' : ''} ungeprüft`, tone: 'amber' });
  return out.slice(0, 2);
}

const STAGE_STATEMENTS = {
  accepted: 'Dein Greeter ist bestätigt.',
  eta_sent: 'Dein Greeter hat die Ankunftszeit geschickt.',
  on_the_way: 'Dein Greeter ist unterwegs zu dir.',
  arrived: 'Dein Greeter ist am Treffpunkt.',
  in_progress: 'Ihr seid gemeinsam unterwegs.',
  wrap_up: 'Fast geschafft — die letzten Schritte.',
};

/**
 * Talent view: "where am I / what's next" in one sentence.
 * Live greeter stage wins (it's the most time-sensitive), else the current journey step.
 */
export function talentKernel({ mission, steps = [] }) {
  const stage = mission?.greeter_stage;
  if (stage && STAGE_STATEMENTS[stage]) {
    return { statement: STAGE_STATEMENTS[stage], actionLabel: 'Live verfolgen', tone: 'live' };
  }
  let idx = steps.findIndex((s) => s.status === 'in_progress');
  if (idx < 0) idx = steps.findIndex((s) => s.status !== 'completed');
  if (idx < 0) return { statement: 'Du bist angekommen.', sub: 'Was als große Reise begann, ist jetzt dein Alltag.', actionLabel: null, tone: 'done' };
  const cfg = JOURNEY_STEPS[idx] || JOURNEY_STEPS[0];
  return { statement: `Als Nächstes: ${steps[idx]?.title || cfg.title}`, sub: cfg.emotional, actionLabel: 'Schritt ansehen', tone: 'next' };
}

// ── Shared progress source of truth ───────────────────────────────────────────
// Coarse status buckets used ONLY when granular JourneyStep data is unavailable.
const STATUS_PROGRESS = {
  created: 5, open: 10, matched: 25, assigned: 45, accepted: 55,
  on_the_way: 70, arrived: 82, met_talent: 90, in_progress: 88,
  completed: 100, cancelled: 0, issue_open: 60,
};

/**
 * The single progress function every surface (Company, Admin, Talent) should call.
 * With JourneyStep data → granular truth; otherwise → consistent coarse fallback.
 */
export function missionProgress(mission, steps) {
  if (steps && steps.length) {
    const jp = journeyProgress(steps);
    return { pct: Math.round((jp.completed / jp.total) * 100), index: jp.currentIndex, total: jp.total };
  }
  return { pct: STATUS_PROGRESS[mission?.status] ?? 0, index: null, total: null };
}

/**
 * Urgency tier — keeps the UI calm by default but lets critical states surface.
 * critical: needs attention now · active: in flight · normal: nothing pressing.
 */
export function missionPriority(mission) {
  if (mission?.has_issue || mission?.status === MissionStatus.ISSUE_OPEN || mission?.status === MissionStatus.ISSUE_REPORTED) return 'critical';
  if ([MissionStatus.COMPLETED, MissionStatus.CANCELLED].includes(mission?.status)) return 'normal';
  const dt = mission?.datetime ? new Date(mission.datetime) : null;
  const hoursTo = dt ? (dt - Date.now()) / 36e5 : null;
  const unstaffed = !mission?.greeter_id || ['created', 'open', 'matched', 'assigned'].includes(mission?.status);
  if (hoursTo != null && hoursTo >= 0 && hoursTo < 24 && unstaffed) return 'critical';
  if (['accepted', 'on_the_way', 'arrived', 'met_talent', 'in_progress'].includes(mission?.status)) return 'active';
  return 'normal';
}

const COMPANY_STATEMENTS = (gname, cand) => ({
  created:     'Geplant — Greeter wird zugewiesen.',
  open:        'Matching läuft — passende Greeter werden gesucht.',
  matched:     'Matching läuft — passende Greeter werden gesucht.',
  assigned:    gname ? `${gname} ist zugewiesen, wartet auf Bestätigung.` : 'Greeter zugewiesen, wartet auf Bestätigung.',
  accepted:    gname ? `${gname} hat den Einsatz angenommen.` : 'Greeter hat angenommen.',
  on_the_way:  gname ? `${gname} ist unterwegs zu ${cand}.` : `Unterwegs zu ${cand}.`,
  arrived:     gname ? `${gname} ist am Treffpunkt.` : 'Greeter ist am Treffpunkt.',
  met_talent:  `Ankunft läuft mit ${cand}.`,
  in_progress: `Ankunft läuft mit ${cand}.`,
  completed:   `${cand} ist erfolgreich angekommen.`,
  cancelled:   'Mission storniert.',
  issue_open:  'Problem offen — Operations prüft.',
});

/**
 * Company view: STATE (statement) · NEXT (next step) · BLOCKERS · priority.
 * Everything needed for "3-second understanding" of a mission.
 */
export function companyKernel(mission, { greeter, candidate, steps = [] } = {}) {
  const cand = candidate?.full_name?.split(' ')[0] || 'das Talent';
  const gname = greeter?.full_name?.split(' ')[0];

  // A real blocker makes the REASON the headline — "warum", not just "rot".
  const blocked = mission?.has_issue && mission?.issue_message;
  const statement = blocked
    ? mission.issue_message
    : (COMPANY_STATEMENTS(gname, cand)[mission?.status] || mission?.title || 'Mission');

  const nextStep = steps.find((s) => s.status === 'in_progress') || steps.find((s) => s.status !== 'completed');
  const next = (mission?.status === MissionStatus.COMPLETED || mission?.status === MissionStatus.CANCELLED) ? null : (nextStep?.title || null);

  const blockers = [];
  if (mission?.has_issue && !blocked) blockers.push({ label: 'Problem gemeldet', tone: 'red' });
  if (!mission?.greeter_id && ['created', 'open', 'matched'].includes(mission?.status)) blockers.push({ label: 'Kein Greeter', tone: 'amber' });

  return { statement, next, blockers: blockers.slice(0, 2), priority: missionPriority(mission) };
}
