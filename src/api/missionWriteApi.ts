/**
 * Mission Write API — ARRIVAL OS
 *
 * THE ONLY ALLOWED ENTRYPOINT FOR MISSION MUTATIONS.
 *
 * Every write goes through three layers in order:
 *   1. permissions.assert()  — policy gate (throws on denied)
 *   2. missionStateMachine   — business logic + state integrity
 *   3. base44 / Supabase     — persistence (enforced by RLS)
 *
 * Do NOT import base44 or missionStateMachine directly from UI components.
 * Import from this file instead. The architecture linter (scripts/check-architecture.js)
 * will flag any violations.
 */

import {
  MissionStatus,
  IssueServerity,
  transitionMissionStateAsync,
  assignGreeterAsync,
  reportMissionIssueAsync,
  createMissionFromArrival as _createMissionFromArrival,
} from '@/lib/missionStateMachine';
import { runMatchingEngine, STAGE_LABELS_DE as _STAGE_LABELS_DE } from '@/lib/missionEngine';

export const STAGE_LABELS_DE = _STAGE_LABELS_DE;
import { assert, type Role } from '@/lib/permissions';
import type { StandardEvent } from '@/lib/events/createEvent';

const DEFAULT_JOURNEY_STEPS = [
  { title: 'Arrival Check',         description: 'Bestätigung der Ankunft',    order: 1 },
  { title: 'Meet Client',           description: 'Persönliches Treffen',        order: 2 },
  { title: 'Unterkunft & Check-in', description: 'Transfer und Einchecken',     order: 3 },
  { title: 'SIM & Connectivity',    description: 'SIM-Karte einrichten',        order: 4 },
  { title: 'Behördengang',          description: 'Anmeldung und Bürgeramt',     order: 5 },
  { title: 'Bankkonto',             description: 'Kontoeröffnung',              order: 6 },
  { title: 'Mid Check',             description: 'Zwischenstand besprechen',    order: 7 },
  { title: 'Feedback & Sign-off',   description: 'Abschlussgespräch',           order: 8 },
];

export type { MissionStatus, IssueServerity };

// ---------------------------------------------------------------------------
// Transition a mission status through the state machine.
// Requires: mission:update_status
// ---------------------------------------------------------------------------
export async function transitionMission(opts: {
  mission: any;
  nextStatus: MissionStatus;
  role: Role;
  actor: string;
  base44: any;
}): Promise<StandardEvent> {
  assert(opts.role, 'mission:update_status', `transition to ${opts.nextStatus}`);
  return transitionMissionStateAsync({
    mission: opts.mission,
    nextStatus: opts.nextStatus,
    actor: opts.actor,
    base44: opts.base44,
  });
}

// ---------------------------------------------------------------------------
// Cancel a mission.
// Requires: mission:cancel (admin) OR mission:cancel_own (company/greeter on their mission)
// ---------------------------------------------------------------------------
export async function cancelMission(opts: {
  mission: any;
  role: Role;
  actor: string;
  cancellationReason?: string;
  base44: any;
}): Promise<StandardEvent> {
  const permission =
    opts.role === 'admin' ? 'mission:cancel' : 'mission:cancel_own';
  assert(opts.role, permission, `cancel mission ${opts.mission.id}`);
  const event = await transitionMissionStateAsync({
    mission: opts.mission,
    nextStatus: MissionStatus.CANCELLED,
    actor: opts.actor,
    base44: opts.base44,
  });
  // cancellation_reason is metadata, not a status field — direct patch is intentional
  if (opts.cancellationReason) {
    await opts.base44.entities.Mission.update(opts.mission.id, {
      cancellation_reason: opts.cancellationReason,
    });
  }
  return event;
}

// ---------------------------------------------------------------------------
// Assign a greeter to a mission.
// Requires: mission:assign_greeter
// ---------------------------------------------------------------------------
export async function assignGreeter(opts: {
  mission: any;
  greeterId: string;
  role: Role;
  actor: string;
  base44: any;
}): Promise<StandardEvent> {
  assert(opts.role, 'mission:assign_greeter', `assign greeter ${opts.greeterId}`);
  const event = await assignGreeterAsync({
    mission: opts.mission,
    greeterId: opts.greeterId,
    actor: opts.actor,
    base44: opts.base44,
  });
  // Create default journey steps on first assignment
  const existing = await opts.base44.entities.JourneyStep.filter({ mission_id: opts.mission.id });
  if (existing.length === 0) {
    const steps = DEFAULT_JOURNEY_STEPS.map((s) => ({
      ...s, mission_id: opts.mission.id, status: 'pending', completed_at: null,
    }));
    await opts.base44.entities.JourneyStep.bulkCreate(steps);
  }
  return event;
}

// ---------------------------------------------------------------------------
// Report an issue on a mission.
// Requires: mission:report_issue
// ---------------------------------------------------------------------------
export async function reportIssue(opts: {
  mission: any;
  severity: IssueServerity;
  message: string;
  role: Role;
  actor: string;
  base44: any;
}): Promise<StandardEvent> {
  assert(opts.role, 'mission:report_issue', `report issue on mission ${opts.mission.id}`);
  return reportMissionIssueAsync({
    mission: opts.mission,
    severity: opts.severity,
    message: opts.message,
    actor: opts.actor,
    base44: opts.base44,
  });
}

// ---------------------------------------------------------------------------
// Append a note to the activity log for a mission.
// No permission gate — any actor with mission access can add notes.
// ---------------------------------------------------------------------------
export async function addMissionNote(opts: {
  missionId: string;
  body: string;
  actor: string;
  base44: any;
}): Promise<void> {
  if (!opts.body?.trim()) return;
  await opts.base44.entities.ActivityLog.create({
    entity_type: 'Mission',
    entity_id: opts.missionId,
    action: 'mission.note',
    old_value: '',
    new_value: opts.body.trim(),
    created_by: opts.actor || 'system',
    description: opts.body.trim(),
    timestamp: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Create a new mission from an arrival request.
// Requires: mission:create
// ---------------------------------------------------------------------------
export async function createMission(opts: {
  companyId: string;
  candidateId?: string;
  arrivalId?: string;
  datetime: string;
  location: string;
  city: string;
  title: string;
  pay?: number;
  role: Role;
  actor: string;
  base44: any;
}): Promise<{ mission: any; event: StandardEvent }> {
  assert(opts.role, 'mission:create', `create mission for company ${opts.companyId}`);
  return _createMissionFromArrival({
    companyId: opts.companyId,
    candidateId: opts.candidateId,
    arrivalId: opts.arrivalId,
    datetime: opts.datetime,
    location: opts.location,
    city: opts.city,
    title: opts.title,
    pay: opts.pay,
    actor: opts.actor,
    base44: opts.base44,
  });
}

// ---------------------------------------------------------------------------
// Run the greeter matching engine for a mission.
// Requires: mission:run_matching
// ---------------------------------------------------------------------------
export async function runMatching(opts: {
  mission: any;
  role: Role;
  actor: string;
}): Promise<string[]> {
  assert(opts.role, 'mission:run_matching', `run matching for mission ${opts.mission.id}`);
  return runMatchingEngine(opts.mission);
}
