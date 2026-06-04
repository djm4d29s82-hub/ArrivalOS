import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, Timer, AlertTriangle, CheckCircle2, CalendarClock, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, StatCard, EmptyState, SectionHeader } from '@/components/ui';
import { calculateMissionSLA, getSLAMessage, SLA_BADGE_CLASSES } from '@/lib/missionSLA';
import { relativeStepDate } from '@/lib/utils';
import AiBriefing from '@/components/company/AiBriefing';
import { SERVICE_BY_KEY } from '@/lib/serviceCatalog';

const TERMINAL = ['completed', 'cancelled'];
const SLA_RANK = { critical: 0, breached: 1, at_risk: 2, ok: 3 };

/**
 * CompanySLA — "Kennzahlen" for HR. Numbers, not step-lists: which arrivals need
 * attention now (operational SLA) + honest onboarding throughput. All metrics are
 * derived from data the dashboard already loads; nothing is invented.
 */
export default function CompanySLA() {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const { data: missions = [] }   = useQuery({ queryKey: ['missions'],     queryFn: () => base44.entities.Mission.list('-datetime'), refetchInterval: 12000 });
  const { data: candidates = [] } = useQuery({ queryKey: ['candidates'],   queryFn: () => base44.entities.Candidate.list() });
  const { data: allSteps = [] }   = useQuery({ queryKey: ['journeySteps'], queryFn: () => base44.entities.JourneyStep.list(), refetchInterval: 12000 });
  const { data: allServices = [] } = useQuery({ queryKey: ['missionServices'], queryFn: () => base44.entities.MissionService.list().catch(() => []) });

  const myMissions = useMemo(
    () => (companyId ? missions.filter((m) => m.company_id === companyId) : missions),
    [missions, companyId],
  );
  const missionIds = useMemo(() => new Set(myMissions.map((m) => m.id)), [myMissions]);
  const candidateById = useMemo(() => Object.fromEntries(candidates.map((c) => [c.id, c])), [candidates]);
  const mySteps = useMemo(() => allSteps.filter((s) => missionIds.has(s.mission_id)), [allSteps, missionIds]);
  const myServices = useMemo(() => allServices.filter((s) => missionIds.has(s.mission_id)), [allServices, missionIds]);

  const titleFor = (m) => candidateById[m.candidate_id]?.full_name || m.title;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const now = Date.now();
  const activeCount = myMissions.filter((m) => !TERMINAL.includes(m.status)).length;

  const overdueSteps = useMemo(
    () => mySteps
      .filter((s) => s.scheduled_at && s.status !== 'completed' && new Date(s.scheduled_at).getTime() < now)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
    [mySteps, now],
  );

  // On-time rate: of completed steps that had a target date, how many finished on/before it.
  const { onTimePct, onTimeBase } = useMemo(() => {
    const scored = mySteps.filter((s) => s.status === 'completed' && s.scheduled_at && s.completed_at);
    if (!scored.length) return { onTimePct: null, onTimeBase: 0 };
    const onTime = scored.filter((s) => new Date(s.completed_at).getTime() <= new Date(s.scheduled_at).getTime()).length;
    return { onTimePct: Math.round((onTime / scored.length) * 100), onTimeBase: scored.length };
  }, [mySteps]);

  // Average days from creation to completion (completed missions only).
  const avgDays = useMemo(() => {
    const done = myMissions.filter((m) => m.status === 'completed' && m.created_at && m.last_status_change);
    if (!done.length) return null;
    const sum = done.reduce((acc, m) => acc + (new Date(m.last_status_change) - new Date(m.created_at)), 0);
    return Math.round(sum / done.length / 86400000);
  }, [myMissions]);

  const punctTone = onTimePct == null ? 'navy' : onTimePct >= 90 ? 'green' : onTimePct >= 70 ? 'gold' : 'red';

  // ── Attention list (operational SLA) ──────────────────────────────────────
  const flagged = useMemo(() => myMissions
    .filter((m) => !TERMINAL.includes(m.status))
    .map((m) => ({ m, sla: calculateMissionSLA(m) }))
    .filter((x) => x.sla.level !== 'ok')
    .sort((a, b) => SLA_RANK[a.sla.level] - SLA_RANK[b.sla.level]),
    [myMissions]);

  // Compact payload for the AI briefing — built from the same data already on screen.
  const buildBriefingPayload = () => {
    const labelFor = (cat) => SERVICE_BY_KEY[cat]?.label || cat;
    const svcByStatus = myServices.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {});
    const svcByMission = myServices.reduce((acc, s) => { (acc[s.mission_id] ||= []).push(s); return acc; }, {});
    return {
      counts: { active: activeCount, overdueSteps: overdueSteps.length },
      steps: { overdue: overdueSteps.length, onTimePct, avgDays },
      services: myServices.length ? { byStatus: svcByStatus } : undefined,
      missions: myMissions
        .filter((m) => !TERMINAL.includes(m.status))
        .map((m) => ({
          title: titleFor(m),
          status: m.status,
          city: m.city || null,
          datetime: m.datetime || null,
          greeter: m.greeter_id ? 'zugewiesen' : 'offen',
          sla: calculateMissionSLA(m).level,
          services: (svcByMission[m.id] || []).map((s) => ({ kategorie: labelFor(s.category), status: s.status })),
        })),
    };
  };

  return (
    <div>
      <div className="mb-2 text-[11px] uppercase tracking-widest text-gold font-bold">Unternehmen · Kennzahlen</div>
      <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ds-t1)' }}>SLA & Fortschritt</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--ds-t2)' }}>
        Der operative Stand deiner Ankünfte — was Aufmerksamkeit braucht und wie pünktlich das Onboarding läuft.
      </p>

      {/* KPI row */}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Aktive Ankünfte" value={activeCount} icon={Activity} tone="navy" />
        <StatCard
          label="Pünktlichkeit"
          value={onTimePct == null ? '—' : `${onTimePct}%`}
          hint={onTimeBase ? `${onTimeBase} Schritte im Zeitfenster bewertet` : 'noch keine Daten'}
          icon={CheckCircle2}
          tone={punctTone}
        />
        <StatCard label="Überfällige Schritte" value={overdueSteps.length} icon={AlertTriangle} tone={overdueSteps.length ? 'red' : 'navy'} />
        <StatCard label="Ø Tage bis Abschluss" value={avgDays == null ? '—' : avgDays} icon={Timer} tone="navy" />
      </div>

      {/* KI-Briefing */}
      <div className="mt-8">
        <AiBriefing getPayload={buildBriefingPayload} disabled={activeCount === 0} />
      </div>

      {/* Attention */}
      <div className="mt-8">
        <SectionHeader title="Aufmerksamkeit nötig" count={flagged.length || undefined} />
        {flagged.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Alles im grünen Bereich" description="Keine Ankunft verletzt aktuell ein Zeitziel." />
        ) : (
          <div className="space-y-2">
            {flagged.map(({ m, sla }) => (
              <Link
                key={m.id}
                to={`/company/missions/${m.id}`}
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition"
                style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[14px] truncate" style={{ color: 'var(--ds-t1)' }}>{titleFor(m)}</div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--ds-t3)' }}>{m.city || '—'}</div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${SLA_BADGE_CLASSES[sla.level]}`}>
                  <AlertTriangle className="w-3 h-3" /> {getSLAMessage(sla)}
                </span>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-t3)' }} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Overdue steps */}
      <div className="mt-8">
        <SectionHeader title="Überfällige Schritte" count={overdueSteps.length || undefined} />
        {overdueSteps.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Keine überfälligen Schritte" description="Alle geplanten Schritte liegen im Zeitplan." />
        ) : (
          <Card variant="default">
            <ul className="divide-y" style={{ borderColor: 'var(--ds-card-border)' }}>
              {overdueSteps.map((s) => {
                const m = myMissions.find((x) => x.id === s.mission_id);
                return (
                  <li key={s.id}>
                    <Link to={m ? `/company/missions/${m.id}` : '#'} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(239,68,68,0.10)', color: '#dc2626' }}>
                        <CalendarClock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--ds-t1)' }}>{s.title}</div>
                        <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ds-t3)' }}>{m ? titleFor(m) : '—'}</div>
                      </div>
                      <span className="text-[11.5px] font-medium text-red-600 dark:text-red-400">{relativeStepDate(s.scheduled_at)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
