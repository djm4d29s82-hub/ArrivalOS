/**
 * Audit Log Viewer Components
 *
 * Display mission audit history with filtering, search, and export.
 */

import { useState, useEffect } from 'react';
import {
  Download,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Filter,
} from 'lucide-react';
import {
  getAuditService,
  type AuditLogEntry,
  AuditAction,
} from '@/lib/missionAuditService';

export function MissionAuditTrail({ missionId }: { missionId: string }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<AuditAction | 'all'>('all');
  const [filterActor, setFilterActor] = useState<string | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadAuditLog();
  }, [missionId]);

  const loadAuditLog = async () => {
    setLoading(true);
    try {
      const auditService = getAuditService();
      const log = await auditService.getMissionAuditLog(missionId);
      setEntries(log);
    } catch (error) {
      console.error('Failed to load audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = entries.filter((e) => {
    if (filterAction !== 'all' && e.action !== filterAction) return false;
    if (filterActor !== 'all' && e.actor !== filterActor) return false;
    return true;
  });

  const uniqueActions = Array.from(new Set(entries.map((e) => e.action)));
  const uniqueActors = Array.from(new Set(entries.map((e) => e.actor)));

  const handleExport = async (format: 'json' | 'csv') => {
    const auditService = getAuditService();
    const data = await auditService.exportAuditLog(missionId, format);

    const blob = new Blob([data], {
      type: format === 'json' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission-${missionId}-audit.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[15px]" style={{ color: 'var(--ds-t1)' }}>📋 Audit Trail</h3>
          <p className="text-xs text-[var(--mid)] mt-0.5">{filtered.length} events</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleExport('json')}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded transition"
            style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t1)' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <Download className="w-3 h-3" />
            JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded transition"
            style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t1)' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-[var(--light)]" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value as any)}
            className="text-xs px-2 py-1 rounded transition"
            style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
          >
            <option value="all">All actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {formatAction(action)}
              </option>
            ))}
          </select>
        </div>

        <select
          value={filterActor}
          onChange={(e) => setFilterActor(e.target.value)}
          className="text-xs px-2 py-1 rounded transition"
          style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
        >
          <option value="all">All actors</option>
          {uniqueActors.map((actor) => (
            <option key={actor} value={actor}>
              {actor}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-xs text-[var(--mid)] py-4 text-center">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-xs text-[var(--mid)] py-4 text-center">No entries</div>
        ) : (
          filtered.map((entry, idx) => (
            <AuditTimelineItem
              key={entry.id}
              entry={entry}
              isLast={idx === filtered.length - 1}
              isExpanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AuditTimelineItem({
  entry,
  isLast,
  isExpanded,
  onToggle,
}: {
  entry: AuditLogEntry;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const icon = getActionIcon(entry.action);
  const color = getActionColor(entry.action);
  const time = new Date(entry.timestamp).toLocaleTimeString('de-DE');
  const date = new Date(entry.timestamp).toLocaleDateString('de-DE');

  return (
    <div className="relative">
      {/* Timeline line */}
      {!isLast && (
        <div className={`absolute left-[18px] top-10 w-0.5 h-12 ${color.line}`} />
      )}

      {/* Entry */}
      <div className="flex gap-3">
        {/* Icon circle */}
        <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 mt-0.5 ${color.bg}`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-1">
          <button
            onClick={onToggle}
            className="w-full text-left p-2 rounded transition"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,146,40,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-sm" style={{ color: 'var(--ds-t1)' }}>{formatAction(entry.action)}</div>
                <div className="text-xs text-[var(--mid)] mt-0.5">
                  {entry.actor} ({entry.actorRole})
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-medium" style={{ color: 'var(--ds-t1)' }}>{time}</div>
                <div className="text-xs text-[var(--light)]">{date}</div>
              </div>
            </div>

            {/* Summary */}
            <div className="text-xs mt-2 space-y-1" style={{ color: 'var(--ds-t2)' }}>
              {entry.changes.map((change, idx) => (
                <div key={idx}>
                  <strong>{change.field}:</strong> {formatValue(change.oldValue)} →{' '}
                  {formatValue(change.newValue)}
                </div>
              ))}
            </div>

            {/* Expand indicator */}
            <div className={`text-[var(--mid)] mt-2 transition ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </button>

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-3 ml-2 pl-3 border-l-2 space-y-2 text-xs" style={{ borderColor: 'var(--ds-card-border)' }}>
              {entry.context?.reason && (
                <div>
                  <span className="font-semibold" style={{ color: 'var(--ds-t1)' }}>Reason:</span> {entry.context.reason}
                </div>
              )}
              {entry.context?.source && (
                <div>
                  <span className="font-semibold" style={{ color: 'var(--ds-t1)' }}>Source:</span> {entry.context.source}
                </div>
              )}
              {entry.relatedEntities && (
                <div>
                  <span className="font-semibold" style={{ color: 'var(--ds-t1)' }}>Related:</span>
                  <div className="mt-1 space-y-1 text-[var(--mid)]">
                    {entry.relatedEntities.greeterId && (
                      <div>Greeter: {entry.relatedEntities.greeterId}</div>
                    )}
                    {entry.relatedEntities.companyId && (
                      <div>Company: {entry.relatedEntities.companyId}</div>
                    )}
                    {entry.relatedEntities.candidateId && (
                      <div>Candidate: {entry.relatedEntities.candidateId}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getActionIcon(action: AuditAction) {
  const iconProps = { className: 'w-4 h-4' };

  switch (action) {
    case AuditAction.MISSION_STATUS_CHANGED:
      return <CheckCircle2 {...iconProps} className="w-4 h-4 text-blue-600" />;
    case AuditAction.GREETER_ASSIGNED:
      return <User {...iconProps} className="w-4 h-4 text-green-600" />;
    case AuditAction.ISSUE_REPORTED:
      return <AlertCircle {...iconProps} className="w-4 h-4 text-red-600" />;
    default:
      return <Clock {...iconProps} />;
  }
}

function getActionColor(action: AuditAction) {
  switch (action) {
    case AuditAction.MISSION_STATUS_CHANGED:
      return { bg: 'bg-blue-100 dark:bg-blue-500/15', line: 'bg-blue-200 dark:bg-blue-500/20' };
    case AuditAction.GREETER_ASSIGNED:
    case AuditAction.GREETER_REASSIGNED:
      return { bg: 'bg-green-100 dark:bg-green-500/15', line: 'bg-green-200 dark:bg-green-500/20' };
    case AuditAction.ISSUE_REPORTED:
      return { bg: 'bg-red-100 dark:bg-red-500/15', line: 'bg-red-200 dark:bg-red-500/20' };
    default:
      return { bg: 'bg-gray-100 dark:bg-white/[0.08]', line: 'bg-gray-200 dark:bg-white/[0.10]' };
  }
}

function formatAction(action: AuditAction): string {
  const actions: Record<AuditAction, string> = {
    [AuditAction.MISSION_CREATED]: '✨ Mission Created',
    [AuditAction.MISSION_STATUS_CHANGED]: '📊 Status Changed',
    [AuditAction.GREETER_ASSIGNED]: '👤 Greeter Assigned',
    [AuditAction.GREETER_REASSIGNED]: '🔄 Greeter Reassigned',
    [AuditAction.ISSUE_REPORTED]: '⚠️ Issue Reported',
    [AuditAction.ISSUE_RESOLVED]: '✅ Issue Resolved',
    [AuditAction.DOCUMENT_UPLOADED]: '📄 Document Uploaded',
    [AuditAction.DOCUMENT_VERIFIED]: '✔️ Document Verified',
    [AuditAction.NOTE_ADDED]: '📝 Note Added',
    [AuditAction.CANDIDATE_INFO_UPDATED]: '👥 Candidate Info Updated',
    [AuditAction.FLIGHT_INFO_UPDATED]: '✈️ Flight Info Updated',
    [AuditAction.COMPANY_INFO_UPDATED]: '🏢 Company Info Updated',
    [AuditAction.PERMISSION_CHANGED]: '🔐 Permission Changed',
    [AuditAction.TASK_COMPLETED]: '✓ Task Completed',
    [AuditAction.MESSAGE_SENT]: '💬 Message Sent',
    [AuditAction.AUTOMATION_TRIGGERED]: '⚙️ Automation Triggered',
  };

  return actions[action] || action;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Compact audit indicator for mission cards
 */
export function AuditIndicator({ missionId }: { missionId: string }) {
  const [entryCount, setEntryCount] = useState(0);
  const [lastActor, setLastActor] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      const auditService = getAuditService();
      const entries = await auditService.getMissionAuditLog(missionId);
      setEntryCount(entries.length);
      if (entries.length > 0) {
        setLastActor(entries[entries.length - 1].actor);
      }
    };

    loadStats();
  }, [missionId]);

  if (entryCount === 0) return null;

  return (
    <div className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 px-2 py-1 rounded flex items-center gap-1">
      <Clock className="w-3 h-3" />
      {entryCount} changes · {lastActor}
    </div>
  );
}
