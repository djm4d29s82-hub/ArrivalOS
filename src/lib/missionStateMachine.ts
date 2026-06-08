/**
 * Mission State Machine — ARRIVAL OS
 * Phase 2A.2 (original) + Phase E (async actions + new statuses)
 *
 * Existing sync exports are UNCHANGED — backward compatible.
 * Phase E adds: CREATED, IN_PROGRESS, ISSUE_OPEN statuses + async action functions.
 */

import { EventType, type EventTypeName } from './events/eventTypes';
import { createEvent, type StandardEvent } from './events/createEvent';

// ═════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═════════════════════════════════════════════════

export enum MissionStatus {
  // ── Original statuses (unchanged) ──
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  ON_THE_WAY = 'on_the_way',
  ARRIVED = 'arrived',
  MET_TALENT = 'met_talent',
  COMPLETED = 'completed',
  ISSUE_REPORTED = 'issue_reported',
  CANCELLED = 'cancelled',
  // ── Phase E: new pipeline statuses ──
  CREATED     = 'created',      // Mission created by company, awaiting greeter assignment
  IN_PROGRESS = 'in_progress',  // Greeter is actively working (flexible intermediate state)
  ISSUE_OPEN  = 'issue_open',   // Issue open, interruptible, not terminal
}

export enum IssueServerity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface MissionStateEvent {
  type: EventTypeName;
  missionId: string;
  oldStatus?: MissionStatus;
  newStatus?: MissionStatus;
  issueSeverity?: IssueServerity;
  issueMessage?: string;
  timestamp: string;
  actor: string; // greeter email, admin email, system
  optimistic?: boolean;
}

export interface MissionState {
  id: string;
  status: MissionStatus;
  greeter_stage?: MissionStatus;
  has_issue: boolean;
  issue_severity?: IssueServerity;
  issue_message?: string;
  last_status_change: string; // ISO timestamp
  last_updated_by: string; // actor email
  greeter_id?: string;
  candidate_id?: string;
  company_id?: string;
  datetime: string;
  location: string;
  city: string;
  title: string;
}

// ═════════════════════════════════════════════════
// STATE MACHINE CORE
// ═════════════════════════════════════════════════

/**
 * Valid State Transitions Matrix
 * key = current state, value = array of allowed next states
 */
const VALID_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  // ── Original transitions (unchanged) ──
  [MissionStatus.ASSIGNED]: [
    MissionStatus.ACCEPTED,
    MissionStatus.CANCELLED,
  ],
  [MissionStatus.ACCEPTED]: [
    MissionStatus.ON_THE_WAY,
    MissionStatus.CANCELLED,
  ],
  [MissionStatus.ON_THE_WAY]: [
    MissionStatus.ARRIVED,
    MissionStatus.IN_PROGRESS, // Phase E: flexible shortcut path
    MissionStatus.CANCELLED,
  ],
  [MissionStatus.ARRIVED]: [
    MissionStatus.MET_TALENT,
    MissionStatus.IN_PROGRESS, // Phase E: flexible shortcut path
    MissionStatus.CANCELLED,
  ],
  [MissionStatus.MET_TALENT]: [
    MissionStatus.COMPLETED,
    MissionStatus.CANCELLED,
  ],
  [MissionStatus.COMPLETED]: [],
  [MissionStatus.ISSUE_REPORTED]: [
    MissionStatus.ON_THE_WAY,
    MissionStatus.ARRIVED,
    MissionStatus.MET_TALENT,
    MissionStatus.CANCELLED,
  ],
  [MissionStatus.CANCELLED]: [],
  // ── Phase E: new statuses ──
  [MissionStatus.CREATED]: [
    MissionStatus.ASSIGNED,
    MissionStatus.CANCELLED,
  ],
  [MissionStatus.IN_PROGRESS]: [
    MissionStatus.COMPLETED,
    MissionStatus.ISSUE_OPEN,
    MissionStatus.CANCELLED,
  ],
  [MissionStatus.ISSUE_OPEN]: [
    MissionStatus.IN_PROGRESS,
    MissionStatus.ON_THE_WAY,
    MissionStatus.CANCELLED,
  ],
};

/**
 * Validates if a transition from currentStatus to nextStatus is allowed
 * @param currentStatus Current mission status
 * @param nextStatus Desired mission status
 * @returns true if transition is valid
 */
export function canTransition(currentStatus: MissionStatus, nextStatus: MissionStatus): boolean {
  if (!currentStatus || !nextStatus) return false;
  if (currentStatus === nextStatus) return false; // no self-transitions
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(nextStatus) ?? false;
}

/**
 * Gets all valid next states from current state
 * @param currentStatus Current mission status
 * @returns Array of allowed next states
 */
export function getValidNextStates(currentStatus: MissionStatus): MissionStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Validates issue reporting (can happen from any operational state)
 * @param currentStatus Current mission status
 * @returns true if issue can be reported
 */
export function canReportIssue(currentStatus: MissionStatus): boolean {
  const operationalStates = [
    MissionStatus.ASSIGNED,
    MissionStatus.ACCEPTED,
    MissionStatus.ON_THE_WAY,
    MissionStatus.ARRIVED,
    MissionStatus.MET_TALENT,
  ];
  return operationalStates.includes(currentStatus);
}

/**
 * Gets current stage label in German
 * @param status Mission status
 * @returns Localized label
 */
export function getStatusLabel(status: MissionStatus): string {
  const labels: Record<MissionStatus, string> = {
    [MissionStatus.ASSIGNED]: 'Zugewiesen',
    [MissionStatus.ACCEPTED]: 'Angenommen',
    [MissionStatus.ON_THE_WAY]: 'Unterwegs',
    [MissionStatus.ARRIVED]: 'Vor Ort',
    [MissionStatus.MET_TALENT]: 'Talent getroffen',
    [MissionStatus.COMPLETED]: 'Abgeschlossen',
    [MissionStatus.ISSUE_REPORTED]: 'Problem gemeldet',
    [MissionStatus.CANCELLED]: 'Storniert',
    // Phase E
    [MissionStatus.CREATED]:     'Neu',
    [MissionStatus.IN_PROGRESS]: 'In Bearbeitung',
    [MissionStatus.ISSUE_OPEN]:  'Problem offen',
  };
  return labels[status] || status;
}

/**
 * Gets timeline position (0-6) for progress visualization
 * @param status Mission status
 * @returns Timeline index
 */
export function getTimelineIndex(status: MissionStatus): number {
  const timeline = [
    MissionStatus.ASSIGNED,
    MissionStatus.ACCEPTED,
    MissionStatus.ON_THE_WAY,
    MissionStatus.ARRIVED,
    MissionStatus.MET_TALENT,
    MissionStatus.COMPLETED,
  ];
  return timeline.indexOf(status);
}

/**
 * Determines if mission is in terminal state (no more transitions possible)
 * @param status Mission status
 * @returns true if terminal
 */
export function isTerminalState(status: MissionStatus): boolean {
  return status === MissionStatus.COMPLETED || status === MissionStatus.CANCELLED;
}

/**
 * Determines if mission is in operational state (changes still possible)
 * @param status Mission status
 * @returns true if operational
 */
export function isOperationalState(status: MissionStatus): boolean {
  return !isTerminalState(status);
}

// ═════════════════════════════════════════════════
// EVENT SYSTEM
// ═════════════════════════════════════════════════

type MissionStateEventListener = (event: MissionStateEvent) => void;

class MissionEventEmitter {
  private listeners: Map<string, Set<MissionStateEventListener>> = new Map();
  private eventHistory: MissionStateEvent[] = [];
  private maxHistorySize = 1000;

  /**
   * Subscribe to mission state events
   * @param eventType Event type to listen for
   * @param callback Listener callback
   * @returns Unsubscribe function
   */
  on(eventType: string, callback: MissionStateEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  /**
   * Emit a mission state event to all listeners
   * @param event Event to emit
   */
  emit(event: MissionStateEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(event);
        } catch (err) {
          console.error('Error in event listener:', err);
        }
      });
    }
  }

  /**
   * Get recent events (for debugging/auditing)
   * @param limit Max events to return
   * @returns Recent events
   */
  getHistory(limit: number = 50): MissionStateEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Clear all event listeners (useful for cleanup)
   */
  clear(): void {
    this.listeners.clear();
    this.eventHistory = [];
  }
}

export const missionEventEmitter = new MissionEventEmitter();

// ═════════════════════════════════════════════════
// STATE TRANSITION EXECUTOR
// ═════════════════════════════════════════════════

/**
 * Executes a state transition with full validation
 * @param currentMission Current mission state
 * @param nextStatus Desired next status
 * @param actor Who is making the change (email)
 * @returns Updated mission state or throws error
 */
export function transitionMissionState(
  currentMission: MissionState,
  nextStatus: MissionStatus,
  actor: string,
): MissionState {
  // Validation 1: Check if transition is allowed
  if (!canTransition(currentMission.status, nextStatus)) {
    throw new Error(
      `Invalid state transition: ${currentMission.status} → ${nextStatus}. ` +
      `Allowed transitions from ${currentMission.status}: ${getValidNextStates(currentMission.status).join(', ')}`
    );
  }

  // Validation 2: Check if mission is already terminal
  if (isTerminalState(currentMission.status)) {
    throw new Error(
      `Cannot transition from terminal state: ${currentMission.status}`
    );
  }

  // Create new state.
  // NOTE (P2.4): `status` is the canonical state-machine value; `greeter_stage` mirrors it here so the
  // talent live-tracker can read it. The tracker only reacts to the greeter-journey stage keys
  // (accepted/eta_sent/on_the_way/arrived/in_progress/wrap_up) and ignores any other value — so a manual
  // admin jump to e.g. `matched`/`completed` does NOT teleport the tracker through intermediate stages.
  const newMission: MissionState = {
    ...currentMission,
    status: nextStatus,
    greeter_stage: nextStatus,
    last_status_change: new Date().toISOString(),
    last_updated_by: actor,
  };

  // Emit event
  missionEventEmitter.emit({
    type: 'MISSION_STATUS_CHANGED',
    missionId: currentMission.id,
    oldStatus: currentMission.status,
    newStatus: nextStatus,
    timestamp: new Date().toISOString(),
    actor,
  });

  return newMission;
}

/**
 * Records an issue on the mission (can be called at any time from operational states)
 * @param currentMission Current mission state
 * @param severity Issue severity
 * @param message Issue message
 * @param actor Who reported (email)
 * @returns Updated mission state or throws error
 */
export function reportMissionIssue(
  currentMission: MissionState,
  severity: IssueServerity,
  message: string,
  actor: string,
): MissionState {
  if (!canReportIssue(currentMission.status)) {
    throw new Error(
      `Cannot report issue from state: ${currentMission.status}. ` +
      `Issues can only be reported from operational states.`
    );
  }

  const newMission: MissionState = {
    ...currentMission,
    status: MissionStatus.ISSUE_REPORTED,
    has_issue: true,
    issue_severity: severity,
    issue_message: message,
    last_status_change: new Date().toISOString(),
    last_updated_by: actor,
  };

  missionEventEmitter.emit({
    type: 'MISSION_ISSUE_REPORTED',
    missionId: currentMission.id,
    oldStatus: currentMission.status,
    newStatus: MissionStatus.ISSUE_REPORTED,
    issueSeverity: severity,
    issueMessage: message,
    timestamp: new Date().toISOString(),
    actor,
  });

  return newMission;
}

/**
 * Optimistic update for instant UI feedback
 * (used when UI needs instant feedback before server confirmation)
 * @param currentMission Current mission state
 * @param nextStatus Desired next status
 * @param actor Who is making the change
 * @returns Optimistically updated mission state
 */
export function optimisticUpdateMissionState(
  currentMission: MissionState,
  nextStatus: MissionStatus,
  actor: string,
): MissionState {
  if (!canTransition(currentMission.status, nextStatus)) {
    throw new Error(
      `Invalid state transition: ${currentMission.status} → ${nextStatus}`
    );
  }

  const optimisticMission: MissionState = {
    ...currentMission,
    status: nextStatus,
    greeter_stage: nextStatus,
    last_status_change: new Date().toISOString(),
    last_updated_by: actor,
  };

  missionEventEmitter.emit({
    type: 'MISSION_OPTIMISTIC_UPDATE',
    missionId: currentMission.id,
    oldStatus: currentMission.status,
    newStatus: nextStatus,
    timestamp: new Date().toISOString(),
    actor,
    optimistic: true,
  });

  return optimisticMission;
}

// ═════════════════════════════════════════════════
// STATE VALIDATION & INSPECTION
// ═════════════════════════════════════════════════

/**
 * Validates a complete mission state for consistency
 * @param mission Mission to validate
 * @returns Validation result
 */
export function validateMissionState(mission: MissionState): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!mission.id) errors.push('Mission ID is required');
  if (!Object.values(MissionStatus).includes(mission.status)) {
    errors.push(`Invalid status: ${mission.status}`);
  }
  if (mission.has_issue && !mission.issue_severity) {
    errors.push('Issue reported but no severity set');
  }
  if (mission.has_issue && mission.status !== MissionStatus.ISSUE_REPORTED) {
    errors.push('Issue flag set but status is not ISSUE_REPORTED');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gets a detailed state report for debugging/monitoring
 * @param mission Mission to inspect
 * @returns State report
 */
export function getMissionStateReport(mission: MissionState): object {
  return {
    id: mission.id,
    status: mission.status,
    statusLabel: getStatusLabel(mission.status),
    timelineIndex: getTimelineIndex(mission.status),
    isTerminal: isTerminalState(mission.status),
    isOperational: isOperationalState(mission.status),
    nextValidStates: getValidNextStates(mission.status),
    canReportIssue: canReportIssue(mission.status),
    hasIssue: mission.has_issue,
    issueSeverity: mission.issue_severity,
    issueMessage: mission.issue_message,
    lastStatusChange: mission.last_status_change,
    lastUpdatedBy: mission.last_updated_by,
    greeter: mission.greeter_id,
    candidate: mission.candidate_id,
    company: mission.company_id,
  };
}

// ═════════════════════════════════════════════════
// PHASE E — ASYNC ACTION FUNCTIONS
// ═════════════════════════════════════════════════
// Pattern: validate → persist (base44) → emit (missionEventEmitter) → return StandardEvent
// These do NOT replace the sync functions above — they are additional exports.

/**
 * Validates + persists + emits a status transition in one call.
 * Replaces the three-step pattern used in MissionDetailDrawer for new code.
 */
export async function transitionMissionStateAsync(opts: {
  mission: any;
  nextStatus: MissionStatus;
  actor: string;
  base44: any;
}): Promise<StandardEvent> {
  const { mission, nextStatus, actor, base44 } = opts;
  if (!canTransition(mission.status, nextStatus)) {
    throw new Error(
      `Invalid transition: ${mission.status} → ${nextStatus}. ` +
      `Allowed: ${getValidNextStates(mission.status).join(', ')}`
    );
  }
  const event = createEvent({
    type: EventType.MISSION_STATUS_CHANGED,
    missionId: mission.id,
    actor,
    oldStatus: mission.status,
    newStatus: nextStatus,
  });
  await base44.entities.Mission.update(mission.id, {
    status: nextStatus,
    last_status_change: event.timestamp,
    last_updated_by: actor,
  });
  missionEventEmitter.emit(event as any);
  return event;
}

/**
 * Assigns a greeter to a mission and transitions it to ASSIGNED.
 */
export async function assignGreeterAsync(opts: {
  mission: any;
  greeterId: string;
  actor: string;
  base44: any;
}): Promise<StandardEvent> {
  const { mission, greeterId, actor, base44 } = opts;
  const event = createEvent({
    type: EventType.MISSION_ASSIGNED,
    missionId: mission.id,
    actor,
    oldStatus: mission.status,
    newStatus: MissionStatus.ASSIGNED,
    payload: { greeterId },
  });
  await base44.entities.Mission.update(mission.id, {
    greeter_id: greeterId,
    status: MissionStatus.ASSIGNED,
    last_status_change: event.timestamp,
    last_updated_by: actor,
  });
  missionEventEmitter.emit(event as any);
  return event;
}

/**
 * Reports an issue on a mission and transitions it to ISSUE_OPEN.
 */
export async function reportMissionIssueAsync(opts: {
  mission: any;
  severity: IssueServerity;
  message: string;
  actor: string;
  base44: any;
}): Promise<StandardEvent> {
  const { mission, severity, message, actor, base44 } = opts;
  const event = createEvent({
    type: EventType.MISSION_ISSUE_REPORTED,
    missionId: mission.id,
    actor,
    oldStatus: mission.status,
    newStatus: MissionStatus.ISSUE_OPEN,
    payload: { severity, message },
  });
  await base44.entities.Mission.update(mission.id, {
    status: MissionStatus.ISSUE_OPEN,
    has_issue: true,
    issue_severity: severity,
    issue_message: message,
    last_status_change: event.timestamp,
    last_updated_by: actor,
  });
  missionEventEmitter.emit(event as any);
  return event;
}

/**
 * Creates a new mission from an arrival request and emits MISSION_CREATED.
 * This is the entry point of the full pipeline.
 */
export async function createMissionFromArrival(opts: {
  companyId: string;
  candidateId?: string;
  arrivalId?: string;
  datetime: string;
  location: string;
  city: string;
  title: string;
  pay?: number;
  flightNumber?: string;
  actor?: string;
  base44: any;
}): Promise<{ mission: any; event: StandardEvent }> {
  const { companyId, candidateId, arrivalId, datetime, location, city, title, pay, flightNumber, actor = 'system', base44 } = opts;
  const mission = await base44.entities.Mission.create({
    company_id: companyId,
    candidate_id: candidateId ?? null,
    arrival_id: arrivalId ?? null,
    datetime,
    location,
    city,
    title,
    pay: pay ?? null,
    // Only set flight_number when provided — keeps the insert column-clean for
    // databases that have not yet run the missions.flight_number migration.
    ...(flightNumber ? { flight_number: flightNumber } : {}),
    status: MissionStatus.CREATED,
    created_at: new Date().toISOString(),
    last_updated_by: actor,
  });
  const event = createEvent({
    type: EventType.MISSION_CREATED,
    missionId: mission.id,
    actor,
    newStatus: MissionStatus.CREATED,
    payload: { city, datetime, location },
  });
  missionEventEmitter.emit(event as any);
  return { mission, event };
}

// ─── Re-export event primitives for consumers ────────────────────────────────
export { EventType, createEvent };
export type { EventTypeName, StandardEvent };

export default {
  MissionStatus,
  IssueServerity,
  canTransition,
  getValidNextStates,
  canReportIssue,
  getStatusLabel,
  getTimelineIndex,
  isTerminalState,
  isOperationalState,
  transitionMissionState,
  reportMissionIssue,
  optimisticUpdateMissionState,
  validateMissionState,
  getMissionStateReport,
  missionEventEmitter,
  // Phase E
  transitionMissionStateAsync,
  assignGreeterAsync,
  reportMissionIssueAsync,
  createMissionFromArrival,
};
