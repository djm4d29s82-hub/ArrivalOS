/**
 * PHASE 2A.2 — useMissionState Hook (Frontend Integration)
 * 
 * React Hook für Mission State Management mit:
 * - Realtime Sync (Supabase / WebSocket ready)
 * - Optimistic Updates
 * - Event Subscriptions
 * - Server Reconciliation
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { notify } from './notify';
import {
  MissionStatus,
  MissionState,
  MissionStateEvent,
  transitionMissionState,
  reportMissionIssue,
  optimisticUpdateMissionState,
  validateMissionState,
  canTransition,
  canReportIssue,
  missionEventEmitter,
  IssueServerity,
  getStatusLabel,
} from './missionStateMachine';

/**
 * Hook result interface
 */
export interface UseMissionStateResult {
  mission: MissionState | null;
  loading: boolean;
  error: Error | null;
  
  // State actions
  transitionTo: (nextStatus: MissionStatus) => Promise<void>;
  reportIssue: (severity: IssueServerity, message: string) => Promise<void>;
  
  // State queries
  canTransitionTo: (nextStatus: MissionStatus) => boolean;
  canReportIssueNow: () => boolean;
  isTerminal: () => boolean;
  
  // Metadata
  isDirty: boolean; // Has unsync'd optimistic updates (pending sync)
  lastSyncTime: string | null;
  isSyncing: boolean;
  isOnline: boolean; // Network status, drives offline/pending UI
}

/**
 * useMissionState Hook
 * 
 * Usage:
 * const { mission, transitionTo, reportIssue, canTransitionTo } = useMissionState(missionId);
 * 
 * await transitionTo(MissionStatus.ON_THE_WAY);
 * await reportIssue(IssueServerity.WARNING, 'Traffic delay');
 */
export function useMissionState(missionId: string, userEmail: string): UseMissionStateResult {
  const [mission, setMission] = useState<MissionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Holds an optimistic transition that hasn't reached the server yet (offline/flaky network).
  const pendingRef = useRef<{ update: { id: string; patch: any }; log: any } | null>(null);

  // ═══════════════════════════════════════════════
  // LOAD INITIAL STATE
  // ═══════════════════════════════════════════════

  const loadMission = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await base44.entities.Mission.get(missionId);
      
      if (!data) {
        throw new Error('Mission not found');
      }

      // Validate state integrity
      const validation = validateMissionState(data as MissionState);
      if (!validation.valid) {
        console.warn('Mission state validation warnings:', validation.errors);
      }

      setMission(data as MissionState);
      setLastSyncTime(new Date().toISOString());
      setIsDirty(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Failed to load mission:', error);
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  // Load on mount
  useEffect(() => {
    loadMission();
  }, [loadMission]);

  // ═══════════════════════════════════════════════
  // OFFLINE-FIRST: keep optimistic state, flush on reconnect
  // ═══════════════════════════════════════════════

  const flushPending = useCallback(async () => {
    const p = pendingRef.current;
    if (!p) return;
    try {
      setIsSyncing(true);
      await base44.entities.Mission.update(p.update.id, p.update.patch);
      try { await base44.entities.ActivityLog.create(p.log); } catch { /* log is best-effort */ }
      pendingRef.current = null;
      setIsDirty(false);
      setLastSyncTime(new Date().toISOString());
    } catch {
      // Still unreachable — keep the pending transition, retry on next reconnect.
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); flushPending(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [flushPending]);

  // ═══════════════════════════════════════════════
  // REALTIME SUBSCRIPTION (Supabase Realtime)
  // ═══════════════════════════════════════════════

  useEffect(() => {
    if (!mission) return;

    const handleRealtimeUpdate = async (payload: any) => {
      // When another client updates this mission, reload
      if (payload.new?.id === missionId) {
        console.log('[Realtime] Mission updated by another client:', payload.new);
        await loadMission();
      }
    };

    // Setup Supabase realtime subscription (if using Supabase)
    if (base44.raw?.supabaseClient) {
      try {
        const subscription = base44.raw.supabaseClient
          .channel(`mission:${missionId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'missions',
              filter: `id=eq.${missionId}`,
            },
            handleRealtimeUpdate
          )
          .subscribe();

        return () => {
          base44.raw.supabaseClient?.removeChannel(subscription);
        };
      } catch (err) {
        console.error('Failed to setup realtime subscription:', err);
      }
    }
  }, [missionId, mission, loadMission]);

  // ═══════════════════════════════════════════════
  // EVENT SUBSCRIPTION
  // ═══════════════════════════════════════════════

  useEffect(() => {
    const handleEvent = (event: MissionStateEvent) => {
      if (event.missionId !== missionId) return;

      console.log('[MissionState Event]', event);

      // If optimistic update, mark as dirty
      if (event.optimistic) {
        setIsDirty(true);
      }

      // Debounce server sync after event
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        syncMissionState();
      }, 500); // Wait 500ms before syncing to batch updates
    };

    // Subscribe to all mission state events
    const unsubscribe1 = missionEventEmitter.on('MISSION_STATUS_CHANGED', handleEvent);
    const unsubscribe2 = missionEventEmitter.on('MISSION_ISSUE_REPORTED', handleEvent);
    const unsubscribe3 = missionEventEmitter.on('MISSION_OPTIMISTIC_UPDATE', handleEvent);

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [missionId]);

  // ═══════════════════════════════════════════════
  // STATE ACTIONS
  // ═══════════════════════════════════════════════

  const syncMissionState = useCallback(async () => {
    if (!mission || !isDirty) return;

    try {
      setIsSyncing(true);
      
      // Push local state to server
      await base44.entities.Mission.update(mission.id, {
        status: mission.status,
        greeter_stage: mission.greeter_stage,
        has_issue: mission.has_issue,
        issue_severity: mission.issue_severity,
        issue_message: mission.issue_message,
        last_status_change: mission.last_status_change,
        last_updated_by: mission.last_updated_by,
      });

      setIsDirty(false);
      setLastSyncTime(new Date().toISOString());
      console.log('[Sync] Mission state synced to server');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('[Sync Error]', error);
      // Keep isDirty flag so retry will happen
    } finally {
      setIsSyncing(false);
    }
  }, [mission, isDirty]);

  const transitionTo = useCallback(
    async (nextStatus: MissionStatus) => {
      if (!mission) throw new Error('Mission not loaded');

      // Validate BEFORE the optimistic update — a real logic error must surface (and not stick).
      if (!canTransition(mission.status, nextStatus)) {
        throw new Error(`Cannot transition from ${mission.status} to ${nextStatus}`);
      }

      // Optimistic update (instant UI feedback) — stays put even if the network is down.
      const prevStatus = mission.status;
      const newMission = transitionMissionState(mission, nextStatus, userEmail);
      setMission(newMission);
      setIsDirty(true);

      const update = {
        id: mission.id,
        patch: {
          status: newMission.status,
          greeter_stage: newMission.greeter_stage,
          last_status_change: newMission.last_status_change,
          last_updated_by: newMission.last_updated_by,
        },
      };
      const log = {
        entity_type: 'Mission',
        entity_id: mission.id,
        action: `mission.${nextStatus}`,
        old_value: prevStatus,
        new_value: nextStatus,
        created_by: userEmail,
        description: `Status: ${getStatusLabel(prevStatus)} → ${getStatusLabel(nextStatus)}`,
        timestamp: new Date().toISOString(),
      };

      // Offline: hold the transition and flush it automatically on reconnect. No rollback.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        pendingRef.current = { update, log };
        return;
      }

      // Online: persist now. On network failure, keep the optimistic state and queue for reconnect
      // (no rollback, no error toast — the greeter keeps their progress; UI shows "pending").
      try {
        await base44.entities.Mission.update(update.id, update.patch);
        // The Mission.update IS the state change — clear dirty as soon as it lands. The activity
        // log is best-effort (Supabase already logs status changes via a DB trigger; a failing log
        // insert, e.g. under hardened RLS, must NOT keep the UI stuck on "wird synchronisiert").
        pendingRef.current = null;
        setIsDirty(false);
        setLastSyncTime(new Date().toISOString());
        try { await base44.entities.ActivityLog.create(log); } catch { /* log is best-effort */ }
      } catch {
        pendingRef.current = { update, log };
      }
    },
    [mission, userEmail]
  );

  const reportIssue = useCallback(
    async (severity: IssueServerity, message: string) => {
      if (!mission) throw new Error('Mission not loaded');

      try {
        // 1. Optimistic update
        const optimisticMission = reportMissionIssue(
          mission,
          severity,
          message,
          userEmail
        );
        setMission(optimisticMission);
        setIsDirty(true);

        // 2. Persist to server
        await base44.entities.Mission.update(mission.id, {
          status: MissionStatus.ISSUE_REPORTED,
          has_issue: true,
          issue_severity: severity,
          issue_message: message,
          last_status_change: optimisticMission.last_status_change,
          last_updated_by: userEmail,
        });

        // 3. Log event
        await base44.entities.ActivityLog.create({
          entity_type: 'Mission',
          entity_id: mission.id,
          action: 'mission.issue_reported',
          old_value: mission.status,
          new_value: MissionStatus.ISSUE_REPORTED,
          created_by: userEmail,
          description: `[${severity.toUpperCase()}] ${message}`,
          timestamp: new Date().toISOString(),
        });

        // 4. Create notification for admins (über den sanktionierten RPC-Pfad — Audit S8)
        await notify({
          userEmail: 'admin@neuland.de',
          title: `Mission Issue: ${mission.title}`,
          message: message,
          type: 'alert',
          link: `/admin/missions/${mission.id}`,
          missionId: mission.id,
        });

        setIsDirty(false);
        setLastSyncTime(new Date().toISOString());
      } catch (err) {
        // Rollback optimistic update on error
        await loadMission();
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    [mission, userEmail, loadMission]
  );

  // ═══════════════════════════════════════════════
  // STATE QUERIES
  // ═══════════════════════════════════════════════

  const canTransitionTo = useCallback(
    (nextStatus: MissionStatus): boolean => {
      if (!mission) return false;
      return canTransition(mission.status, nextStatus);
    },
    [mission]
  );

  const canReportIssueNow = useCallback((): boolean => {
    if (!mission) return false;
    return canReportIssue(mission.status);
  }, [mission]);

  const isTerminal = useCallback((): boolean => {
    if (!mission) return false;
    return (
      mission.status === MissionStatus.COMPLETED ||
      mission.status === MissionStatus.CANCELLED
    );
  }, [mission]);

  // ═══════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    mission,
    loading,
    error,
    transitionTo,
    reportIssue,
    canTransitionTo,
    canReportIssueNow,
    isTerminal,
    isDirty,
    lastSyncTime,
    isSyncing,
    isOnline,
  };
}

export default useMissionState;
