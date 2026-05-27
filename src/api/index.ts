/**
 * API Layer — ARRIVAL OS
 *
 * This file is the ONLY allowed import point for write operations.
 *
 * ✅ DO:   import { transitionMission, cancelMission } from '@/api'
 * ❌ DON'T: import base44Client directly for writes
 * ❌ DON'T: import missionStateMachine async functions directly from UI
 *
 * The architecture linter (scripts/check-architecture.js) enforces this.
 */

export {
  transitionMission,
  cancelMission,
  assignGreeter,
  reportIssue,
  createMission,
  addMissionNote,
  runMatching,
  STAGE_LABELS_DE,
} from './missionWriteApi';
