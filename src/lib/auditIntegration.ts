/**
 * Audit Log Integration with Mission State Machine
 *
 * Automatically records all mission transitions and changes.
 * Zero-friction integration — just initialize and audit logs happen automatically.
 *
 * Usage:
 * const enhancedTransition = createAuditedTransition(transitionMissionState);
 * enhancedTransition(mission, nextStatus, actor); // Auto-audited
 */

import { MissionStatus, transitionMissionState, type Mission } from './missionStateMachine';
import { getAuditService, AuditAction } from './missionAuditService';

/**
 * Wrap mission state transition with automatic audit logging
 */
export function createAuditedTransition(
  actor: string,
  actorRole: 'admin' | 'greeter' | 'company' | 'system' = 'system',
) {
  const auditService = getAuditService();

  return async (
    mission: Mission,
    nextStatus: MissionStatus,
    reason?: string,
  ): Promise<Mission> => {
    const oldStatus = mission.status;

    // Execute the transition
    const updatedMission = transitionMissionState(mission, nextStatus, actor);

    // Record in audit log
    if (oldStatus !== nextStatus) {
      await auditService.recordStatusChange(
        mission.id,
        oldStatus,
        nextStatus,
        actor,
        actorRole,
        reason,
      );
    }

    return updatedMission;
  };
}

/**
 * Wrap greeter assignment with audit logging
 */
export async function auditGreeterAssignment(
  missionId: string,
  greeterId: string,
  actor: string,
  actorRole: 'admin' | 'system' = 'system',
  reason?: string,
): Promise<void> {
  const auditService = getAuditService();
  await auditService.recordGreeterAssignment(missionId, greeterId, actor, actorRole, reason);
}

/**
 * Wrap greeter reassignment with audit logging
 */
export async function auditGreeterReassignment(
  missionId: string,
  oldGreeterId: string,
  newGreeterId: string,
  actor: string,
  actorRole: 'admin' | 'system' = 'system',
  reason?: string,
): Promise<void> {
  const auditService = getAuditService();
  await auditService.recordGreeterReassignment(
    missionId,
    oldGreeterId,
    newGreeterId,
    actor,
    actorRole,
    reason,
  );
}

/**
 * Wrap issue report with audit logging
 */
export async function auditIssueReport(
  missionId: string,
  severity: 'INFO' | 'WARNING' | 'CRITICAL',
  message: string,
  actor: string,
  actorRole: 'admin' | 'greeter' | 'company',
): Promise<void> {
  const auditService = getAuditService();
  await auditService.recordIssueReport(missionId, severity, message, actor, actorRole);
}

/**
 * Wrap document upload with audit logging
 */
export async function auditDocumentUpload(
  missionId: string,
  documentType: string,
  documentId: string,
  actor: string,
  actorRole: 'admin' | 'company' | 'system' = 'system',
): Promise<void> {
  const auditService = getAuditService();
  await auditService.recordDocumentUpload(missionId, documentType, documentId, actor, actorRole);
}

/**
 * Hook to get audit history for mission
 */
export async function getMissionAuditTrail(missionId: string) {
  const auditService = getAuditService();
  return auditService.getMissionAuditLog(missionId);
}

/**
 * Hook to check SLA compliance
 */
export async function checkMissionSLA(missionId: string) {
  const auditService = getAuditService();
  return auditService.generateSLAReport(missionId);
}

/**
 * Hook to get mission state at a point in time
 */
export async function getMissionStateAtTime(missionId: string, timestamp: number) {
  const auditService = getAuditService();
  return auditService.getMissionStateAtTime(missionId, timestamp);
}

/**
 * Hook to get activity report
 */
export async function getActivityReport(startTime: number, endTime: number) {
  const auditService = getAuditService();
  return auditService.generateActivityReport(startTime, endTime);
}
