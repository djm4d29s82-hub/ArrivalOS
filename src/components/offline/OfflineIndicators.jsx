/**
 * OfflineIndicator Component
 *
 * Shows offline status bar at top of app
 * Appears when network is unavailable
 */

import { WifiOff, Wifi } from 'lucide-react';
import { useOfflineIndicator } from '@/lib/useOfflineQueue';

export function OfflineIndicator() {
  const { isOnline } = useOfflineIndicator();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-2.5 flex items-center gap-2 shadow-lg">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium flex-1">
        ⚠️ Keine Internetverbindung — Änderungen werden synchronisiert, wenn Sie wieder online sind.
      </span>
      <div className="flex items-center gap-1.5 text-xs bg-white/20 px-2.5 py-1 rounded">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        Offline
      </div>
    </div>
  );
}

/**
 * PendingSyncIndicator Component
 *
 * Shows inline pending sync indicator for mission card
 */
export function PendingSyncIndicator({ missionId }: { missionId: string }) {
  const { hasPending, queueStats } = useOfflineQueue(missionId);

  if (!hasPending) return null;

  return (
    <div className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400 px-2.5 py-1 rounded text-xs font-medium">
      <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-pulse" />
      📡 {queueStats.pending} Synchronisieren...
    </div>
  );
}

/**
 * QueueStatusBadge Component
 *
 * Shows queue statistics badge
 */
export function QueueStatusBadge() {
  const { queueStats } = useOfflineQueue('all');

  if (queueStats.total === 0) return null;

  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 dark:bg-amber-500/[0.08] dark:border-amber-500/20 rounded-lg px-3 py-2 text-xs">
      <div className="flex gap-1 text-xs font-medium">
        {queueStats.pending > 0 && (
          <span className="bg-yellow-200 text-yellow-900 dark:bg-yellow-500/20 dark:text-yellow-300 px-2 py-1 rounded">
            📡 {queueStats.pending} pending
          </span>
        )}
        {queueStats.syncing > 0 && (
          <span className="bg-blue-200 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300 px-2 py-1 rounded">
            🔄 {queueStats.syncing} syncing
          </span>
        )}
        {queueStats.conflicts > 0 && (
          <span className="bg-red-200 text-red-900 dark:bg-red-500/20 dark:text-red-300 px-2 py-1 rounded">
            ⚠️ {queueStats.conflicts} conflicts
          </span>
        )}
        {queueStats.errors > 0 && (
          <span className="bg-orange-200 text-orange-900 dark:bg-orange-500/20 dark:text-orange-300 px-2 py-1 rounded">
            ❌ {queueStats.errors} errors
          </span>
        )}
      </div>
      {!queueStats.isOnline && (
        <div className="ml-auto text-orange-600 dark:text-orange-400 font-medium">Offline Mode</div>
      )}
    </div>
  );
}

// Note: Import this in your app
import { useOfflineQueue } from '@/lib/useOfflineQueue';
