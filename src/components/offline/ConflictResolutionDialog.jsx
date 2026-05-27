/**
 * ConflictResolutionDialog Component
 *
 * Modal for user to resolve mission state conflicts
 *
 * Scenario:
 * - Greeter was offline
 * - Queued transition: ACCEPTED → ON_THE_WAY
 * - While offline, admin changed it to: ARRIVED
 * - When online: conflict detected!
 * - User chooses: keep local (retry), use server (discard local), or merge
 */

import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { type ConflictDetection } from '@/lib/missionOfflineQueue';

interface ConflictResolutionDialogProps {
  conflict: ConflictDetection | null;
  onResolve: (resolution: 'keep_local' | 'use_server' | 'merged') => Promise<boolean>;
  onDismiss: () => void;
  loading?: boolean;
}

export function ConflictResolutionDialog({
  conflict,
  onResolve,
  onDismiss,
  loading,
}: ConflictResolutionDialogProps) {
  if (!conflict) return null;

  const handleResolve = async (resolution: 'keep_local' | 'use_server' | 'merged') => {
    const success = await onResolve(resolution);
    if (success) {
      onDismiss();
    }
  };

  return (
    <Modal
      open={!!conflict}
      onClose={onDismiss}
      title="🔄 Einsatz-Status aktualisiert"
      description="Ein anderer Administrator hat den Status des Einsatzes geändert, während Sie offline waren."
      size="md"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onDismiss} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={() => handleResolve('use_server')}
            loading={loading}
          >
            Serverversion verwenden
          </Button>
          {conflict.isResolvable && (
            <Button
              variant="primary"
              icon={CheckCircle2}
              onClick={() => handleResolve('merged')}
              loading={loading}
            >
              Zusammenführen
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Conflict details */}
        <div className="bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200 dark:border-amber-500/30 rounded-lg p-4 space-y-3">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold mb-1" style={{ color: 'var(--ds-t1)' }}>Konflikt erkannt</div>
              <p className="text-sm text-[var(--mid)]">{conflict.reason}</p>
            </div>
          </div>
        </div>

        {/* State comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Local change */}
          <div className="border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/[0.08] rounded-lg p-3">
            <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2">
              Ihre Änderung
            </div>
            <div className="rounded px-3 py-2 text-sm font-mono" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
              {conflict.localChange.clientStatus} → {conflict.localChange.targetStatus}
            </div>
            <div className="text-xs text-blue-700 mt-2">
              {new Date(conflict.localChange.queuedAt).toLocaleTimeString('de-DE')}
            </div>
          </div>

          {/* Server change */}
          <div className="border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/[0.08] rounded-lg p-3">
            <div className="text-xs font-semibold text-green-900 uppercase tracking-wide mb-2">
              Server-Version
            </div>
            <div className="rounded px-3 py-2 text-sm font-mono" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
              Status: {conflict.serverStatus}
            </div>
            <div className="text-xs text-green-700 mt-2">
              {new Date(conflict.serverChangedAt).toLocaleTimeString('de-DE')}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--ds-card)' }}>
          <div className="font-semibold text-sm mb-3" style={{ color: 'var(--ds-t1)' }}>Wie möchten Sie fortfahren?</div>

          {/* Option 1: Keep local */}
          <label className="flex items-start gap-3 p-3 border-2 border-blue-200 dark:border-blue-500/30 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-500/[0.08] transition">
            <input
              type="radio"
              name="resolution"
              value="keep_local"
              className="w-4 h-4 mt-1 accent-blue-600"
              onChange={() => handleResolve('keep_local')}
              disabled={loading}
            />
            <div className="flex-1">
              <div className="font-medium text-sm" style={{ color: 'var(--ds-t1)' }}>Meine Änderung behalten</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ds-t2)' }}>
                Ihre ursprüngliche Änderung wird auf den aktuellen Server-Status angewendet
              </div>
            </div>
          </label>

          {/* Option 2: Use server */}
          <label className="flex items-start gap-3 p-3 border-2 border-gray-200 dark:border-white/15 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.05] transition">
            <input
              type="radio"
              name="resolution"
              value="use_server"
              className="w-4 h-4 mt-1"
              onChange={() => handleResolve('use_server')}
              disabled={loading}
            />
            <div className="flex-1">
              <div className="font-medium text-sm" style={{ color: 'var(--ds-t1)' }}>Server-Version verwenden</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ds-t2)' }}>
                Verwerfen Sie Ihre Änderung und akzeptieren Sie den aktuellen Status
              </div>
            </div>
          </label>

          {/* Option 3: Merge (if resolvable) */}
          {conflict.isResolvable && (
            <label className="flex items-start gap-3 p-3 border-2 border-green-200 dark:border-green-500/30 rounded-lg cursor-pointer hover:bg-green-50 dark:hover:bg-green-500/[0.08] transition bg-green-50/50 dark:bg-green-500/[0.05]">
              <input
                type="radio"
                name="resolution"
                value="merged"
                className="w-4 h-4 mt-1 accent-green-600"
                onChange={() => handleResolve('merged')}
                disabled={loading}
              />
              <div className="flex-1">
                <div className="font-medium text-sm text-green-900">Zusammenführen (empfohlen)</div>
                <div className="text-xs text-green-700 mt-0.5">
                  Ihre Änderung wird auf den neuen Server-Status angewendet
                </div>
              </div>
            </label>
          )}
        </div>

        {/* Info message */}
        <div className="bg-blue-50 dark:bg-blue-500/[0.08] border border-blue-200 dark:border-blue-500/30 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300">
          ℹ️ Die Änderung wird automatisch synchronisiert, sobald Sie eine Option wählen.
        </div>
      </div>
    </Modal>
  );
}
