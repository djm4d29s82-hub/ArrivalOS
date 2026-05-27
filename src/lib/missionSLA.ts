/**
 * Mission SLA Intelligence — ARRIVAL OS
 * Phase C — Central SLA logic, pure functions, no side effects
 *
 * Detects:
 * - At-Risk missions (< threshold until start, greeter not confirmed)
 * - SLA Breaches (past start time + not completed)
 * - Critical breaches (2h+ overdue)
 * - Stuck assignments (ASSIGNED but no acceptance within window)
 * - Idle greeters (available but no active mission)
 */

import { MissionStatus } from './missionStateMachine';

// ─── Thresholds ───────────────────────────────────────────────────────────────

export const SLA_THRESHOLDS = {
  AT_RISK_MINUTES: 30,           // <30min to start AND greeter not confirmed → at_risk
  ACCEPTANCE_WINDOW_MINUTES: 15, // ASSIGNED without ACCEPTED in 15min → at_risk
  ACCEPTANCE_BREACH_MINUTES: 60, // ASSIGNED without ACCEPTED in 60min → breached
  CRITICAL_OVERDUE_MINUTES: 120, // 2h+ past start time → critical
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SLALevel = 'ok' | 'at_risk' | 'breached' | 'critical';

export type SLAType =
  | 'start_imminent'   // starts soon, greeter not active
  | 'overdue'          // past mission.datetime
  | 'no_acceptance'    // stuck in ASSIGNED too long
  | null;

export interface SLAResult {
  level: SLALevel;
  type: SLAType;
  minutesUntil?: number;
  minutesOverdue?: number;
  minutesStuck?: number;
}

export interface SLADashboardStatus {
  atRiskCount: number;
  breachedCount: number;
  criticalCount: number;
  atRiskMissions: any[];
  breachedMissions: any[];
  idleGreeterCount: number;
  idleGreeters: any[];
  hasAlerts: boolean;
}

// ─── Internal sets ────────────────────────────────────────────────────────────

// Statuses where the greeter is physically active (mission is "alive")
const ACTIVE_GREETER_STATUSES = new Set<string>([
  MissionStatus.ACCEPTED,
  MissionStatus.ON_THE_WAY,
  MissionStatus.ARRIVED,
  MissionStatus.MET_TALENT,
  MissionStatus.IN_PROGRESS, // Phase E: explicit in_progress status
  'accepted', 'on_the_way', 'arrived', 'met_talent', 'in_progress',
]);

const TERMINAL_STATUSES = new Set<string>([
  MissionStatus.COMPLETED,
  MissionStatus.CANCELLED,
  'completed', 'cancelled',
]);

function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

function isGreeterActive(status: string): boolean {
  return ACTIVE_GREETER_STATUSES.has(status);
}

// ─── Core SLA function ────────────────────────────────────────────────────────

/**
 * Calculate SLA status for a single mission.
 * Pure function — reads mission data only, no side effects.
 *
 * Priority order (highest wins):
 * 1. Critical overdue (2h+ past start)
 * 2. Breached (past start, <2h)
 * 3. At Risk (starts soon, greeter unconfirmed)
 * 4. Stuck assignment (ASSIGNED too long)
 * 5. OK
 */
export function calculateMissionSLA(mission: any): SLAResult {
  if (isTerminal(mission.status)) {
    return { level: 'ok', type: null };
  }

  const now = Date.now();
  const statusAgeMs = now - new Date(
    mission.last_status_change || mission.created_at || now
  ).getTime();
  const statusAgeMin = statusAgeMs / 60_000;

  // ── Time-based checks (require mission.datetime) ──
  if (mission.datetime) {
    const missionTimeMs = new Date(mission.datetime).getTime();
    const diffMs = missionTimeMs - now;
    const diffMin = diffMs / 60_000;

    if (diffMin < 0) {
      // Past start time
      const minutesOverdue = Math.round(Math.abs(diffMin));
      const level: SLALevel = minutesOverdue >= SLA_THRESHOLDS.CRITICAL_OVERDUE_MINUTES
        ? 'critical'
        : 'breached';
      return { level, type: 'overdue', minutesOverdue };
    }

    if (diffMin <= SLA_THRESHOLDS.AT_RISK_MINUTES && !isGreeterActive(mission.status)) {
      return {
        level: 'at_risk',
        type: 'start_imminent',
        minutesUntil: Math.round(diffMin),
      };
    }
  }

  // ── Stuck assignment ──
  const isAssigned = mission.status === MissionStatus.ASSIGNED || mission.status === 'assigned';
  if (isAssigned) {
    if (statusAgeMin >= SLA_THRESHOLDS.ACCEPTANCE_BREACH_MINUTES) {
      return { level: 'breached', type: 'no_acceptance', minutesStuck: Math.round(statusAgeMin) };
    }
    if (statusAgeMin >= SLA_THRESHOLDS.ACCEPTANCE_WINDOW_MINUTES) {
      return { level: 'at_risk', type: 'no_acceptance', minutesStuck: Math.round(statusAgeMin) };
    }
  }

  return { level: 'ok', type: null };
}

// ─── Dashboard summary ────────────────────────────────────────────────────────

/**
 * Compute full SLA picture for the operations dashboard.
 * Call this in useMemo — depends on missions + greetersMap.
 */
export function getSLADashboardStatus(
  missions: Map<string, any>,
  greetersMap: Map<string, any>
): SLADashboardStatus {
  const activeMissions = Array.from(missions.values()).filter(m => !isTerminal(m.status));

  const atRiskMissions: any[] = [];
  const breachedMissions: any[] = [];
  let criticalCount = 0;

  for (const m of activeMissions) {
    const sla = calculateMissionSLA(m);
    const annotated = { ...m, _sla: sla };

    if (sla.level === 'critical') {
      criticalCount++;
      breachedMissions.push(annotated);
    } else if (sla.level === 'breached') {
      breachedMissions.push(annotated);
    } else if (sla.level === 'at_risk') {
      atRiskMissions.push(annotated);
    }
  }

  // Idle greeters = available status AND not assigned to any active mission
  const busyGreeterIds = new Set(
    activeMissions.map((m: any) => m.greeter_id).filter(Boolean)
  );
  const idleGreeters = Array.from(greetersMap.values()).filter(
    (g: any) => g.status === 'available' && !busyGreeterIds.has(g.id)
  );

  return {
    atRiskCount: atRiskMissions.length,
    breachedCount: breachedMissions.length,
    criticalCount,
    atRiskMissions,
    breachedMissions,
    idleGreeterCount: idleGreeters.length,
    idleGreeters,
    hasAlerts: atRiskMissions.length > 0 || breachedMissions.length > 0,
  };
}

// ─── Human-readable messages ──────────────────────────────────────────────────

/**
 * Short human-readable SLA message for display in cards and tooltips.
 */
export function getSLAMessage(sla: SLAResult): string {
  if (sla.level === 'ok') return '';

  switch (sla.type) {
    case 'start_imminent':
      return `Startet in ${sla.minutesUntil} Min`;
    case 'overdue': {
      const min = sla.minutesOverdue ?? 0;
      if (min >= 120) return `${Math.floor(min / 60)}h ${min % 60}m überfällig`;
      return `${min} Min überfällig`;
    }
    case 'no_acceptance':
      return `${sla.minutesStuck} Min ohne Bestätigung`;
    default:
      return 'SLA-Warnung';
  }
}

/**
 * Tailwind classes for SLA level coloring (border-left strip).
 */
export const SLA_BORDER_CLASSES: Record<SLALevel, string> = {
  ok: 'border-l-4 border-l-transparent',
  at_risk: 'border-l-4 border-l-amber-400',
  breached: 'border-l-4 border-l-red-500',
  critical: 'border-l-4 border-l-red-600',
};

/**
 * Tailwind classes for inline SLA badge background.
 */
export const SLA_BADGE_CLASSES: Record<SLALevel, string> = {
  ok: '',
  at_risk: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  breached: 'bg-red-500/15 text-red-700 dark:text-red-400',
  critical: 'bg-red-500/20 text-red-800 dark:text-red-300 font-semibold',
};
