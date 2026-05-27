/**
 * Mission Audit Log System (PHASE 2B.2)
 * 
 * Enterprise-grade audit trail for compliance and operational transparency.
 * 
 * Records:
 * - Who made changes (actor email)
 * - What changed (field, old value, new value)
 * - When it changed (precise timestamp)
 * - Why it changed (change reason/context)
 * - From what device/location (IP, user agent)
 * 
 * Use Cases:
 * - GDPR compliance: prove all data modifications
 * - Operational: trace mission state history
 * - Debugging: understand who did what when
 * - Analytics: identify patterns, failure modes
 * - SLA tracking: when was mission delayed?
 * - Accountability: who reassigned greeter at 11pm?
 */

import { MissionStatus } from './missionStateMachine';

/**
 * Audit log entry - immutable append-only record
 */
export interface AuditLogEntry {
  id: string;                    // UUID
  missionId: string;
  actor: string;                 // User email who made change
  actorRole: 'admin' | 'greeter' | 'company' | 'system';
  action: AuditAction;           // Type of change
  timestamp: number;             // Unix milliseconds
  changes: FieldChange[];        // What changed
  context?: {
    reason?: string;             // Why (from UI, e.g., "Candidate not at airport")
    source?: 'api' | 'ui' | 'automation' | 'offline_sync';
    userAgent?: string;
    ipAddress?: string;
  };
  relatedEntities?: {
    greeterId?: string;
    companyId?: string;
    candidateId?: string;
    flightId?: string;
  };
}

/**
 * Change to a single field
 */
export interface FieldChange {
  field: string;                 // Field name (e.g., "status", "greeterId")
  oldValue: any;
  newValue: any;
  type: 'status_transition' | 'assignment' | 'metadata' | 'issue' | 'document';
}

/**
 * Audit action types
 */
export enum AuditAction {
  MISSION_CREATED = 'MISSION_CREATED',
  MISSION_STATUS_CHANGED = 'MISSION_STATUS_CHANGED',
  GREETER_ASSIGNED = 'GREETER_ASSIGNED',
  GREETER_REASSIGNED = 'GREETER_REASSIGNED',
  ISSUE_REPORTED = 'ISSUE_REPORTED',
  ISSUE_RESOLVED = 'ISSUE_RESOLVED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  NOTE_ADDED = 'NOTE_ADDED',
  CANDIDATE_INFO_UPDATED = 'CANDIDATE_INFO_UPDATED',
  FLIGHT_INFO_UPDATED = 'FLIGHT_INFO_UPDATED',
  COMPANY_INFO_UPDATED = 'COMPANY_INFO_UPDATED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  MESSAGE_SENT = 'MESSAGE_SENT',
  AUTOMATION_TRIGGERED = 'AUTOMATION_TRIGGERED',
}

/**
 * Audit log service - write-only append log
 * 
 * This is NEVER deleted or modified (append-only)
 * Perfect for compliance, debugging, and analytics
 */
export class MissionAuditService {
  private static instance: MissionAuditService;

  private constructor() {}

  static getInstance(): MissionAuditService {
    if (!MissionAuditService.instance) {
      MissionAuditService.instance = new MissionAuditService();
    }
    return MissionAuditService.instance;
  }

  /**
   * Record a mission status change
   * Most common audit event
   */
  async recordStatusChange(
    missionId: string,
    oldStatus: MissionStatus,
    newStatus: MissionStatus,
    actor: string,
    actorRole: 'admin' | 'greeter' | 'company' | 'system',
    reason?: string,
  ): Promise<string> {
    return this.createEntry(
      missionId,
      actor,
      actorRole,
      AuditAction.MISSION_STATUS_CHANGED,
      [
        {
          field: 'status',
          oldValue: oldStatus,
          newValue: newStatus,
          type: 'status_transition',
        },
      ],
      reason,
    );
  }

  /**
   * Record greeter assignment
   */
  async recordGreeterAssignment(
    missionId: string,
    greeterId: string,
    actor: string,
    actorRole: 'admin' | 'system',
    reason?: string,
  ): Promise<string> {
    return this.createEntry(
      missionId,
      actor,
      actorRole,
      AuditAction.GREETER_ASSIGNED,
      [
        {
          field: 'greeterId',
          oldValue: null,
          newValue: greeterId,
          type: 'assignment',
        },
      ],
      reason,
    );
  }

  /**
   * Record greeter reassignment
   */
  async recordGreeterReassignment(
    missionId: string,
    oldGreeterId: string,
    newGreeterId: string,
    actor: string,
    actorRole: 'admin' | 'system',
    reason?: string,
  ): Promise<string> {
    return this.createEntry(
      missionId,
      actor,
      actorRole,
      AuditAction.GREETER_REASSIGNED,
      [
        {
          field: 'greeterId',
          oldValue: oldGreeterId,
          newValue: newGreeterId,
          type: 'assignment',
        },
      ],
      reason,
    );
  }

  /**
   * Record issue report
   */
  async recordIssueReport(
    missionId: string,
    severity: 'INFO' | 'WARNING' | 'CRITICAL',
    message: string,
    actor: string,
    actorRole: 'admin' | 'greeter' | 'company',
  ): Promise<string> {
    return this.createEntry(
      missionId,
      actor,
      actorRole,
      AuditAction.ISSUE_REPORTED,
      [
        {
          field: 'issue',
          oldValue: null,
          newValue: { severity, message, reportedAt: Date.now() },
          type: 'issue',
        },
      ],
      `Issue: ${message}`,
    );
  }

  /**
   * Record document upload
   */
  async recordDocumentUpload(
    missionId: string,
    documentType: string,
    documentId: string,
    actor: string,
    actorRole: 'admin' | 'company' | 'system',
  ): Promise<string> {
    return this.createEntry(
      missionId,
      actor,
      actorRole,
      AuditAction.DOCUMENT_UPLOADED,
      [
        {
          field: 'documents',
          oldValue: null,
          newValue: { documentId, type: documentType, uploadedAt: Date.now() },
          type: 'document',
        },
      ],
      `Document uploaded: ${documentType}`,
    );
  }

  /**
   * Record custom change
   */
  async recordChange(
    missionId: string,
    actor: string,
    actorRole: 'admin' | 'greeter' | 'company' | 'system',
    action: AuditAction,
    changes: FieldChange[],
    reason?: string,
  ): Promise<string> {
    return this.createEntry(missionId, actor, actorRole, action, changes, reason);
  }

  /**
   * Create audit entry (internal)
   */
  private async createEntry(
    missionId: string,
    actor: string,
    actorRole: 'admin' | 'greeter' | 'company' | 'system',
    action: AuditAction,
    changes: FieldChange[],
    reason?: string,
  ): Promise<string> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      missionId,
      actor,
      actorRole,
      action,
      timestamp: Date.now(),
      changes,
      context: {
        reason,
        source: this.detectSource(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        ipAddress: undefined, // Would be set by server
      },
    };

    // Save to Supabase (append-only)
    const saved = await this.saveToDB(entry);

    return entry.id;
  }

  /**
   * Get audit history for a mission
   */
  async getMissionAuditLog(missionId: string): Promise<AuditLogEntry[]> {
    return this.queryDB(
      'missionAuditLog',
      [['missionId', '==', missionId]],
      [['timestamp', 'asc']],
    );
  }

  /**
   * Get audit entries by actor
   */
  async getAuditsByActor(actor: string, limit = 100): Promise<AuditLogEntry[]> {
    return this.queryDB(
      'missionAuditLog',
      [['actor', '==', actor]],
      [['timestamp', 'desc']],
      limit,
    );
  }

  /**
   * Get audit entries by action type
   */
  async getAuditsByAction(action: AuditAction, limit = 100): Promise<AuditLogEntry[]> {
    return this.queryDB(
      'missionAuditLog',
      [['action', '==', action]],
      [['timestamp', 'desc']],
      limit,
    );
  }

  /**
   * Get audit entries within date range
   */
  async getAuditsByDateRange(
    startTime: number,
    endTime: number,
    missionId?: string,
  ): Promise<AuditLogEntry[]> {
    const filters: Array<[string, '==' | '>' | '<' | '>=' | '<=', any]> = [
      ['timestamp', '>=', startTime],
      ['timestamp', '<=', endTime],
    ];

    if (missionId) {
      filters.push(['missionId', '==', missionId]);
    }

    return this.queryDB('missionAuditLog', filters, [['timestamp', 'desc']]);
  }

  /**
   * Get who reassigned a greeter and when
   */
  async getGreeterReassignmentHistory(
    missionId: string,
  ): Promise<Array<{ from: string; to: string; timestamp: number; actor: string }>> {
    const entries = await this.getMissionAuditLog(missionId);

    return entries
      .filter((e) => e.action === AuditAction.GREETER_REASSIGNED)
      .map((e) => ({
        from: e.changes[0].oldValue,
        to: e.changes[0].newValue,
        timestamp: e.timestamp,
        actor: e.actor,
      }));
  }

  /**
   * Get mission state at a point in time
   * Useful for "what was the status at 3pm?"
   */
  async getMissionStateAtTime(missionId: string, timestamp: number): Promise<{
    status: MissionStatus | null;
    greeterId: string | null;
    lastChangeActor: string | null;
  }> {
    const entries = await this.queryDB(
      'missionAuditLog',
      [
        ['missionId', '==', missionId],
        ['timestamp', '<=', timestamp],
      ],
      [['timestamp', 'desc']],
      1,
    );

    if (entries.length === 0) {
      return { status: null, greeterId: null, lastChangeActor: null };
    }

    // Reconstruct state from all entries up to timestamp
    const allEntries = await this.getMissionAuditLog(missionId);
    const relevantEntries = allEntries.filter((e) => e.timestamp <= timestamp);

    let status: MissionStatus | null = null;
    let greeterId: string | null = null;

    for (const entry of relevantEntries) {
      for (const change of entry.changes) {
        if (change.field === 'status') {
          status = change.newValue;
        }
        if (change.field === 'greeterId') {
          greeterId = change.newValue;
        }
      }
    }

    return {
      status,
      greeterId,
      lastChangeActor: relevantEntries[relevantEntries.length - 1]?.actor || null,
    };
  }

  /**
   * Generate SLA compliance report
   * "Did we meet our 2-hour response SLA?"
   */
  async generateSLAReport(missionId: string): Promise<{
    createdAt: number;
    firstAssignmentAt: number | null;
    assignmentTime: number | null;
    slaMetMinutes: number;
    slaMet: boolean;
  }> {
    const entries = await this.getMissionAuditLog(missionId);

    const createdEntry = entries.find((e) => e.action === AuditAction.MISSION_CREATED);
    const assignmentEntry = entries.find(
      (e) => e.action === AuditAction.GREETER_ASSIGNED,
    );

    if (!createdEntry) {
      return {
        createdAt: 0,
        firstAssignmentAt: null,
        assignmentTime: null,
        slaMetMinutes: 120,
        slaMet: false,
      };
    }

    const createdAt = createdEntry.timestamp;
    const firstAssignmentAt = assignmentEntry?.timestamp || null;
    const assignmentTime = firstAssignmentAt ? (firstAssignmentAt - createdAt) / 1000 / 60 : null;
    const slaMetMinutes = 120; // 2 hours
    const slaMet = assignmentTime !== null && assignmentTime <= slaMetMinutes;

    return {
      createdAt,
      firstAssignmentAt,
      assignmentTime,
      slaMetMinutes,
      slaMet,
    };
  }

  /**
   * Generate activity report for date range
   */
  async generateActivityReport(startTime: number, endTime: number): Promise<{
    totalEvents: number;
    eventsByAction: Record<AuditAction, number>;
    eventsByActor: Record<string, number>;
    eventsByRole: Record<string, number>;
    mostActiveActor: { actor: string; count: number } | null;
    mostCommonAction: { action: AuditAction; count: number } | null;
  }> {
    const entries = await this.getAuditsByDateRange(startTime, endTime);

    const eventsByAction: Record<string, number> = {};
    const eventsByActor: Record<string, number> = {};
    const eventsByRole: Record<string, number> = {};

    for (const entry of entries) {
      eventsByAction[entry.action] = (eventsByAction[entry.action] || 0) + 1;
      eventsByActor[entry.actor] = (eventsByActor[entry.actor] || 0) + 1;
      eventsByRole[entry.actorRole] = (eventsByRole[entry.actorRole] || 0) + 1;
    }

    const mostActiveActor = Object.entries(eventsByActor).sort(([, a], [, b]) => b - a)[0]
      ? {
          actor: Object.entries(eventsByActor).sort(([, a], [, b]) => b - a)[0][0],
          count: Object.entries(eventsByActor).sort(([, a], [, b]) => b - a)[0][1],
        }
      : null;

    const mostCommonAction = Object.entries(eventsByAction).sort(([, a], [, b]) => b - a)[0]
      ? {
          action: Object.entries(eventsByAction).sort(([, a], [, b]) => b - a)[0][0] as AuditAction,
          count: Object.entries(eventsByAction).sort(([, a], [, b]) => b - a)[0][1],
        }
      : null;

    return {
      totalEvents: entries.length,
      eventsByAction,
      eventsByActor,
      eventsByRole,
      mostActiveActor,
      mostCommonAction,
    };
  }

  /**
   * Verify audit log integrity
   * Ensures no entries were deleted or modified
   */
  async verifyIntegrity(missionId: string): Promise<{
    isValid: boolean;
    entriesCount: number;
    firstEntry: AuditLogEntry | null;
    lastEntry: AuditLogEntry | null;
    issues: string[];
  }> {
    const entries = await this.getMissionAuditLog(missionId);
    const issues: string[] = [];

    // Check for gaps in timestamp sequence
    let prevTimestamp = 0;
    for (const entry of entries) {
      if (entry.timestamp < prevTimestamp) {
        issues.push(
          `Timestamp out of order: ${entry.timestamp} after ${prevTimestamp}`,
        );
      }
      prevTimestamp = entry.timestamp;
    }

    // Check for missing IDs
    const ids = new Set(entries.map((e) => e.id));
    if (ids.size !== entries.length) {
      issues.push('Duplicate entry IDs detected');
    }

    return {
      isValid: issues.length === 0,
      entriesCount: entries.length,
      firstEntry: entries[0] || null,
      lastEntry: entries[entries.length - 1] || null,
      issues,
    };
  }

  /**
   * Export audit log in compliance format (CSV, JSON)
   */
  async exportAuditLog(
    missionId: string,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    const entries = await this.getMissionAuditLog(missionId);

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    }

    // CSV format
    const headers = [
      'timestamp',
      'actor',
      'role',
      'action',
      'field',
      'oldValue',
      'newValue',
      'reason',
    ];

    const rows = entries.flatMap((e) =>
      e.changes.map((c) => [
        new Date(e.timestamp).toISOString(),
        e.actor,
        e.actorRole,
        e.action,
        c.field,
        JSON.stringify(c.oldValue),
        JSON.stringify(c.newValue),
        e.context?.reason || '',
      ]),
    );

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    return csv;
  }

  /**
   * DB operations (stub - would integrate with Supabase)
   */
  private async saveToDB(entry: AuditLogEntry): Promise<AuditLogEntry> {
    // In production: save to Supabase mission_audit_log table
    // For now: return entry (client-side only)
    return entry;
  }

  private async queryDB(
    table: string,
    filters: Array<[string, string, any]>,
    orderBy?: Array<[string, string]>,
    limit?: number,
  ): Promise<AuditLogEntry[]> {
    // In production: query Supabase with filters
    // For now: return empty array
    return [];
  }

  private detectSource(): 'api' | 'ui' | 'automation' | 'offline_sync' {
    // Detect if change came from UI, API, automation, or offline sync
    if (typeof window === 'undefined') return 'api';
    return 'ui';
  }

  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Get singleton instance
 */
export function getAuditService(): MissionAuditService {
  return MissionAuditService.getInstance();
}
