/**
 * PHASE 2A.3 — Supabase Realtime Integration Service
 * 
 * Realtime bidirectional sync für alle Mission Status Changes
 * Mehrere Clients (Greeter App, Admin Dashboard, Operations Center) 
 * erhalten live Updates wenn sich eine Mission ändert
 * 
 * Architecture:
 * [Greeter App (transitionTo)] 
 *        ↓
 * [useMissionState Hook]
 *        ↓
 * [Supabase DB UPDATE]
 *        ↓
 * [Supabase Realtime Trigger]
 *        ↓
 * [All Connected Clients ← Notified]
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { base44 } from '@/api/base44Client';
import {
  MissionState,
  MissionStatus,
  MissionStateEvent,
  missionEventEmitter,
} from './missionStateMachine';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface RealtimeSyncConfig {
  missionId: string;
  onStateChange?: (mission: MissionState) => void;
  onError?: (error: Error) => void;
  debug?: boolean;
}

export interface RealtimeSyncManager {
  subscribe(): Promise<void>;
  unsubscribe(): void;
  isConnected: boolean;
  lastUpdate: string | null;
}

// ═══════════════════════════════════════════════════════════════════════
// REALTIME SYNC MANAGER
// ═══════════════════════════════════════════════════════════════════════

class MissionRealtimeSyncManager implements RealtimeSyncManager {
  private channel: RealtimeChannel | null = null;
  private config: RealtimeSyncConfig;
  public isConnected: boolean = false;
  public lastUpdate: string | null = null;

  constructor(config: RealtimeSyncConfig) {
    this.config = config;
  }

  /**
   * Subscribe to mission realtime changes
   */
  async subscribe(): Promise<void> {
    try {
      if (!base44.raw?.supabaseClient) {
        throw new Error('Supabase client not configured');
      }

      const { supabaseClient } = base44.raw;

      this.log('🔌 Subscribing to mission channel:', this.config.missionId);

      // Create channel for this mission
      this.channel = supabaseClient.channel(`mission:${this.config.missionId}`, {
        config: {
          broadcast: { self: false }, // Don't receive own broadcasts
          presence: { key: 'client' },
        },
      });

      // Listen to database changes
      this.channel
        .on(
          'postgres_changes',
          {
            event: '*', // ALL events: INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'missions',
            filter: `id=eq.${this.config.missionId}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            this.handleDatabaseChange(payload);
          }
        )
        // Listen to custom broadcasts (for real-time events)
        .on('broadcast', { event: 'mission:status_changed' }, (payload) => {
          this.handleBroadcast(payload);
        })
        // Track presence (who's viewing this mission)
        .on('presence', { event: 'sync' }, () => {
          const state = this.channel?.presenceState();
          this.log('👥 Presence updated:', state);
        });

      // Subscribe
      await this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.log('✅ Realtime subscribed');
          this.isConnected = true;

          // Announce presence
          await this.channel?.track({
            user: base44.currentUser?.email || 'anonymous',
            role: base44.currentUser?.role || 'user',
            client_id: this.generateClientId(),
            subscribed_at: new Date().toISOString(),
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.log('❌ Realtime disconnected:', status);
          this.isConnected = false;
        }
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.log('❌ Subscription error:', error);
      this.config.onError?.(error);
      throw error;
    }
  }

  /**
   * Handle database changes from Supabase
   */
  private handleDatabaseChange(payload: RealtimePostgresChangesPayload<any>): void {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      this.log(`📨 Database ${eventType}:`, newRecord || oldRecord);

      if (eventType === 'UPDATE' && newRecord) {
        const mission = newRecord as MissionState;
        this.lastUpdate = new Date().toISOString();

        // Emit internal event
        const event: MissionStateEvent = {
          type: 'MISSION_STATUS_CHANGED',
          missionId: mission.id,
          oldStatus: (oldRecord?.status || MissionStatus.ASSIGNED) as MissionStatus,
          newStatus: mission.status,
          timestamp: new Date().toISOString(),
          actor: mission.last_updated_by || 'system',
          optimistic: false,
          issueSeverity: mission.issue_severity,
          issueMessage: mission.issue_message,
        };

        // Emit to event system
        missionEventEmitter.emit(event);

        // Call callback
        this.config.onStateChange?.(mission);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.log('❌ Error handling database change:', error);
      this.config.onError?.(error);
    }
  }

  /**
   * Handle custom broadcasts (for low-latency updates)
   */
  private handleBroadcast(payload: any): void {
    try {
      this.log('📡 Broadcast received:', payload);

      const { mission, actor } = payload.payload;

      if (mission && mission.id === this.config.missionId) {
        this.lastUpdate = new Date().toISOString();

        // Emit event immediately (faster than DB polling)
        const event: MissionStateEvent = {
          type: 'MISSION_STATUS_CHANGED',
          missionId: mission.id,
          oldStatus: mission.previousStatus || MissionStatus.ASSIGNED,
          newStatus: mission.status,
          timestamp: new Date().toISOString(),
          actor,
          optimistic: false,
        };

        missionEventEmitter.emit(event);
        this.config.onStateChange?.(mission);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.log('❌ Error handling broadcast:', error);
    }
  }

  /**
   * Broadcast mission state change to other clients
   * (Call this after a successful DB update)
   */
  async broadcastStateChange(mission: MissionState, actor: string): Promise<void> {
    try {
      if (!this.channel) {
        this.log('⚠️ Channel not ready for broadcast');
        return;
      }

      await this.channel.send({
        type: 'broadcast',
        event: 'mission:status_changed',
        payload: {
          mission,
          actor,
          timestamp: new Date().toISOString(),
        },
      });

      this.log('📤 Broadcasted mission state change');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.log('❌ Broadcast error:', error);
    }
  }

  /**
   * Unsubscribe from realtime changes
   */
  unsubscribe(): void {
    try {
      if (this.channel && base44.raw?.supabaseClient) {
        base44.raw.supabaseClient.removeChannel(this.channel);
        this.log('🔌 Unsubscribed from mission channel');
        this.isConnected = false;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.log('❌ Unsubscribe error:', error);
    }
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[MissionRealtimeSync]', ...args);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MULTI-MISSION MANAGER (for dashboard views)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Track multiple missions in realtime (for admin dashboard)
 * Usage: const manager = new MultiMissionRealtimeSyncManager();
 *        await manager.addMission(missionId);
 *        await manager.subscribe();
 */
export class MultiMissionRealtimeSyncManager {
  private managers: Map<string, MissionRealtimeSyncManager> = new Map();
  private debug: boolean = false;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  /**
   * Add a mission to track
   */
  addMission(
    missionId: string,
    onStateChange?: (mission: MissionState) => void,
    onError?: (error: Error) => void
  ): void {
    if (this.managers.has(missionId)) return;

    const manager = new MissionRealtimeSyncManager({
      missionId,
      onStateChange,
      onError,
      debug: this.debug,
    });

    this.managers.set(missionId, manager);
    this.log(`✅ Added mission ${missionId} to tracking`);
  }

  /**
   * Subscribe all missions to realtime
   */
  async subscribe(): Promise<void> {
    const promises = Array.from(this.managers.values()).map((manager) => manager.subscribe());
    await Promise.all(promises);
    this.log(`✅ Subscribed ${this.managers.size} missions to realtime`);
  }

  /**
   * Unsubscribe all missions
   */
  unsubscribeAll(): void {
    this.managers.forEach((manager) => manager.unsubscribe());
    this.managers.clear();
    this.log('🔌 Unsubscribed all missions');
  }

  /**
   * Get manager for specific mission
   */
  getManager(missionId: string): MissionRealtimeSyncManager | undefined {
    return this.managers.get(missionId);
  }

  /**
   * Check if mission is connected
   */
  isConnected(missionId: string): boolean {
    return this.managers.get(missionId)?.isConnected || false;
  }

  /**
   * Get stats
   */
  getStats() {
    const stats = {
      totalMissions: this.managers.size,
      connectedMissions: Array.from(this.managers.values()).filter(
        (m) => m.isConnected
      ).length,
      missions: Array.from(this.managers.entries()).map(([id, manager]) => ({
        id,
        connected: manager.isConnected,
        lastUpdate: manager.lastUpdate,
      })),
    };
    return stats;
  }

  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[MultiMissionRealtimeSync]', ...args);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// BROADCAST CHANNEL API (for cross-tab sync)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Sync mission state across browser tabs using Broadcast Channel API
 * When user accepts mission in one tab, all other tabs update automatically
 */
export class CrossTabMissionSync {
  private channel: BroadcastChannel | null = null;
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  /**
   * Initialize cross-tab sync
   */
  init(): void {
    try {
      if (!('BroadcastChannel' in globalThis)) {
        console.warn('BroadcastChannel not supported in this browser');
        return;
      }

      this.channel = new BroadcastChannel('neuland:missions');
      this.channel.onmessage = (event) => {
        this.log('📨 Message from another tab:', event.data);

        // When another tab updates mission, emit event
        const { type, mission } = event.data;
        if (type === 'MISSION_STATE_CHANGED' && mission) {
          const stateEvent: MissionStateEvent = {
            type: 'MISSION_STATUS_CHANGED',
            missionId: mission.id,
            oldStatus: mission.previousStatus || MissionStatus.ASSIGNED,
            newStatus: mission.status,
            timestamp: new Date().toISOString(),
            actor: mission.lastUpdatedBy,
            optimistic: false,
          };
          missionEventEmitter.emit(stateEvent);
        }
      };

      this.log('✅ Cross-tab sync initialized');
    } catch (err) {
      console.error('Failed to init cross-tab sync:', err);
    }
  }

  /**
   * Broadcast mission state change to other tabs
   */
  broadcastStateChange(mission: MissionState): void {
    try {
      if (!this.channel) return;

      this.channel.postMessage({
        type: 'MISSION_STATE_CHANGED',
        mission,
        timestamp: new Date().toISOString(),
      });

      this.log('📤 Broadcasted to other tabs');
    } catch (err) {
      console.error('Broadcast error:', err);
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.channel) {
      this.channel.close();
      this.log('🔌 Closed broadcast channel');
    }
  }

  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[CrossTabSync]', ...args);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════

export { MissionRealtimeSyncManager };

// Singleton instances
let singletonRealtimeManager: MissionRealtimeSyncManager | null = null;
let singletonMultiManager: MultiMissionRealtimeSyncManager | null = null;
let singletonCrossTab: CrossTabMissionSync | null = null;

export function getRealtimeSyncManager(config: RealtimeSyncConfig): MissionRealtimeSyncManager {
  if (!singletonRealtimeManager) {
    singletonRealtimeManager = new MissionRealtimeSyncManager(config);
  }
  return singletonRealtimeManager;
}

export function getMultiMissionManager(): MultiMissionRealtimeSyncManager {
  if (!singletonMultiManager) {
    singletonMultiManager = new MultiMissionRealtimeSyncManager(false);
  }
  return singletonMultiManager;
}

export function getCrossTabSync(): CrossTabMissionSync {
  if (!singletonCrossTab) {
    singletonCrossTab = new CrossTabMissionSync(false);
    singletonCrossTab.init();
  }
  return singletonCrossTab;
}

export default {
  MissionRealtimeSyncManager,
  MultiMissionRealtimeSyncManager,
  CrossTabMissionSync,
};
