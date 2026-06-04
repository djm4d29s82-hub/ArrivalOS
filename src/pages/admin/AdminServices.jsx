import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PackageOpen, Activity, AlertTriangle, CheckCircle2, CalendarClock, ChevronRight,
  FileCheck, ShieldPlus, Building2, Landmark, Smartphone, Stethoscope, Languages, Calculator,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, StatCard, Pill, EmptyState, SectionHeader } from '@/components/ui';
import { SERVICE_CATALOG, SERVICE_BY_KEY, SERVICE_STATUS } from '@/lib/serviceCatalog';
import { relativeStepDate } from '@/lib/utils';

const ICONS = { FileCheck, ShieldPlus, Building2, Landmark, Smartphone, Stethoscope, Languages, Calculator };
const TERMINAL = ['completed', 'cancelled'];
const OPEN = (s) => s.status !== 'done' && s.status !== 'skipped';

/**
 * AdminServices — Operations-Pipeline für den Services Marketplace.
 * Aggregiert alle mission_services über aktive Ankünfte: Status, Überfälligkeiten,
 * Kategorie-Verteilung. Alle Zahlen aus echten Daten — kein erfundener Anbieter.
 */
export default function AdminServices() {
  const { data: services = [] }   = useQuery({ queryKey: ['missionServices'], queryFn: () => base44.entities.MissionService.list().catch(() => []), refetchInterval: 15000 });
  const { data: missions = [] }   = useQuery({ queryKey: ['missions'],        queryFn: () => base44.entities.Mission.list('-datetime') });
  const { data: candidates = [] } = useQuery({ queryKey: ['candidates'],      queryFn: () => base44.entities.Candidate.list() });

  const missionById = useMemo(() => Object.fromEntries(missions.map((m) => [m.id, m])), [missions]);
  const candidateById = useMemo(() => Object.fromEntries(candidates.map((c) => [c.id, c])), [candidates]);
  const titleFor = (m) => (m && (candidateById[m.candidate_id]?.full_name || m.title)) || '—';

  // Only services on non-terminal missions count as "live".
  const live = useMemo(
    () => services.filter((s) => { const m = missionById[s.mission_id]; return m && !TERMINAL.includes(m.status); }),
    [services, missionById],
  );

  const now = Date.now();
  const byStatus = useMemo(() => live.reduce((a, s) => { a[s.status] = (a[s.status] || 0) + 1; return a; }, {}), [live]);
  const overdue = useMemo(
    () => live
      .filter((s) => OPEN(s) && s.due_at && new Date(s.due_at).getTime() < now)
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at)),
    [live, now],
  );
  const activeCount = live.filter(OPEN).length;
  const doneCount = live.filter((s) => s.status === 'done').length;

  const byCategory = useMemo(() => {
    const map = {};
    for (const c of SERVICE_CATALOG) map[c.key] = { total: 0, open: 0, overdue: 0 };
    for (const s of live) {
      if (!map[s.category]) map[s.category] = { total: 0, open: 0, overdue: 0 };
      map[s.category].total += 1;
      if (OPEN(s)) map[s.category].open += 1;
      if (OPEN(s) && s.due_at && new Date(s.due_at).getTime() < now) map[s.category].overdue += 1;
    }
    return map;
  }, [live, now]);

  return (
    <div>
      <div className="mb-2 text-[11px] uppercase tracking-widest text-gold font-bold">Operations · Services</div>
      <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ds-t1)' }}>Service-Pipeline</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--ds-t2)' }}>
        Alle aktivierten Partner-Services über laufende Ankünfte — was offen ist, was überfällig ist, wie es sich verteilt.
      </p>

      {/* KPI row */}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Offene Services" value={activeCount} icon={Activity} tone="navy" />
        <StatCard label="In Bearbeitung" value={byStatus.in_progress || 0} icon={PackageOpen} tone="gold" />
        <StatCard label="Überfällig" value={overdue.length} icon={AlertTriangle} tone={overdue.length ? 'red' : 'navy'} />
        <StatCard label="Abgeschlossen" value={doneCount} icon={CheckCircle2} tone={doneCount ? 'green' : 'navy'} />
      </div>

      {/* Overdue services */}
      <div className="mt-8">
        <SectionHeader title="Überfällige Services" count={overdue.length || undefined} />
        {overdue.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Keine überfälligen Services" description="Alle Services mit Frist liegen im Zeitplan." />
        ) : (
          <div className="space-y-2">
            {overdue.map((s) => {
              const m = missionById[s.mission_id];
              const cat = SERVICE_BY_KEY[s.category] || { label: s.category, iconName: 'PackageOpen' };
              const Icon = ICONS[cat.iconName] || PackageOpen;
              return (
                <Link
                  key={s.id}
                  to={m ? `/admin/missions/${m.id}` : '#'}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition"
                  style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
                >
                  <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(239,68,68,0.10)', color: '#dc2626' }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[14px] truncate" style={{ color: 'var(--ds-t1)' }}>{cat.label}</div>
                    <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ds-t3)' }}>{titleFor(m)} · {m?.city || '—'}</div>
                  </div>
                  <span className="text-[11.5px] font-medium text-red-600 dark:text-red-400 shrink-0">{relativeStepDate(s.due_at)}</span>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-t3)' }} />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* By category */}
      <div className="mt-8">
        <SectionHeader title="Nach Kategorie" />
        {live.length === 0 ? (
          <EmptyState icon={PackageOpen} title="Noch keine Services aktiviert" description="Sobald in den Ankünften Services aktiviert werden, erscheint hier die Verteilung." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SERVICE_CATALOG.map((c) => {
              const stat = byCategory[c.key] || { total: 0, open: 0, overdue: 0 };
              const Icon = ICONS[c.iconName] || PackageOpen;
              return (
                <Card key={c.key} variant="default">
                  <div className="p-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gold/10 grid place-items-center shrink-0">
                        <Icon className="w-4 h-4 text-gold" />
                      </div>
                      <div className="font-semibold text-[13.5px]" style={{ color: 'var(--ds-t1)' }}>{c.label}</div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-2xl font-bold" style={{ color: 'var(--ds-t1)' }}>{stat.total}</span>
                      <span className="text-[11.5px]" style={{ color: 'var(--ds-t3)' }}>aktiviert</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <Pill tone="neutral" size="xs">{stat.open} offen</Pill>
                      {stat.overdue > 0 && <Pill tone="red" size="xs" dot>{stat.overdue} überfällig</Pill>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
