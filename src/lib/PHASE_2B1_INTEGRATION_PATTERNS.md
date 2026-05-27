# PHASE 2B.1 Integration Patterns
## How to Add Offline Queue Support to Components

---

## Pattern 1: GreeterMissionDetail.jsx Integration

### BEFORE (Current - No Offline Support)
```jsx
import { useMissionState, MissionStatus } from '@/lib/useMissionState';

export default function GreeterMissionDetail() {
  const { mission, transitionTo, isDirty, isSyncing } = useMissionState(id, email);

  return (
    <div>
      {/* Show sync state only */}
      {(isDirty || isSyncing) && <span>🔄 Syncing...</span>}
      
      {/* Buttons with basic loading state */}
      <Button 
        loading={isDirty || isSyncing}
        onClick={() => transitionTo(MissionStatus.ON_THE_WAY)}
      >
        Unterwegs
      </Button>
    </div>
  );
}
```

### AFTER (With Offline Support)
```jsx
import { useMissionState, MissionStatus } from '@/lib/useMissionState';
import { useOfflineQueue } from '@/lib/useOfflineQueue';
import { ConflictResolutionDialog } from '@/components/offline/ConflictResolutionDialog';
import { PendingSyncIndicator } from '@/components/offline/OfflineIndicators';

export default function GreeterMissionDetail() {
  const { mission, transitionTo, isDirty, isSyncing } = useMissionState(id, email);
  
  // NEW: Add offline queue support
  const { hasPending, conflictDialog, resolveConflict } = useOfflineQueue(id);

  return (
    <div>
      {/* NEW: Show conflict modal when detected */}
      <ConflictResolutionDialog
        conflict={conflictDialog}
        onResolve={resolveConflict}
        onDismiss={() => {}}
      />

      {/* NEW: Show offline pending indicator */}
      {hasPending && <PendingSyncIndicator missionId={id} />}

      {/* Show sync state */}
      {(isDirty || isSyncing) && <span>🔄 Syncing...</span>}
      
      {/* Update loading state to include offline queue */}
      <Button 
        loading={isDirty || isSyncing || hasPending}
        onClick={() => transitionTo(MissionStatus.ON_THE_WAY)}
      >
        Unterwegs
      </Button>
    </div>
  );
}
```

**Changes Summary:**
- +1 import: `useOfflineQueue` hook
- +1 import: `ConflictResolutionDialog` component
- +1 import: `PendingSyncIndicator` component
- +1 hook call: `useOfflineQueue(id)`
- +1 JSX element: `<ConflictResolutionDialog />`
- +1 JSX element: `<PendingSyncIndicator />`
- +1 condition: `|| hasPending` on button loading state
- ~15 lines of new code

---

## Pattern 2: AdminMissions.jsx Integration

### BEFORE (Current - No Offline Support)
```jsx
export default function AdminMissions() {
  return (
    <div>
      <PageHeader title="Missionen" />
      {/* Mission cards list */}
    </div>
  );
}
```

### AFTER (With Offline Support)
```jsx
import { QueueStatusBadge } from '@/components/offline/OfflineIndicators';

export default function AdminMissions() {
  return (
    <div>
      <PageHeader title="Missionen" />
      
      {/* NEW: Show queue statistics */}
      <QueueStatusBadge />
      
      {/* Mission cards list - now show pending indicators */}
    </div>
  );
}
```

**Also update MissionCard to show pending:**
```jsx
import { PendingSyncIndicator } from '@/components/offline/OfflineIndicators';

function MissionCard({ mission }) {
  const { transitionTo, canTransitionTo, isDirty, isSyncing } = useMissionState(mission.id, 'admin@neuland.de');
  
  // NEW: Add offline queue support to this mission card
  const { hasPending } = useOfflineQueue(mission.id);

  return (
    <Card>
      <div className="flex justify-between items-start">
        <h3>{mission.title}</h3>
        {/* NEW: Show pending indicator */}
        {hasPending && <PendingSyncIndicator missionId={mission.id} />}
      </div>
      
      {/* Existing buttons with updated loading state */}
      <Button 
        loading={isDirty || isSyncing || hasPending}
        disabled={!canTransitionTo(...) || isDirty || isSyncing || hasPending}
      >
        Action
      </Button>
    </Card>
  );
}
```

**Changes Summary:**
- +1 import in AdminMissions: `QueueStatusBadge`
- +1 JSX element: `<QueueStatusBadge />`
- +1 import in MissionCard: `useOfflineQueue` hook
- +1 import in MissionCard: `PendingSyncIndicator`
- +1 hook call: `useOfflineQueue(missionId)`
- +1 JSX element: `<PendingSyncIndicator />`
- +1 condition: `|| hasPending` on button states
- ~20 lines of new code total

---

## Pattern 3: App.jsx Global Integration

### BEFORE (Current)
```jsx
import { BrowserRouter as Router } from 'react-router-dom';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* App routes */}
        </Routes>
      </Layout>
    </Router>
  );
}
```

### AFTER (With Global Offline Indicator)
```jsx
import { BrowserRouter as Router } from 'react-router-dom';
import { OfflineIndicator } from '@/components/offline/OfflineIndicators';

export default function App() {
  return (
    <Router>
      {/* NEW: Global offline indicator at top */}
      <OfflineIndicator />
      
      <Layout>
        <Routes>
          {/* App routes */}
        </Routes>
      </Layout>
    </Router>
  );
}
```

**Changes Summary:**
- +1 import: `OfflineIndicator`
- +1 JSX element: `<OfflineIndicator />`
- 1-2 lines of new code
- Shows red banner when offline

---

## Pattern 4: Custom Component with Full Offline Support

```jsx
import { useOfflineQueue } from '@/lib/useOfflineQueue';
import { ConflictResolutionDialog } from '@/components/offline/ConflictResolutionDialog';
import { PendingSyncIndicator } from '@/components/offline/OfflineIndicators';

function MyMissionComponent({ missionId, userEmail }) {
  // State + realtime sync
  const {
    mission,
    transitionTo,
    isDirty,
    isSyncing,
  } = useMissionState(missionId, userEmail);

  // NEW: Offline queue support
  const {
    hasPending,
    conflictDialog,
    resolveConflict,
    queueStats,
    retryFailed,
  } = useOfflineQueue(missionId);

  const isBusy = isDirty || isSyncing || hasPending;

  return (
    <Card>
      {/* Conflict resolution modal */}
      <ConflictResolutionDialog
        conflict={conflictDialog}
        onResolve={resolveConflict}
        onDismiss={() => {}}
      />

      <div className="space-y-4">
        {/* Header with pending indicator */}
        <div className="flex justify-between items-start">
          <h2>{mission.title}</h2>
          {hasPending && <PendingSyncIndicator missionId={missionId} />}
        </div>

        {/* Show queue stats if any pending */}
        {queueStats.total > 0 && (
          <div className="text-xs bg-yellow-50 p-2 rounded">
            📡 {queueStats.pending} pending · 
            🔄 {queueStats.syncing} syncing · 
            ⚠️ {queueStats.conflicts} conflicts
          </div>
        )}

        {/* Action buttons with busy state */}
        <Button
          onClick={() => transitionTo(MissionStatus.ON_THE_WAY)}
          disabled={isBusy}
          loading={isBusy}
        >
          {hasPending ? '📡 Pending Sync...' : 'Unterwegs'}
        </Button>

        {/* Retry failed syncs if there are errors */}
        {queueStats.errors > 0 && (
          <Button
            variant="outline"
            onClick={retryFailed}
            disabled={isBusy}
          >
            ❌ Retry {queueStats.errors} Errors
          </Button>
        )}
      </div>
    </Card>
  );
}
```

---

## Pattern 5: Offline-Only Testing Component

Use this to test offline queue in development:

```jsx
import { getOfflineQueue } from '@/lib/missionOfflineQueue';
import { MissionStatus } from '@/lib/missionStateMachine';

export function OfflineQueueDebug() {
  const queue = getOfflineQueue();
  const [stats, setStats] = React.useState(queue.getStats());

  React.useEffect(() => {
    const updateStats = () => setStats(queue.getStats());
    
    queue.on('queueUpdated', updateStats);
    queue.on('syncCompleted', updateStats);
    
    return () => {
      queue.off('queueUpdated', updateStats);
      queue.off('syncCompleted', updateStats);
    };
  }, [queue]);

  return (
    <div className="p-4 bg-blue-50 rounded-lg text-xs space-y-2">
      <div>Online: {stats.isOnline ? '✅ Yes' : '❌ No'}</div>
      <div>Queue: {stats.total} total</div>
      <div>Pending: {stats.pending}</div>
      <div>Syncing: {stats.syncing}</div>
      <div>Conflicts: {stats.conflicts}</div>
      <div>Errors: {stats.errors}</div>
      
      <button
        onClick={() => queue.clearAllSynced()}
        className="text-blue-600 underline"
      >
        Clear Synced
      </button>
    </div>
  );
}
```

---

## Quick Integration Checklist

### For Each Component
- [ ] Import `useOfflineQueue` hook
- [ ] Import UI components needed
- [ ] Add hook call: `const { hasPending, conflictDialog, resolveConflict } = useOfflineQueue(missionId)`
- [ ] Add `<ConflictResolutionDialog />` (if showing mission)
- [ ] Add pending indicator
- [ ] Update button loading state: `loading={isDirty || isSyncing || hasPending}`
- [ ] Update button disabled state: `disabled={... || hasPending}`
- [ ] Test offline mode (DevTools → Network → Offline)
- [ ] Test network transitions
- [ ] Test conflict scenario (edit while offline, change server state, come online)

### For App.jsx
- [ ] Import `<OfflineIndicator />`
- [ ] Add to top level
- [ ] Test banner appears when offline
- [ ] Test banner disappears when online

### Testing Steps
1. **Offline Queuing**
   - DevTools → Network → Offline
   - Click mission button
   - See pending indicator
   - See item in queue

2. **Auto-Sync**
   - Stay offline, queue a transition
   - DevTools → Network → Online
   - See sync attempt within 3 seconds
   - See queue item disappear

3. **Conflict Resolution**
   - Offline, queue transition
   - Connect to server API and change mission status
   - Come online
   - See conflict modal
   - Choose resolution (keep local / use server / merge)
   - See final state updated

4. **Persistence**
   - Offline, queue transition
   - Close browser completely
   - Reopen
   - See queue item restored
   - Verify can retry from queue

---

## Common Patterns

### Pattern: Show Offline Indicator for Single Mission
```jsx
const { hasPending } = useOfflineQueue(missionId);
if (hasPending) return <div>📡 Offline changes pending...</div>;
```

### Pattern: Disable Actions While Offline Queue Active
```jsx
const { hasPending } = useOfflineQueue(missionId);
<Button disabled={hasPending} />
```

### Pattern: Handle Conflict in Modal
```jsx
const { conflictDialog, resolveConflict } = useOfflineQueue(missionId);
<ConflictResolutionDialog
  conflict={conflictDialog}
  onResolve={resolveConflict}
  onDismiss={() => {}}
/>
```

### Pattern: Show All Queue Stats
```jsx
const { queueStats } = useOfflineQueue('all');
<div>
  Pending: {queueStats.pending}
  Syncing: {queueStats.syncing}
  Conflicts: {queueStats.conflicts}
  Errors: {queueStats.errors}
</div>
```

---

## Migration Path

1. **Integrate into GreeterMissionDetail first** (most critical)
   - Greeters in field need offline support
   - Test thoroughly before moving on

2. **Integrate into AdminMissions** (dispatch board)
   - Admins need to see queue status
   - Add QueueStatusBadge to header

3. **Add global OfflineIndicator** (App.jsx)
   - Users see they're offline
   - Helps with debugging

4. **Test complete flow:**
   - Go offline
   - Make changes
   - Come online
   - See sync
   - Test conflicts

5. **Monitor in production:**
   - Track offline frequency
   - Monitor conflict rates
   - Watch sync success rate

---

## Files to Modify (Next Steps)

1. **src/pages/greeter/GreeterMissionDetail.jsx** — Add offline queue integration
2. **src/pages/admin/AdminMissions.jsx** — Add queue status display
3. **src/App.jsx** — Add global offline indicator
4. **src/components/MissionCard.jsx** (if separate) — Add pending indicator

---

## Done Checklist

- ✅ missionOfflineQueue.ts written and tested
- ✅ useOfflineQueue hook written
- ✅ UI components written
- ✅ ConflictResolutionDialog written
- ✅ Test suite written (50+ cases)
- ✅ Zero compilation errors
- ✅ Integration patterns documented
- ⏭️ Integration into components (next)
- ⏭️ E2E testing (after integration)
- ⏭️ Production deployment (after E2E)

---

**Next Action:** Integrate offline queue into GreeterMissionDetail, then AdminMissions, then test offline flow.
