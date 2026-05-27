/**
 * Event Standard — ARRIVAL OS
 * Single Source of Truth for all mission event types.
 */

export const EventType = {
  // Pipeline lifecycle
  MISSION_CREATED:           'MISSION_CREATED',
  MISSION_ASSIGNED:          'MISSION_ASSIGNED',
  MISSION_ACCEPTED:          'MISSION_ACCEPTED',
  MISSION_ON_THE_WAY:        'MISSION_ON_THE_WAY',
  MISSION_IN_PROGRESS:       'MISSION_IN_PROGRESS',
  MISSION_COMPLETED:         'MISSION_COMPLETED',
  MISSION_CANCELLED:         'MISSION_CANCELLED',
  // Issue flow
  MISSION_ISSUE_REPORTED:    'MISSION_ISSUE_REPORTED',
  // Generic / backward-compat
  MISSION_STATUS_CHANGED:    'MISSION_STATUS_CHANGED',
  MISSION_OPTIMISTIC_UPDATE: 'MISSION_OPTIMISTIC_UPDATE',
} as const;

export type EventTypeName = typeof EventType[keyof typeof EventType];
