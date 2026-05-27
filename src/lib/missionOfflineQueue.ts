/**
 * Mission Offline Queue + Conflict Resolution
 *
 * Handles:
 * - Offline state transition queuing
 * - Automatic retry when connection restored
 * - Conflict detection (mission changed while offline)
 * - User-guided conflict resolution
 * - Persistent queue via IndexedDB
 *
 * Architecture:
 * 1. When offline: queue transitions locally
 * 2. Monitor network → auto-retry when back online
 * 3. Check if server state changed → conflict detection
 * 4. Resolve: merge if no conflict, ask user if conflict
 * 5. Emit events for UI (pending, synced, conflict, error)
 *
 * Usage:
 * const queue = MissionOfflineQueue.getInstance();
 * queue.queueTransition(missionId, nextStatus, email, currentStatus);
 * queue.on('queueUpdated', handleQueueChange);
 * queue.syncAll(); // Manual trigger
 */

import { MissionStatus } from './missionStateMachine';

/**
 * Simple EventEmitter for browser
 */
class SimpleEventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();

  on(event: string, listener: Function): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return this;
  }

  off(event: string, listener: Function): this {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.size === 0) return false;

    listeners.forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
    return true;
  }
}

export interface QueuedTransition {
  id: string; // UUID
  missionId: string;
  targetStatus: MissionStatus;
  actor: string; // user email
  clientStatus: MissionStatus; // what greeter thought status was
  queuedAt: number; // timestamp
  attemptCount: number;
  lastAttemptAt: number | null;
  lastError: string | null;
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';
  conflictResolution?: 'keep_local' | 'use_server' | 'merged';
}

export interface ConflictDetection {
  missionId: string;
  localChange: QueuedTransition;
  serverStatus: MissionStatus;
  serverChangedAt: number;
  isResolvable: boolean; // Can both changes coexist?
  suggestion: 'merge' | 'keep_local' | 'use_server';
  reason: string;
}

export interface SyncResult {
  missionId: string;
  success: boolean;
  queuedTransitionId: string;
  newStatus?: MissionStatus;
  conflict?: ConflictDetection;
  error?: string;
}

/**
 * Singleton offline queue manager
 */
export class MissionOfflineQueue extends SimpleEventEmitter {
  private static instance: MissionOfflineQueue;
  private queue: Map<string, QueuedTransition> = new Map();
  private db: IDBDatabase | null = null;
  private isOnline = navigator.onLine;
  private retryInterval: number | null = null;
  private syncInProgress = false;

  private constructor() {
    super();
    this.initDB();
    this.monitorNetworkStatus();
    this.restoreQueueFromDB();
  }

  static getInstance(): MissionOfflineQueue {
    if (!MissionOfflineQueue.instance) {
      MissionOfflineQueue.instance = new MissionOfflineQueue();
    }
    return MissionOfflineQueue.instance;
  }

  /**
   * Initialize IndexedDB for persistent queue storage
   */
  private initDB(): void {
    const request = indexedDB.open('arrival-os-offline', 1);

    request.onerror = () => {
      console.error('Failed to open IndexedDB');
    };

    request.onsuccess = (event) => {
      this.db = (event.target as IDBOpenDBRequest).result;
      console.log('IndexedDB initialized for offline queue');
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('queuedTransitions')) {
        db.createObjectStore('queuedTransitions', { keyPath: 'id' });
      }
    };
  }

  /**
   * Monitor online/offline status and auto-sync when back online
   */
  private monitorNetworkStatus(): void {
    window.addEventListener('online', () => {
      console.log('[OfflineQueue] Network restored - starting auto-sync');
      this.isOnline = true;
      this.startAutoSync();
      this.emit('networkRestored');
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineQueue] Network disconnected');
      this.isOnline = false;
      this.stopAutoSync();
      this.emit('networkLost');
    });
  }

  /**
   * Queue a mission state transition for offline handling
   */
  async queueTransition(
    missionId: string,
    targetStatus: MissionStatus,
    actor: string,
    currentStatus: MissionStatus,
  ): Promise<string> {
    const transition: QueuedTransition = {
      id: this.generateId(),
      missionId,
      targetStatus,
      actor,
      clientStatus: currentStatus,
      queuedAt: Date.now(),
      attemptCount: 0,
      lastAttemptAt: null,
      lastError: null,
      status: 'pending',
    };

    this.queue.set(transition.id, transition);
    await this.saveToDb(transition);

    this.emit('queueUpdated', {
      action: 'added',
      transition,
      queueSize: this.queue.size,
    });

    // If online, try to sync immediately
    if (this.isOnline && !this.syncInProgress) {
      this.syncAll();
    }

    return transition.id;
  }

  /**
   * Get all pending transitions for a mission
   */
  getPendingForMission(missionId: string): QueuedTransition[] {
    return Array.from(this.queue.values()).filter(
      (t) => t.missionId === missionId && t.status === 'pending',
    );
  }

  /**
   * Get all queued transitions (pending, syncing, error)
   */
  getAllQueued(): QueuedTransition[] {
    return Array.from(this.queue.values()).filter(
      (t) => t.status !== 'synced',
    );
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const all = Array.from(this.queue.values());
    return {
      total: all.length,
      pending: all.filter((t) => t.status === 'pending').length,
      syncing: all.filter((t) => t.status === 'syncing').length,
      conflicts: all.filter((t) => t.status === 'conflict').length,
      errors: all.filter((t) => t.status === 'error').length,
      isOnline: this.isOnline,
    };
  }

  /**
   * Sync all pending transitions
   */
  async syncAll(): Promise<SyncResult[]> {
    if (this.syncInProgress) return [];

    this.syncInProgress = true;
    const results: SyncResult[] = [];

    try {
      const pending = Array.from(this.queue.values()).filter(
        (t) => t.status === 'pending',
      );

      for (const transition of pending) {
        const result = await this.syncOne(transition);
        results.push(result);

        if (!result.success && result.conflict) {
          // Stop on first conflict - wait for user resolution
          break;
        }
      }

      this.emit('syncCompleted', {
        results,
        timestamp: Date.now(),
      });
    } finally {
      this.syncInProgress = false;
    }

    return results;
  }

  /**
   * Sync a single queued transition
   */
  private async syncOne(transition: QueuedTransition): Promise<SyncResult> {
    transition.status = 'syncing';
    transition.attemptCount++;
    transition.lastAttemptAt = Date.now();

    this.emit('syncStarted', { transition });

    try {
      // Call mission state machine via API
      const response = await this.callTransitionAPI(
        transition.missionId,
        transition.targetStatus,
        transition.actor,
      );

      if (response.success) {
        // Sync successful
        transition.status = 'synced';
        await this.saveToDb(transition);

        this.emit('syncSuccess', {
          transition,
          newStatus: response.newStatus,
        });

        return {
          missionId: transition.missionId,
          success: true,
          queuedTransitionId: transition.id,
          newStatus: response.newStatus,
        };
      }

      // Check for conflict
      const conflict = await this.detectConflict(transition, response);
      if (conflict) {
        transition.status = 'conflict';
        await this.saveToDb(transition);

        this.emit('conflictDetected', conflict);

        return {
          missionId: transition.missionId,
          success: false,
          queuedTransitionId: transition.id,
          conflict,
        };
      }

      // Unknown error
      throw new Error(
        response.error || 'Unknown sync error',
      );
    } catch (error) {
      transition.status = 'error';
      transition.lastError = error instanceof Error ? error.message : String(error);
      await this.saveToDb(transition);

      this.emit('syncError', {
        transition,
        error: transition.lastError,
      });

      return {
        missionId: transition.missionId,
        success: false,
        queuedTransitionId: transition.id,
        error: transition.lastError,
      };
    }
  }

  /**
   * Detect if mission state changed while offline
   */
  private async detectConflict(
    transition: QueuedTransition,
    response: any,
  ): Promise<ConflictDetection | null> {
    const serverStatus = response.currentStatus as MissionStatus;
    const serverChangedAt = response.statusChangedAt as number;

    // If server status matches what we expected, no conflict
    if (serverStatus === transition.clientStatus) {
      return null;
    }

    // Determine if changes are compatible
    const isCompatible = this.canMergeTransitions(
      serverStatus,
      transition.targetStatus,
    );

    const resolution: ConflictDetection = {
      missionId: transition.missionId,
      localChange: transition,
      serverStatus,
      serverChangedAt,
      isResolvable: isCompatible,
      suggestion: isCompatible ? 'merge' : 'keep_local',
      reason: isCompatible
        ? `Server: ${serverStatus}, Local: ${transition.targetStatus} - can apply sequentially`
        : `Server: ${serverStatus}, Local: ${transition.targetStatus} - conflicting transitions`,
    };

    return resolution;
  }

  /**
   * Check if two transitions can be merged
   */
  private canMergeTransitions(serverStatus: MissionStatus, localTarget: MissionStatus): boolean {
    // Example: if server is ON_THE_WAY and local wants ARRIVED, that's compatible
    // But if server is COMPLETED and local wants anything, that's a terminal conflict

    const terminalStates = [MissionStatus.COMPLETED, MissionStatus.CANCELLED, MissionStatus.ISSUE_REPORTED];

    if (terminalStates.includes(serverStatus)) {
      return false; // Can't merge into terminal state
    }

    // Simple heuristic: forward progress is mergeable
    const stateProgression = [
      MissionStatus.ASSIGNED,
      MissionStatus.ACCEPTED,
      MissionStatus.ON_THE_WAY,
      MissionStatus.ARRIVED,
      MissionStatus.MET_TALENT,
      MissionStatus.COMPLETED,
    ];

    const serverIndex = stateProgression.indexOf(serverStatus);
    const localIndex = stateProgression.indexOf(localTarget);

    return localIndex > serverIndex; // Local is ahead = can merge
  }

  /**
   * Resolve a conflict by choosing user's preference
   */
  async resolveConflict(
    queuedTransitionId: string,
    resolution: 'keep_local' | 'use_server' | 'merged',
  ): Promise<boolean> {
    const transition = this.queue.get(queuedTransitionId);
    if (!transition) return false;

    if (resolution === 'keep_local') {
      // Retry the original transition
      transition.status = 'pending';
      const result = await this.syncOne(transition);
      return result.success;
    }

    if (resolution === 'use_server') {
      // Mark as resolved, remove from queue
      transition.status = 'synced';
      transition.conflictResolution = 'use_server';
      await this.saveToDb(transition);
      this.emit('conflictResolved', { transition, resolution });
      return true;
    }

    if (resolution === 'merged') {
      // Apply local change on top of server state
      transition.status = 'pending';
      const result = await this.syncOne(transition);
      if (result.success) {
        transition.conflictResolution = 'merged';
        await this.saveToDb(transition);
        this.emit('conflictResolved', { transition, resolution });
      }
      return result.success;
    }

    return false;
  }

  /**
   * Retry all failed syncs
   */
  async retryFailed(): Promise<SyncResult[]> {
    const failed = Array.from(this.queue.values()).filter(
      (t) => t.status === 'error',
    );

    for (const transition of failed) {
      transition.status = 'pending';
      await this.saveToDb(transition);
    }

    return this.syncAll();
  }

  /**
   * Clear a queued transition
   */
  async clearQueued(queuedTransitionId: string): Promise<void> {
    this.queue.delete(queuedTransitionId);
    await this.deleteFromDb(queuedTransitionId);

    this.emit('queueUpdated', {
      action: 'removed',
      queuedTransitionId,
      queueSize: this.queue.size,
    });
  }

  /**
   * Clear all synced transitions (keep errors/pending)
   */
  async clearSynced(): Promise<void> {
    const toDelete: string[] = [];

    this.queue.forEach((transition, id) => {
      if (transition.status === 'synced') {
        toDelete.push(id);
      }
    });

    for (const id of toDelete) {
      this.queue.delete(id);
      await this.deleteFromDb(id);
    }

    this.emit('queueUpdated', {
      action: 'cleared_synced',
      clearedCount: toDelete.length,
      queueSize: this.queue.size,
    });
  }

  /**
   * API call to sync transition to server
   */
  private async callTransitionAPI(
    missionId: string,
    targetStatus: MissionStatus,
    actor: string,
  ): Promise<{
    success: boolean;
    newStatus?: MissionStatus;
    currentStatus?: MissionStatus;
    statusChangedAt?: number;
    error?: string;
  }> {
    // This would call your actual backend API
    // For now, mock response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          newStatus: targetStatus,
          currentStatus: targetStatus,
          statusChangedAt: Date.now(),
        });
      }, 500);
    });
  }

  /**
   * DB operations
   */
  private async saveToDb(transition: QueuedTransition): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['queuedTransitions'], 'readwrite');
      const store = tx.objectStore('queuedTransitions');
      const request = store.put(transition);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromDb(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['queuedTransitions'], 'readwrite');
      const store = tx.objectStore('queuedTransitions');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async restoreQueueFromDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(['queuedTransitions'], 'readonly');
      const store = tx.objectStore('queuedTransitions');
      const request = store.getAll();

      request.onsuccess = () => {
        const transitions = request.result as QueuedTransition[];
        transitions.forEach((t) => {
          this.queue.set(t.id, t);
        });
        console.log(`[OfflineQueue] Restored ${transitions.length} queued transitions`);
        this.emit('queueRestored', { count: transitions.length });
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to restore queue from DB');
        resolve();
      };
    });
  }

  /**
   * Auto-sync on network restore
   */
  private startAutoSync(): void {
    if (this.retryInterval) return;

    this.retryInterval = window.setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncAll();
      }
    }, 3000); // Retry every 3 seconds
  }

  private stopAutoSync(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
  }

  /**
   * Helpers
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Get singleton instance
 */
export function getOfflineQueue(): MissionOfflineQueue {
  return MissionOfflineQueue.getInstance();
}
