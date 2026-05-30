import { base44 } from '@/api/base44Client';
import { DEFAULT_JOURNEY_STEPS } from '@/lib/journeySteps';

const TRANSITIONS = {
  open: ['matched', 'cancelled'],
  matched: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

async function logEvent(entityType, entityId, action, oldValue, newValue, description, createdBy) {
  await base44.entities.ActivityLog.create({
    entity_type: entityType,
    entity_id: entityId,
    action,
    old_value: String(oldValue || ''),
    new_value: String(newValue || ''),
    created_by: createdBy || 'system',
    description,
    timestamp: new Date().toISOString(),
  });
}

async function createNotification(userEmail, title, message, type = 'info', link = '') {
  await base44.entities.Notification.create({
    user_email: userEmail,
    title,
    message,
    type,
    link,
    read: false,
  });
}

export async function runMatchingEngine(mission) {
  let matched = await base44.entities.GreeterProfile.filter({ city: mission.city, status: 'available' });

  if (mission.requirements?.languages?.length > 0) {
    const filtered = matched.filter((g) =>
      g.languages?.some((lang) =>
        mission.requirements.languages.some((req) => lang.toLowerCase().includes(req.toLowerCase()))
      )
    );
    if (filtered.length > 0) matched = filtered;
  }

  matched.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const matchedIds = matched.slice(0, 5).map((g) => g.id);

  await base44.entities.Mission.update(mission.id, { status: 'matched', matched_greeters: matchedIds });
  await logEvent('Mission', mission.id, 'mission.matched', 'open', 'matched', `Matched ${matchedIds.length} greeter(s)`, 'system');

  for (const g of matched.slice(0, 5)) {
    if (g.email) {
      await createNotification(g.email, 'Neue Mission!', `Mission "${mission.title}" passt zu deinem Profil.`, 'action', '/greeter-dashboard/missions');
    }
  }
  return matchedIds;
}

export async function createJourneySteps(missionId) {
  const steps = DEFAULT_JOURNEY_STEPS.map((s) => ({ ...s, mission_id: missionId, status: 'pending', completed_at: null }));
  await base44.entities.JourneyStep.bulkCreate(steps);
}

export async function transitionMission(missionId, newStatus, actor, notifyEmail) {
  const mission = await base44.entities.Mission.get(missionId);
  if (!mission) throw new Error('Mission not found');
  if (!canTransition(mission.status, newStatus)) {
    throw new Error(`Invalid transition: ${mission.status} → ${newStatus}`);
  }
  await base44.entities.Mission.update(missionId, { status: newStatus });
  await logEvent('Mission', missionId, `mission.${newStatus}`, mission.status, newStatus, `Mission "${mission.title}" → ${newStatus}`, actor || 'system');

  if (newStatus === 'assigned') {
    const existing = await base44.entities.JourneyStep.filter({ mission_id: missionId });
    if (existing.length === 0) await createJourneySteps(missionId);
    if (notifyEmail) {
      await createNotification(notifyEmail, 'Mission zugewiesen!', `Mission "${mission.title}" wurde dir zugewiesen.`, 'success');
    }
  }
  return { ...mission, status: newStatus };
}

export async function createMission(data, createdBy) {
  const mission = await base44.entities.Mission.create({ ...data, status: 'open', matched_greeters: [] });
  await logEvent('Mission', mission.id, 'mission.created', '', 'open', `Mission "${mission.title}" created`, createdBy);
  setTimeout(() => runMatchingEngine(mission).catch(() => {}), 800);
  return mission;
}

export async function acceptMission(missionId, greeterProfile, userEmail) {
  const mission = await base44.entities.Mission.get(missionId);
  if (!mission) throw new Error('Mission not found');
  await base44.entities.Mission.update(missionId, { status: 'assigned', greeter_id: greeterProfile.id });
  const existing = await base44.entities.JourneyStep.filter({ mission_id: missionId });
  if (existing.length === 0) await createJourneySteps(missionId);
  await logEvent('Mission', missionId, 'mission.assigned', mission.status, 'assigned', `Greeter "${greeterProfile.full_name}" accepted`, userEmail);
  await createNotification(userEmail, 'Mission angenommen!', `Du hast Mission "${mission.title}" angenommen.`, 'success');
  return { ...mission, status: 'assigned', greeter_id: greeterProfile.id };
}

export async function completeJourneyStep(stepId, actor) {
  const step = await base44.entities.JourneyStep.get(stepId);
  if (!step) throw new Error('Step not found');
  await base44.entities.JourneyStep.update(stepId, { status: 'completed', completed_at: new Date().toISOString() });
  await logEvent('JourneyStep', stepId, 'step.completed', step.status, 'completed', `Step "${step.title}" completed`, actor);

  const all = await base44.entities.JourneyStep.filter({ mission_id: step.mission_id });
  const allDone = all.every((s) => s.id === stepId || s.status === 'completed');
  if (allDone) {
    // Auto-complete only when the mission is in a state that legally allows it
    // (Option A: completion happens from `in_progress`). Checking off a step must
    // never throw an "Invalid transition" error if it's hit from another state.
    const mission = await base44.entities.Mission.get(step.mission_id);
    if (mission && canTransition(mission.status, 'completed')) {
      await transitionMission(step.mission_id, 'completed', actor);
    }
  }
  return true;
}

export async function startMission(missionId, actor) {
  return transitionMission(missionId, 'in_progress', actor);
}

export async function cancelMission(missionId, actor) {
  return transitionMission(missionId, 'cancelled', actor);
}

// ============================================================
// Greeter operational stages — sub-states under in_progress / assigned
// ============================================================

/**
 * Granular stages a Greeter walks through during one mission.
 * They live on `mission.greeter_stage`; the top-level `mission.status`
 * is still the system-of-record for matched/assigned/in_progress/completed.
 */
export const GREETER_STAGES = [
  'accepted',     // mission accepted (status: assigned)
  'eta_sent',     // ETA submitted to talent
  'on_the_way',   // travelling to meeting point
  'arrived',      // arrived at meeting point
  'in_progress',  // working through journey steps with talent
  'wrap_up',      // about to close
  'completed',    // done (status: completed)
];

export const STAGE_LABELS_DE = {
  accepted: 'Angenommen',
  eta_sent: 'ETA gesendet',
  on_the_way: 'Unterwegs',
  arrived: 'Vor Ort',
  in_progress: 'Im Einsatz',
  wrap_up: 'Abschluss läuft',
  completed: 'Abgeschlossen',
};

const STAGE_ORDER = GREETER_STAGES.reduce((m, s, i) => ({ ...m, [s]: i }), {});

export function stageIndex(stage) {
  return STAGE_ORDER[stage] ?? -1;
}

/**
 * Advance the Greeter operational stage. Mirrors high-level status when needed:
 *   - 'on_the_way' / 'arrived' / 'in_progress' → status 'in_progress'
 *   - 'completed' → status 'completed'
 */
export async function setGreeterStage(missionId, stage, actor, payload = {}) {
  const mission = await base44.entities.Mission.get(missionId);
  if (!mission) throw new Error('Mission not found');
  const update = { greeter_stage: stage, ...payload };

  // Mirror to top-level status when stage crosses a boundary
  if (['on_the_way', 'arrived', 'in_progress'].includes(stage) && mission.status !== 'in_progress') {
    if (canTransition(mission.status, 'in_progress')) update.status = 'in_progress';
  }
  if (stage === 'completed' && mission.status !== 'completed') {
    if (canTransition(mission.status, 'completed')) update.status = 'completed';
    update.completed_at = new Date().toISOString();
  }

  await base44.entities.Mission.update(missionId, update);
  await logEvent(
    'Mission', missionId, `mission.stage.${stage}`,
    mission.greeter_stage || '', stage,
    `Stage: ${STAGE_LABELS_DE[stage] || stage}`, actor,
  );
  return { ...mission, ...update };
}

export async function sendETA(missionId, etaIso, note, actor) {
  const mission = await base44.entities.Mission.get(missionId);
  if (!mission) throw new Error('Mission not found');
  await base44.entities.Mission.update(missionId, {
    eta_at: etaIso,
    eta_note: note || '',
    greeter_stage: 'eta_sent',
  });
  await logEvent('Mission', missionId, 'mission.eta_sent', '', etaIso,
    `ETA gesendet: ${new Date(etaIso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}${note ? ' — ' + note : ''}`,
    actor);
  // Inform the candidate when available
  const candidate = mission.candidate_id ? await base44.entities.Candidate.get(mission.candidate_id).catch(() => null) : null;
  if (candidate?.email) {
    await createNotification(candidate.email, 'Dein Greeter ist unterwegs',
      `Geschätzte Ankunft: ${new Date(etaIso).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}`,
      'info', '/talent');
  }
  return { ...mission, eta_at: etaIso, greeter_stage: 'eta_sent' };
}

export async function checkInMission(missionId, actor, payload = {}) {
  return setGreeterStage(missionId, 'arrived', actor, {
    checked_in_at: new Date().toISOString(),
    check_in_location: payload.location || '',
  });
}

export async function addMissionNote(missionId, body, actor) {
  if (!body?.trim()) return;
  await base44.entities.ActivityLog.create({
    entity_type: 'Mission',
    entity_id: missionId,
    action: 'mission.note',
    old_value: '',
    new_value: body.trim(),
    created_by: actor || 'system',
    description: body.trim().slice(0, 240),
    timestamp: new Date().toISOString(),
  });
}

export async function reportMissionIssue(missionId, message, actor, severity = 'warning') {
  const mission = await base44.entities.Mission.get(missionId);
  if (!mission) throw new Error('Mission not found');
  await base44.entities.Mission.update(missionId, {
    has_issue: true,
    last_issue: { message, severity, at: new Date().toISOString(), by: actor },
  });
  await logEvent('Mission', missionId, 'mission.issue_reported', '', severity,
    `Issue (${severity}): ${message}`, actor);
  // Notify admins
  await createNotification('admin@neuland.de', 'Issue gemeldet',
    `${mission.title}: ${message}`, 'alert', '/admin/missions');
  return true;
}

export async function completeMissionWithReport(missionId, report, actor) {
  await setGreeterStage(missionId, 'completed', actor, {
    completion_report: report || '',
    completed_at: new Date().toISOString(),
  });
  return true;
}
