/**
 * PHASE 2A.2 — Integration Guide
 * 
 * Wie man die Mission State Machine in bestehenden Components nutzt
 * Schritt-für-Schritt Migration von altem missionEngine.js zu neuem System
 */

// ═════════════════════════════════════════════════════════════════════════
// BEFORE: Altes System (missionEngine.js)
// ═════════════════════════════════════════════════════════════════════════

// OLD PATTERN (DO NOT USE ANYMORE):
// ```
// import { transitionMission, acceptMission, sendETA } from '@/lib/missionEngine';
//
// const onAccept = async () => {
//   try {
//     await acceptMission(mission.id, profile, user.email);
//     toast({ title: 'Einsatz angenommen' });
//     await load(); // Manual reload
//   } catch (e) {
//     toast({ title: 'Fehler', description: e.message });
//   }
// };
// ```
//
// PROBLEMS:
// ❌ Manual state management
// ❌ No optimistic updates
// ❌ Requires manual reload
// ❌ No event system for realtime sync
// ❌ No validation of state transitions

// ═════════════════════════════════════════════════════════════════════════
// AFTER: Neues System (useMissionState Hook)
// ═════════════════════════════════════════════════════════════════════════

// NEW PATTERN (USE THIS):
// ```
// import { useMissionState, MissionStatus } from '@/lib/useMissionState';
//
// export default function GreeterMissionDetail() {
//   const { user } = useAuth();
//   const { mission, transitionTo, reportIssue, canTransitionTo } = useMissionState(
//     missionId,
//     user.email
//   );
//
//   const onAccept = async () => {
//     try {
//       await transitionTo(MissionStatus.ACCEPTED);
//       toast({ title: 'Einsatz angenommen' });
//       // UI updates automatically via mission state
//     } catch (err) {
//       toast({ title: 'Fehler', description: err.message });
//     }
//   };
//
//   const onSendIssue = async () => {
//     try {
//       await reportIssue(IssueServerity.WARNING, 'Traffic delay');
//       toast({ title: 'Issue gemeldet' });
//     } catch (err) {
//       toast({ title: 'Fehler', description: err.message });
//     }
//   };
//
//   return (
//     <div>
//       <div>Status: {mission?.status}</div>
//       <button
//         disabled={!canTransitionTo(MissionStatus.ON_THE_WAY)}
//         onClick={() => transitionTo(MissionStatus.ON_THE_WAY)}
//       >
//         Next
//       </button>
//       <button onClick={onSendIssue}>Report Issue</button>
//     </div>
//   );
// }
// ```
//
// BENEFITS:
// ✅ Automatic state management
// ✅ Optimistic updates (instant UI feedback)
// ✅ No manual reload needed
// ✅ Event-driven realtime sync
// ✅ Built-in validation
// ✅ Single source of truth

// ═════════════════════════════════════════════════════════════════════════
// STEP-BY-STEP MIGRATION EXAMPLE
// ═════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useMissionState, MissionStatus, IssueServerity } from '@/lib/useMissionState';
import { useToast } from '@/components/ui/toaster';

/**
 * EXAMPLE 1: Simple Component Migration
 */
export function GreeterMissionDetailExample1({ missionId }: { missionId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Replace old manual state loading with this one-liner:
  const {
    mission,
    loading,
    error,
    transitionTo,
    canTransitionTo,
    isDirty,
  } = useMissionState(missionId, user.email);

  // No more manual useEffect to load mission!
  // No more useState for mission, loading, error!
  // All handled by the hook

  const handleTransition = async (nextStatus: MissionStatus) => {
    try {
      await transitionTo(nextStatus);
      toast({ title: 'Status aktualisiert' });
    } catch (err) {
      const error = err as Error;
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!mission) return <div>Not found</div>;

  return (
    <div>
      <h1>{mission.title}</h1>
      <div>Status: {mission.status}</div>

      {/* Button automatically validates based on current state */}
      <button
        disabled={!canTransitionTo(MissionStatus.ON_THE_WAY)}
        onClick={() => handleTransition(MissionStatus.ON_THE_WAY)}
      >
        Go to ON_THE_WAY
      </button>

      {/* Show dirty indicator for unsync'd optimistic updates */}
      {isDirty && <span>⏳ Syncing...</span>}
    </div>
  );
}

/**
 * EXAMPLE 2: Full Workflow with All Actions
 */
export function GreeterMissionDetailExample2({ missionId }: { missionId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    mission,
    loading,
    error,
    transitionTo,
    reportIssue,
    canTransitionTo,
    canReportIssueNow,
    isTerminal,
    isDirty,
    isSyncing,
    lastSyncTime,
  } = useMissionState(missionId, user.email);

  if (loading) return <div>Loading...</div>;
  if (!mission) return <div>Not found</div>;

  const handleTransition = async (nextStatus: MissionStatus) => {
    try {
      await transitionTo(nextStatus);
      toast({ title: '✓ Status aktualisiert' });
    } catch (err) {
      const error = err as Error;
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    }
  };

  const handleReportIssue = async (severity: IssueServerity, message: string) => {
    try {
      await reportIssue(severity, message);
      toast({ title: '✓ Issue gemeldet' });
    } catch (err) {
      const error = err as Error;
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1>{mission.title}</h1>
        <p>Status: {mission.status}</p>
        <p>Greeter: {mission.greeter_id}</p>
      </div>

      {/* Workflow Actions */}
      <div className="flex gap-2">
        {canTransitionTo(MissionStatus.ACCEPTED) && (
          <button onClick={() => handleTransition(MissionStatus.ACCEPTED)}>
            Accept
          </button>
        )}

        {canTransitionTo(MissionStatus.ON_THE_WAY) && (
          <button onClick={() => handleTransition(MissionStatus.ON_THE_WAY)}>
            On The Way
          </button>
        )}

        {canTransitionTo(MissionStatus.ARRIVED) && (
          <button onClick={() => handleTransition(MissionStatus.ARRIVED)}>
            Arrived
          </button>
        )}

        {canTransitionTo(MissionStatus.MET_TALENT) && (
          <button onClick={() => handleTransition(MissionStatus.MET_TALENT)}>
            Met Talent
          </button>
        )}

        {canTransitionTo(MissionStatus.COMPLETED) && (
          <button onClick={() => handleTransition(MissionStatus.COMPLETED)}>
            Complete
          </button>
        )}
      </div>

      {/* Issue Reporting */}
      {canReportIssueNow() && (
        <button
          onClick={() => handleReportIssue(IssueServerity.WARNING, 'Traffic delay')}
        >
          Report Issue
        </button>
      )}

      {/* Status Indicators */}
      <div>
        {isTerminal() && <span>🏁 Mission finished</span>}
        {isDirty && <span>⏳ Syncing to server...</span>}
        {isSyncing && <span>🔄 Syncing...</span>}
        {lastSyncTime && <span>✓ Last sync: {lastSyncTime}</span>}
      </div>
    </div>
  );
}

/**
 * EXAMPLE 3: Event Subscription Pattern
 */
import { missionEventEmitter, MissionStateEvent } from '@/lib/missionStateMachine';

export function EventSubscriptionExample() {
  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = missionEventEmitter.on('MISSION_STATUS_CHANGED', (event: MissionStateEvent) => {
      console.log(`Mission ${event.missionId}: ${event.oldStatus} → ${event.newStatus}`);
      console.log(`Changed by: ${event.actor}`);
      console.log(`Time: ${event.timestamp}`);

      // Update external systems, analytics, etc.
    });

    // Cleanup
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Subscribe to issue reports
    const unsubscribe = missionEventEmitter.on('MISSION_ISSUE_REPORTED', (event: MissionStateEvent) => {
      console.log(`Issue on mission ${event.missionId}: ${event.issueMessage}`);
      console.log(`Severity: ${event.issueSeverity}`);

      // Notify admins, escalate, etc.
    });

    return unsubscribe;
  }, []);

  return <div>Listening to mission events...</div>;
}

/**
 * EXAMPLE 4: Testing Pattern
 */
import { MissionStatus, MissionState, transitionMissionState } from '@/lib/missionStateMachine';

export function TestingExample() {
  // Create mock mission
  const mockMission: MissionState = {
    id: 'test-mission',
    status: MissionStatus.ASSIGNED,
    greeter_stage: MissionStatus.ASSIGNED,
    has_issue: false,
    last_status_change: new Date().toISOString(),
    last_updated_by: 'test@neuland.de',
    datetime: new Date().toISOString(),
    location: 'Berlin',
    city: 'Berlin',
    title: 'Test',
  };

  // Test state machine directly (no UI needed)
  const accepted = transitionMissionState(mockMission, MissionStatus.ACCEPTED, 'test@neuland.de');
  console.assert(accepted.status === MissionStatus.ACCEPTED);

  const onTheWay = transitionMissionState(accepted, MissionStatus.ON_THE_WAY, 'test@neuland.de');
  console.assert(onTheWay.status === MissionStatus.ON_THE_WAY);

  // Test invalid transition
  try {
    transitionMissionState(mockMission, MissionStatus.COMPLETED, 'test@neuland.de');
    console.error('Should have thrown error');
  } catch (err) {
    console.log('✓ Correctly blocked invalid transition');
  }
}

// ═════════════════════════════════════════════════════════════════════════
// MIGRATION CHECKLIST
// ═════════════════════════════════════════════════════════════════════════

const MIGRATION_CHECKLIST = `
PHASE 2A.2 MIGRATION CHECKLIST
═══════════════════════════════════════════════

□ Replace all manual mission loading with useMissionState()
□ Remove manual useState for mission state
□ Remove manual useEffect for mission loading
□ Replace transitionMission() calls with transitionTo()
□ Replace reportMissionIssue() calls with reportIssue()
□ Add canTransitionTo() guards to buttons
□ Add canReportIssueNow() guards to issue buttons
□ Remove manual error handling (hook handles it)
□ Remove manual loading indicators (hook provides loading state)
□ Subscribe to mission events for analytics/logging
□ Test optimistic updates (isDirty flag)
□ Test realtime sync (watch lastSyncTime)
□ Run test suite: npm test missionStateMachine.test.ts

COMPONENTS TO MIGRATE:
- GreeterMissionDetail.jsx (HIGHEST PRIORITY)
- AdminMissions.jsx (for admin transitions)
- NotificationSystem (for event integration)
- Operations Center (for live updates)
`;

console.log(MIGRATION_CHECKLIST);

export default {
  GreeterMissionDetailExample1,
  GreeterMissionDetailExample2,
  EventSubscriptionExample,
  TestingExample,
};
