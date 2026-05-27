/**
 * useOfflineQueue Hook
 *
 * Integrates offline queue into React components
 * Provides:
 * - Pending state UI indicators
 * - Conflict resolution UI
 * - Queue status monitoring
 * - Manual retry controls
 *
 * Usage:
 * const {
 *   hasPending,
 *   conflictDialog,
 *   queueStats,
 *   retryFailed,
 *   resolveConflict,
 * } = useOfflineQueue(missionId);
 *
 * {hasPending && <span>📡 Pending sync...</span>}
 * {conflictDialog && <ConflictModal {...conflictDialog} onResolve={resolveConflict} />}
 */

import { useState, useEffect, useCallback } from 'react';
import { getOfflineQueue, type ConflictDetection, type QueuedTransition } from './missionOfflineQueue';

export interface OfflineQueueState {
  hasPending: boolean;
  pendingTransitions: QueuedTransition[];
  conflictDialog: ConflictDetection | null;
  queueStats: {
    total: number;
    pending: number;
    syncing: number;
    conflicts: number;
    errors: number;
    isOnline: boolean;
  };
  networkStatus: 'online' | 'offline';
}

export interface OfflineQueueActions {
  retryFailed: () => Promise<void>;
  resolveConflict: (resolution: 'keep_local' | 'use_server' | 'merged') => Promise<boolean>;
  clearPending: (transitionId: string) => Promise<void>;
  clearAllSynced: () => Promise<void>;
}

export function useOfflineQueue(missionId: string): OfflineQueueState & OfflineQueueActions {
  const queue = getOfflineQueue();

  const [state, setState] = useState<OfflineQueueState>({
    hasPending: false,
    pendingTransitions: [],
    conflictDialog: null,
    queueStats: queue.getStats(),
    networkStatus: navigator.onLine ? 'online' : 'offline',
  });

  // Update UI on queue changes
  useEffect(() => {
    const handleQueueUpdated = () => {
      const pending = queue.getPendingForMission(missionId);
      setState((prev) => ({
        ...prev,
        hasPending: pending.length > 0,
        pendingTransitions: pending,
        queueStats: queue.getStats(),
      }));
    };

    const handleConflict = (conflict: ConflictDetection) => {
      if (conflict.missionId === missionId) {
        setState((prev) => ({
          ...prev,
          conflictDialog: conflict,
        }));
      }
    };

    const handleConflictResolved = () => {
      setState((prev) => ({
        ...prev,
        conflictDialog: null,
      }));
    };

    const handleNetworkLost = () => {
      setState((prev) => ({
        ...prev,
        networkStatus: 'offline',
      }));
    };

    const handleNetworkRestored = () => {
      setState((prev) => ({
        ...prev,
        networkStatus: 'online',
      }));
    };

    queue.on('queueUpdated', handleQueueUpdated);
    queue.on('conflictDetected', handleConflict);
    queue.on('conflictResolved', handleConflictResolved);
    queue.on('networkLost', handleNetworkLost);
    queue.on('networkRestored', handleNetworkRestored);

    // Initial state
    handleQueueUpdated();

    return () => {
      queue.off('queueUpdated', handleQueueUpdated);
      queue.off('conflictDetected', handleConflict);
      queue.off('conflictResolved', handleConflictResolved);
      queue.off('networkLost', handleNetworkLost);
      queue.off('networkRestored', handleNetworkRestored);
    };
  }, [missionId, queue]);

  const retryFailed = useCallback(async () => {
    await queue.retryFailed();
  }, [queue]);

  const resolveConflict = useCallback(
    async (resolution: 'keep_local' | 'use_server' | 'merged'): Promise<boolean> => {
      const conflict = state.conflictDialog;
      if (!conflict) return false;

      const success = await queue.resolveConflict(
        conflict.localChange.id,
        resolution,
      );

      if (success) {
        setState((prev) => ({
          ...prev,
          conflictDialog: null,
        }));
      }

      return success;
    },
    [state.conflictDialog, queue],
  );

  const clearPending = useCallback(
    async (transitionId: string) => {
      await queue.clearQueued(transitionId);
    },
    [queue],
  );

  const clearAllSynced = useCallback(async () => {
    await queue.clearSynced();
  }, [queue]);

  return {
    ...state,
    retryFailed,
    resolveConflict,
    clearPending,
    clearAllSynced,
  };
}

/**
 * useOfflineIndicator Hook
 *
 * Simple indicator for app-wide offline status
 *
 * Usage:
 * const { isOnline, showIndicator } = useOfflineIndicator();
 * {showIndicator && <OfflineBar />}
 */
export function useOfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queue = getOfflineQueue();

  useEffect(() => {
    const handleNetworkLost = () => setIsOnline(false);
    const handleNetworkRestored = () => setIsOnline(true);

    queue.on('networkLost', handleNetworkLost);
    queue.on('networkRestored', handleNetworkRestored);

    return () => {
      queue.off('networkLost', handleNetworkLost);
      queue.off('networkRestored', handleNetworkRestored);
    };
  }, [queue]);

  return {
    isOnline,
    showIndicator: !isOnline,
  };
}
