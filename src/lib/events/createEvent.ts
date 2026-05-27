/**
 * Event Factory — ARRIVAL OS
 * Creates typed, ID-stamped events for the mission pipeline.
 *
 * Rule: every action in the system goes through createEvent()
 * before being emitted, persisted, or fed to the UI.
 */

import type { EventTypeName } from './eventTypes';

export interface StandardEvent {
  id: string;
  type: EventTypeName;
  missionId: string;
  actor: string;
  timestamp: string;
  oldStatus: string | null;
  newStatus: string | null;
  [key: string]: unknown;
}

export function createEvent(opts: {
  type: EventTypeName;
  missionId: string;
  actor: string;
  oldStatus?: string;
  newStatus?: string;
  payload?: Record<string, unknown>;
}): StandardEvent {
  return {
    id: `${opts.missionId}-${opts.type}-${Date.now()}`,
    type: opts.type,
    missionId: opts.missionId,
    actor: opts.actor,
    timestamp: new Date().toISOString(),
    oldStatus: opts.oldStatus ?? null,
    newStatus: opts.newStatus ?? null,
    ...(opts.payload ?? {}),
  };
}
