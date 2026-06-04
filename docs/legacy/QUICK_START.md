/**
 * QUICK START: Using useMissionState Hook
 * 
 * Copy-paste ready examples for integration
 */

// ═══════════════════════════════════════════════════════════════════════
// EXAMPLE 1: GreeterMissionDetail Integration
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useMissionState, MissionStatus, IssueServerity } from '@/lib/useMissionState';
import { useToast } from '@/components/ui/use-toast';

export default function GreeterMissionDetailIntegrated() {
  const { missionId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ✅ ONE LINE replaces all manual state management
  const {
    mission,
    loading,
    error,
    transitionTo,
    reportIssue,
    canTransitionTo,
    canReportIssueNow,
    isDirty,
    isSyncing,
  } = useMissionState(missionId, user?.email || '');

  // ─────────────────────────────────────────────────────────────────────

  // Handlers are now simple - no manual state updates needed
  const handleAccept = async () => {
    try {
      await transitionTo(MissionStatus.ACCEPTED);
      toast({ title: '✅ Einsatz angenommen' });
    } catch (err) {
      const error = err as Error;
      toast({ title: '❌ Fehler', description: error.message, variant: 'destructive' });
    }
  };

  const handleReportTraffic = async () => {
    try {
      await reportIssue(IssueServerity.WARNING, 'Traffic delay - ETA +15 minutes');
      toast({ title: '✅ Issue gemeldet' });
    } catch (err) {
      const error = err as Error;
      toast({ title: '❌ Fehler', description: error.message, variant: 'destructive' });
    }
  };

  // ─────────────────────────────────────────────────────────────────────

  if (loading) return <div className="p-4">Lade Mission...</div>;
  if (error) return <div className="p-4 text-red-600">Fehler: {error.message}</div>;
  if (!mission) return <div className="p-4">Mission nicht gefunden</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* HEADER */}
      <div className="bg-white rounded-lg border p-4">
        <h1 className="text-2xl font-bold">{mission.title}</h1>
        <p className="text-sm text-gray-600">
          {mission.location} • {mission.city}
        </p>
      </div>

      {/* STATUS TIMELINE */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-sm font-semibold">Status:</div>
          <div className="text-sm font-mono bg-blue-100 px-2 py-1 rounded">
            {mission.status}
          </div>
          {isDirty && <div className="text-xs text-amber-600">⏳ Syncing...</div>}
        </div>

        {/* BUTTONS - Only show valid next states */}
        <div className="flex flex-wrap gap-2">
          {canTransitionTo(MissionStatus.ACCEPTED) && (
            <button
              onClick={handleAccept}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={isDirty || isSyncing}
            >
              Annehmen
            </button>
          )}

          {canTransitionTo(MissionStatus.ON_THE_WAY) && (
            <button
              onClick={() => transitionTo(MissionStatus.ON_THE_WAY)}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50"
              disabled={isDirty || isSyncing}
            >
              Unterwegs
            </button>
          )}

          {canTransitionTo(MissionStatus.ARRIVED) && (
            <button
              onClick={() => transitionTo(MissionStatus.ARRIVED)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              disabled={isDirty || isSyncing}
            >
              Angekommen
            </button>
          )}

          {canTransitionTo(MissionStatus.COMPLETED) && (
            <button
              onClick={() => transitionTo(MissionStatus.COMPLETED)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              disabled={isDirty || isSyncing}
            >
              Fertig
            </button>
          )}
        </div>
      </div>

      {/* ISSUE REPORTING */}
      {canReportIssueNow() && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="font-semibold text-red-900 mb-3">Problem melden?</div>
          <button
            onClick={handleReportTraffic}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            🚨 Issue melden
          </button>
        </div>
      )}

      {/* ISSUE DISPLAY */}
      {mission.has_issue && (
        <div className="bg-red-100 border-l-4 border-red-600 p-4 rounded">
          <div className="font-semibold text-red-800">[{mission.issue_severity?.toUpperCase()}]</div>
          <div className="text-red-700">{mission.issue_message}</div>
        </div>
      )}

      {/* MISSION DETAILS */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold mb-3">Details</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Talent:</span>
            <span className="font-medium">{mission.candidate_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Greeter:</span>
            <span className="font-medium">{mission.greeter_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Firma:</span>
            <span className="font-medium">{mission.company_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Zeit:</span>
            <span className="font-medium">{new Date(mission.datetime).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EXAMPLE 2: AdminMissions - Dispatch View
// ═══════════════════════════════════════════════════════════════════════

export function AdminMissionsIntegrated() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // In a real app, load all missions from API
  useEffect(() => {
    const loadMissions = async () => {
      // const data = await base44.entities.Mission.list();
      // setMissions(data);
      setLoading(false);
    };
    loadMissions();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Einsätze verwalten</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {missions.map((mission) => (
          <MissionDispatchCard key={mission.id} mission={mission} />
        ))}
      </div>
    </div>
  );
}

// Sub-component for each mission
function MissionDispatchCard({ mission }: { mission: any }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const { transitionTo, canTransitionTo } = useMissionState(mission.id, user?.email || '');

  const handleQuickTransition = async (status: MissionStatus) => {
    try {
      await transitionTo(status);
      toast({ title: '✅ Status aktualisiert' });
    } catch (err) {
      const error = err as Error;
      toast({ title: '❌ Fehler', description: error.message, variant: 'destructive' });
    }
  };

  const statusColors = {
    [MissionStatus.ASSIGNED]: 'bg-blue-50',
    [MissionStatus.ACCEPTED]: 'bg-blue-50',
    [MissionStatus.ON_THE_WAY]: 'bg-amber-50',
    [MissionStatus.ARRIVED]: 'bg-green-50',
    [MissionStatus.COMPLETED]: 'bg-gray-50',
  };

  return (
    <div className={`${statusColors[mission.status] || 'bg-white'} border rounded-lg p-4`}>
      <div className="font-semibold mb-2">{mission.title}</div>
      <div className="text-sm text-gray-600 mb-3">
        {mission.greeter_id} → {mission.candidate_id}
      </div>

      {/* Quick action buttons */}
      <div className="flex gap-2">
        {canTransitionTo(MissionStatus.ON_THE_WAY) && (
          <button
            onClick={() => handleQuickTransition(MissionStatus.ON_THE_WAY)}
            className="flex-1 bg-amber-600 text-white text-sm py-1 rounded hover:bg-amber-700"
          >
            Unterwegs
          </button>
        )}
        {canTransitionTo(MissionStatus.COMPLETED) && (
          <button
            onClick={() => handleQuickTransition(MissionStatus.COMPLETED)}
            className="flex-1 bg-green-600 text-white text-sm py-1 rounded hover:bg-green-700"
          >
            Fertig
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EXAMPLE 3: Custom Hook - Mission Event Logger
// ═══════════════════════════════════════════════════════════════════════

import { missionEventEmitter, MissionStateEvent } from '@/lib/missionStateMachine';

export function useMissionEventLogger() {
  useEffect(() => {
    // Log all mission state changes
    const unsubscribe = missionEventEmitter.on('MISSION_STATUS_CHANGED', (event: MissionStateEvent) => {
      console.log(`
        🔄 Mission Update
        Mission ID: ${event.missionId}
        Status: ${event.oldStatus} → ${event.newStatus}
        Changed by: ${event.actor}
        Time: ${new Date(event.timestamp).toLocaleTimeString()}
      `);
    });

    return unsubscribe;
  }, []);
}

// Usage in any component:
// useMissionEventLogger(); // Logs all mission changes to console

// ═══════════════════════════════════════════════════════════════════════
// EXAMPLE 4: Context Provider - Global Mission State
// ═══════════════════════════════════════════════════════════════════════

import { createContext, useContext } from 'react';

const MissionContext = createContext<any>(null);

export function MissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // You can provide global mission state here if needed
  // For now, just pass through the hook for child components

  return (
    <MissionContext.Provider value={{ user }}>
      {children}
    </MissionContext.Provider>
  );
}

export function useMissionContext() {
  return useContext(MissionContext);
}

// ═══════════════════════════════════════════════════════════════════════
// INTEGRATION STEPS (COPY-PASTE CHECKLIST)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Step 1: Update Component Imports
 * OLD: import { transitionMission, acceptMission } from '@/lib/missionEngine';
 * NEW: import { useMissionState, MissionStatus } from '@/lib/useMissionState';
 * 
 * Step 2: Replace State Management
 * OLD:
 *   const [mission, setMission] = useState(null);
 *   useEffect(() => { loadMission(); }, []);
 *   const handleAccept = async () => { await api.accept(); setMission(...); };
 * 
 * NEW:
 *   const { mission, transitionTo, canTransitionTo } = useMissionState(id, email);
 *   const handleAccept = async () => { await transitionTo(MissionStatus.ACCEPTED); };
 * 
 * Step 3: Update JSX
 * OLD:
 *   <button onClick={handleAccept}>Accept</button>
 * 
 * NEW:
 *   <button disabled={!canTransitionTo(MissionStatus.ACCEPTED)} onClick={handleAccept}>
 *     Accept
 *   </button>
 * 
 * Step 4: Test
 * - npm test missionStateMachine.test.ts
 * - Open two browser windows
 * - Change status in one, verify other updates in <500ms
 * 
 * Step 5: Deploy
 * - Vercel/Netlify auto-deploys on push
 * - Monitor websocket connections in browser DevTools
 * - Check "Network" tab for realtime messages
 */

console.log('✅ Quick Start Guide Ready');
