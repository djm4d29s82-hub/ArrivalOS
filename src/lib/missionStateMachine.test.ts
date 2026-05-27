/**
 * PHASE 2A.2 — Mission State Machine Test Suite
 * 
 * Comprehensive validation of:
 * - All state transitions
 * - Invalid transitions blocking
 * - Issue reporting from any state
 * - Terminal state handling
 * - Event emission
 * 
 * Run with: npm test missionStateMachine.test.ts
 */

import {
  MissionStatus,
  MissionState,
  canTransition,
  getValidNextStates,
  canReportIssue,
  isTerminalState,
  isOperationalState,
  transitionMissionState,
  reportMissionIssue,
  optimisticUpdateMissionState,
  validateMissionState,
  getMissionStateReport,
  missionEventEmitter,
  IssueServerity,
} from './missionStateMachine';

// ═══════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════

function createMockMission(status: MissionStatus = MissionStatus.ASSIGNED): MissionState {
  return {
    id: 'mission-123',
    status,
    greeter_stage: status,
    has_issue: false,
    last_status_change: new Date().toISOString(),
    last_updated_by: 'test@neuland.de',
    datetime: new Date().toISOString(),
    location: 'Berlin Airport Terminal 1',
    city: 'Berlin',
    title: 'Test Mission',
    candidate_id: 'candidate-123',
    greeter_id: 'greeter-123',
    company_id: 'company-123',
  };
}

// ═══════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════

describe('MissionStateMachine', () => {
  beforeEach(() => {
    missionEventEmitter.clear();
  });

  // ─────────────────────────────────────────────
  // VALID TRANSITIONS
  // ─────────────────────────────────────────────

  describe('Valid Transitions', () => {
    test('assigned → accepted', () => {
      expect(canTransition(MissionStatus.ASSIGNED, MissionStatus.ACCEPTED)).toBe(true);
    });

    test('accepted → on_the_way', () => {
      expect(canTransition(MissionStatus.ACCEPTED, MissionStatus.ON_THE_WAY)).toBe(true);
    });

    test('on_the_way → arrived', () => {
      expect(canTransition(MissionStatus.ON_THE_WAY, MissionStatus.ARRIVED)).toBe(true);
    });

    test('arrived → met_talent', () => {
      expect(canTransition(MissionStatus.ARRIVED, MissionStatus.MET_TALENT)).toBe(true);
    });

    test('met_talent → completed', () => {
      expect(canTransition(MissionStatus.MET_TALENT, MissionStatus.COMPLETED)).toBe(true);
    });

    test('any operational state → cancelled', () => {
      const operationalStates = [
        MissionStatus.ASSIGNED,
        MissionStatus.ACCEPTED,
        MissionStatus.ON_THE_WAY,
        MissionStatus.ARRIVED,
        MissionStatus.MET_TALENT,
      ];

      operationalStates.forEach((state) => {
        expect(canTransition(state, MissionStatus.CANCELLED)).toBe(true);
      });
    });
  });

  // ─────────────────────────────────────────────
  // INVALID TRANSITIONS
  // ─────────────────────────────────────────────

  describe('Invalid Transitions', () => {
    test('assigned → completed (skipping steps)', () => {
      expect(canTransition(MissionStatus.ASSIGNED, MissionStatus.COMPLETED)).toBe(false);
    });

    test('completed → accepted (terminal state)', () => {
      expect(canTransition(MissionStatus.COMPLETED, MissionStatus.ACCEPTED)).toBe(false);
    });

    test('cancelled → on_the_way (from terminal)', () => {
      expect(canTransition(MissionStatus.CANCELLED, MissionStatus.ON_THE_WAY)).toBe(false);
    });

    test('backward transition on_the_way → accepted', () => {
      expect(canTransition(MissionStatus.ON_THE_WAY, MissionStatus.ACCEPTED)).toBe(false);
    });

    test('no self-transition', () => {
      expect(canTransition(MissionStatus.ACCEPTED, MissionStatus.ACCEPTED)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // VALID NEXT STATES
  // ─────────────────────────────────────────────

  describe('Valid Next States', () => {
    test('from assigned', () => {
      const valid = getValidNextStates(MissionStatus.ASSIGNED);
      expect(valid).toEqual([MissionStatus.ACCEPTED, MissionStatus.CANCELLED]);
    });

    test('from on_the_way', () => {
      const valid = getValidNextStates(MissionStatus.ON_THE_WAY);
      expect(valid).toEqual([MissionStatus.ARRIVED, MissionStatus.CANCELLED]);
    });

    test('from completed (empty)', () => {
      const valid = getValidNextStates(MissionStatus.COMPLETED);
      expect(valid).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // ISSUE REPORTING
  // ─────────────────────────────────────────────

  describe('Issue Reporting', () => {
    test('can report issue from assigned', () => {
      expect(canReportIssue(MissionStatus.ASSIGNED)).toBe(true);
    });

    test('can report issue from on_the_way', () => {
      expect(canReportIssue(MissionStatus.ON_THE_WAY)).toBe(true);
    });

    test('can report issue from arrived', () => {
      expect(canReportIssue(MissionStatus.ARRIVED)).toBe(true);
    });

    test('cannot report issue from completed', () => {
      expect(canReportIssue(MissionStatus.COMPLETED)).toBe(false);
    });

    test('cannot report issue from cancelled', () => {
      expect(canReportIssue(MissionStatus.CANCELLED)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // TERMINAL STATES
  // ─────────────────────────────────────────────

  describe('Terminal States', () => {
    test('completed is terminal', () => {
      expect(isTerminalState(MissionStatus.COMPLETED)).toBe(true);
    });

    test('cancelled is terminal', () => {
      expect(isTerminalState(MissionStatus.CANCELLED)).toBe(true);
    });

    test('assigned is not terminal', () => {
      expect(isTerminalState(MissionStatus.ASSIGNED)).toBe(false);
    });

    test('on_the_way is not terminal', () => {
      expect(isTerminalState(MissionStatus.ON_THE_WAY)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // OPERATIONAL STATES
  // ─────────────────────────────────────────────

  describe('Operational States', () => {
    test('assigned is operational', () => {
      expect(isOperationalState(MissionStatus.ASSIGNED)).toBe(true);
    });

    test('completed is not operational', () => {
      expect(isOperationalState(MissionStatus.COMPLETED)).toBe(false);
    });

    test('cancelled is not operational', () => {
      expect(isOperationalState(MissionStatus.CANCELLED)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // STATE TRANSITIONS (Executor)
  // ─────────────────────────────────────────────

  describe('State Transition Executor', () => {
    test('successful transition', () => {
      const mission = createMockMission(MissionStatus.ASSIGNED);
      const updated = transitionMissionState(mission, MissionStatus.ACCEPTED, 'greeter@neuland.de');

      expect(updated.status).toBe(MissionStatus.ACCEPTED);
      expect(updated.last_updated_by).toBe('greeter@neuland.de');
      expect(updated.last_status_change).not.toBe(mission.last_status_change);
    });

    test('throws on invalid transition', () => {
      const mission = createMockMission(MissionStatus.ASSIGNED);

      expect(() => {
        transitionMissionState(mission, MissionStatus.COMPLETED, 'admin@neuland.de');
      }).toThrow('Invalid state transition');
    });

    test('throws on terminal state', () => {
      const mission = createMockMission(MissionStatus.COMPLETED);

      expect(() => {
        transitionMissionState(mission, MissionStatus.CANCELLED, 'admin@neuland.de');
      }).toThrow('Cannot transition from terminal state');
    });

    test('emits event on transition', (done) => {
      const mission = createMockMission(MissionStatus.ASSIGNED);

      missionEventEmitter.on('MISSION_STATUS_CHANGED', (event) => {
        expect(event.missionId).toBe('mission-123');
        expect(event.oldStatus).toBe(MissionStatus.ASSIGNED);
        expect(event.newStatus).toBe(MissionStatus.ACCEPTED);
        expect(event.actor).toBe('greeter@neuland.de');
        done();
      });

      transitionMissionState(mission, MissionStatus.ACCEPTED, 'greeter@neuland.de');
    });
  });

  // ─────────────────────────────────────────────
  // ISSUE REPORTING (Executor)
  // ─────────────────────────────────────────────

  describe('Issue Reporting Executor', () => {
    test('successful issue report', () => {
      const mission = createMockMission(MissionStatus.ON_THE_WAY);
      const updated = reportMissionIssue(
        mission,
        IssueServerity.WARNING,
        'Traffic delay',
        'greeter@neuland.de'
      );

      expect(updated.status).toBe(MissionStatus.ISSUE_REPORTED);
      expect(updated.has_issue).toBe(true);
      expect(updated.issue_severity).toBe(IssueServerity.WARNING);
      expect(updated.issue_message).toBe('Traffic delay');
    });

    test('throws on invalid state', () => {
      const mission = createMockMission(MissionStatus.COMPLETED);

      expect(() => {
        reportMissionIssue(mission, IssueServerity.CRITICAL, 'Error', 'greeter@neuland.de');
      }).toThrow('Cannot report issue from state');
    });

    test('emits event on issue report', (done) => {
      const mission = createMockMission(MissionStatus.ARRIVED);

      missionEventEmitter.on('MISSION_ISSUE_REPORTED', (event) => {
        expect(event.type).toBe('MISSION_ISSUE_REPORTED');
        expect(event.issueSeverity).toBe(IssueServerity.CRITICAL);
        expect(event.issueMessage).toBe('Talent not at location');
        done();
      });

      reportMissionIssue(mission, IssueServerity.CRITICAL, 'Talent not at location', 'greeter@neuland.de');
    });
  });

  // ─────────────────────────────────────────────
  // OPTIMISTIC UPDATES
  // ─────────────────────────────────────────────

  describe('Optimistic Updates', () => {
    test('creates optimistic state', () => {
      const mission = createMockMission(MissionStatus.ASSIGNED);
      const optimistic = optimisticUpdateMissionState(mission, MissionStatus.ACCEPTED, 'greeter@neuland.de');

      expect(optimistic.status).toBe(MissionStatus.ACCEPTED);
    });

    test('emits optimistic event', (done) => {
      const mission = createMockMission(MissionStatus.ON_THE_WAY);

      missionEventEmitter.on('MISSION_OPTIMISTIC_UPDATE', (event) => {
        expect(event.optimistic).toBe(true);
        done();
      });

      optimisticUpdateMissionState(mission, MissionStatus.ARRIVED, 'greeter@neuland.de');
    });
  });

  // ─────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────

  describe('State Validation', () => {
    test('valid state passes validation', () => {
      const mission = createMockMission();
      const result = validateMissionState(mission);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('invalid status fails validation', () => {
      const mission = createMockMission();
      mission.status = 'invalid' as any;

      const result = validateMissionState(mission);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('issue inconsistency detected', () => {
      const mission = createMockMission();
      mission.has_issue = true;
      mission.status = MissionStatus.ON_THE_WAY; // Not ISSUE_REPORTED

      const result = validateMissionState(mission);

      expect(result.valid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // STATE REPORT
  // ─────────────────────────────────────────────

  describe('State Report', () => {
    test('generates detailed report', () => {
      const mission = createMockMission(MissionStatus.ON_THE_WAY);
      const report = getMissionStateReport(mission);

      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('statusLabel');
      expect(report).toHaveProperty('timelineIndex');
      expect(report).toHaveProperty('nextValidStates');
      expect(report).toHaveProperty('canReportIssue');
    });

    test('report shows valid next states', () => {
      const mission = createMockMission(MissionStatus.ACCEPTED);
      const report = getMissionStateReport(mission);

      expect(report.nextValidStates).toEqual([
        MissionStatus.ON_THE_WAY,
        MissionStatus.CANCELLED,
      ]);
    });
  });

  // ─────────────────────────────────────────────
  // FULL WORKFLOW TEST
  // ─────────────────────────────────────────────

  describe('Full Workflow', () => {
    test('complete mission lifecycle', () => {
      let mission = createMockMission(MissionStatus.ASSIGNED);

      mission = transitionMissionState(mission, MissionStatus.ACCEPTED, 'greeter@neuland.de');
      expect(mission.status).toBe(MissionStatus.ACCEPTED);

      mission = transitionMissionState(mission, MissionStatus.ON_THE_WAY, 'greeter@neuland.de');
      expect(mission.status).toBe(MissionStatus.ON_THE_WAY);

      mission = transitionMissionState(mission, MissionStatus.ARRIVED, 'greeter@neuland.de');
      expect(mission.status).toBe(MissionStatus.ARRIVED);

      mission = transitionMissionState(mission, MissionStatus.MET_TALENT, 'greeter@neuland.de');
      expect(mission.status).toBe(MissionStatus.MET_TALENT);

      mission = transitionMissionState(mission, MissionStatus.COMPLETED, 'greeter@neuland.de');
      expect(mission.status).toBe(MissionStatus.COMPLETED);
      expect(isTerminalState(mission.status)).toBe(true);
    });

    test('issue in middle of workflow', () => {
      let mission = createMockMission(MissionStatus.ASSIGNED);

      mission = transitionMissionState(mission, MissionStatus.ACCEPTED, 'greeter@neuland.de');
      mission = transitionMissionState(mission, MissionStatus.ON_THE_WAY, 'greeter@neuland.de');

      mission = reportMissionIssue(mission, IssueServerity.WARNING, 'Traffic delay', 'greeter@neuland.de');
      expect(mission.status).toBe(MissionStatus.ISSUE_REPORTED);
      expect(mission.has_issue).toBe(true);

      // Can resume from issue state
      mission = transitionMissionState(mission, MissionStatus.ARRIVED, 'greeter@neuland.de');
      expect(mission.status).toBe(MissionStatus.ARRIVED);
    });
  });
});
