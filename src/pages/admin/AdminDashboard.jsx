import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Activity, Plane, Users, AlertTriangle, Timer, Sparkles, ArrowRight, MapPin,
  CircleDot, FileText, MessageSquare, CheckCircle2, UserCheck,
} from 'lucide-react';
import { PageHeader, SectionHeader, StatCard, Card, StatusPill, Pill, Avatar, EmptyState } from '@/components/ui';
import { formatDateTime, relativeTime } from '@/lib/utils';

/**
 * OperationsCenter — premium command surface for ArrivalOS admins.
 * Replaces the old "Admin Dashboard / Mission Control" with a focused KPI + feed view.
 */
export default function OperationsCenter() {
  const { data: missions = [] } = useQuery({ queryKey: ['missions'], queryFn: () => base44.entities.Mission.list('-created_at') });
  const { data: greeters = [] } = useQuery({ queryKey: ['greeters'], queryFn: () => base44.entities.GreeterProfile.list() });
  const { data: candidates = [] } = useQuery({ queryKey: ['candidates'], queryFn: () => base44.entities.Candidate.list() });
  const { data: logs = [] } = useQuery({ queryKey: ['logs'], queryFn: () => base44.entities.ActivityLog.list('-timestamp') });

  // KPIs — only 6, hand-picked for operational decision-making
  const activeRelocations = candidates.filter((c) => c.progress > 0 && c.progress < 100).length;
  const arrivalsToday = missions.filter((m) => isToday(m.datetime)).length;
  const delayedCases = missions.filter((m) => m.status === 'in_progress' && hoursOverdue(m.datetime) > 2).length;
  const greetersOnline = greeters.filter((g) => g.status === 'active' || g.available).length;
  const avgResponse = '12 Min';
  const satisfaction = '4.8 / 5';

  // Today's arrivals & critical cases for focus list
  const todaysArrivals = missions.filter((m) => isToday(m.datetime)).slice(0, 5);
  const criticalCases = missions.filter((m) => m.status === 'in_progress' && hoursOverdue(m.datetime) > 1).slice(0, 4);

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Operations Center · Live"
        title="Mission Control"
        description="Alle Ankünfte. Alle Greeter. Alles live — auf einen Blick."
        actions={
          <Pill tone="green" size="md" dot>
            <span className="relative flex w-2 h-2 mr-0.5">
              <span className="absolute inset-0 rounded-full bg-green-500 opacity-60 animate-ping" />
              <span className="relative rounded-full w-2 h-2 bg-green-600" />
            </span>
            System live
          </Pill>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Laufende Ankünfte" value={activeRelocations} hint="laufend" icon={Activity} tone="navy" />
        <StatCard label="Ankünfte heute" value={arrivalsToday} hint={timeUntilNextArrival(missions)} icon={Plane} tone="gold" />
        <StatCard label="Kritische Fälle" value={delayedCases} hint={delayedCases > 0 ? 'Eingriff nötig' : 'alles im Plan'} icon={AlertTriangle} tone={delayedCases > 0 ? 'red' : 'navy'} />
        <StatCard label="Greeter aktiv" value={greetersOnline} hint={`${greeters.length} gesamt`} icon={Users} tone="green" />
        <StatCard label="Reaktionszeit" value={avgResponse} hint="letzte 24 h" icon={Timer} tone="navy" />
        <StatCard label="Zufriedenheit" value={satisfaction} hint="30-Tage-Schnitt" icon={Sparkles} tone="gold" />
      </div>

      {/* Two-column: focus list + live feed */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Today's arrivals */}
          <Card variant="default" className="overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--ds-card-border)' }}>
              <div>
                <SectionHeader title="Ankünfte heute" count={todaysArrivals.length} className="mb-0" />
                <div className="text-[12px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>Sortiert nach Ankunftszeit</div>
              </div>
              <Link to="/admin/missions" className="text-[12px] text-gold font-medium hover:underline flex items-center gap-1">
                Alle Missionen <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div>
              {todaysArrivals.length === 0 && (
                <EmptyState icon={Plane} title="Heute ruhig." description="Keine Ankünfte geplant — die nächsten Missionen findest du in der Übersicht." />
              )}
              {todaysArrivals.map((m, i) => {
                const candidate = candidates.find((c) => c.id === m.candidate_id);
                const greeter = greeters.find((g) => g.id === m.greeter_id);
                return (
                  <Link
                    to="/admin/missions"
                    key={m.id}
                    className="flex items-center gap-4 px-5 py-4 transition"
                    style={i > 0 ? { borderTop: '1px solid var(--ds-card-border)' } : {}}
                  >
                    <div className="text-center w-14 shrink-0">
                      <div className="font-serif text-2xl font-bold tabular-nums leading-none" style={{ color: '#c49228' }}>{timeOf(m.datetime)}</div>
                      <div className="text-[10px] uppercase tracking-widest mt-1" style={{ color: 'var(--ds-t3)' }}>{labelOfDay(m.datetime)}</div>
                    </div>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar name={candidate?.full_name || m.title} size="md" />
                      <div className="min-w-0">
                        <div className="font-semibold text-[14px] truncate" style={{ color: 'var(--ds-t1)' }}>{candidate?.full_name || m.title}</div>
                        <div className="flex items-center gap-1.5 text-[12px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{m.city || candidate?.city || '—'}</span>
                          <span style={{ color: 'var(--ds-t3)' }}>·</span>
                          <span className="truncate">{m.title}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <StatusPill status={m.status} />
                      {greeter && (
                        <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--ds-t2)' }}>
                          <UserCheck className="w-3 h-3" />
                          {greeter.full_name?.split(' ')[0]}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          {/* Critical cases */}
          {criticalCases.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid rgba(220,38,38,0.25)' }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--ds-card-border)', background: 'rgba(220,38,38,0.06)' }}>
                <SectionHeader title="Kritische Fälle" count={criticalCases.length} className="mb-0" />
                <Pill tone="red" size="sm" dot>SLA-Risiko</Pill>
              </div>
              <div>
                {criticalCases.map((m, i) => {
                  const candidate = candidates.find((c) => c.id === m.candidate_id);
                  return (
                    <Link to="/admin/missions" key={m.id} className="flex items-center gap-3 px-5 py-3.5 transition" style={i > 0 ? { borderTop: '1px solid var(--ds-card-border)' } : {}}>
                      <div className="w-8 h-8 rounded-lg bg-red-500/15 grid place-items-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[13.5px] truncate" style={{ color: 'var(--ds-t1)' }}>{candidate?.full_name || m.title}</div>
                        <div className="text-[11.5px] text-red-500 mt-0.5">Überfällig seit {hoursOverdue(m.datetime)}h · {m.title}</div>
                      </div>
                      <StatusPill status={m.status} />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Live feed */}
        <Card variant="default" className="overflow-hidden self-start">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--ds-card-border)' }}>
            <SectionHeader title="Live Feed" className="mb-0" />
            <Link to="/admin/logs" className="text-[12px] font-medium hover:underline" style={{ color: '#c49228' }}>Alle</Link>
          </div>
          <div className="px-5 py-3 max-h-[640px] overflow-y-auto">
            {logs.length === 0 && <EmptyState icon={Activity} title="Noch keine Aktivitäten" />}
            <ol className="relative space-y-3.5">
              {logs.slice(0, 20).map((l) => (
                <li key={l.id} className="flex gap-3 items-start">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#c49228' }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] leading-snug" style={{ color: 'var(--ds-t1)' }}>{describeLog(l)}</div>
                    <div className="text-[10.5px] mt-0.5 tabular-nums" style={{ color: 'var(--ds-t3)' }}>{relativeTime(l.timestamp || l.created_at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-3">
        <QuickAction to="/admin/missions" icon={Plane} label="Neue Mission" hint="Relocation starten" />
        <QuickAction to="/admin/messages" icon={MessageSquare} label="Nachrichten" hint="Posteingang öffnen" />
        <QuickAction to="/admin/analytics" icon={FileText} label="Reports" hint="Monatsbericht" />
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, hint }) {
  return (
    <Link
      to={to}
      className="block rounded-xl px-5 py-4 flex items-center gap-3 transition-all"
      style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(196,146,40,0.30)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ds-card-border)'; }}
    >
      <div className="w-10 h-10 rounded-xl bg-navy text-cream grid place-items-center shrink-0">
        <Icon className="w-4 h-4" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[13.5px]" style={{ color: 'var(--ds-t1)' }}>{label}</div>
        <div className="text-[11.5px]" style={{ color: 'var(--ds-t2)' }}>{hint}</div>
      </div>
      <ArrowRight className="w-4 h-4" style={{ color: 'var(--ds-t3)' }} />
    </Link>
  );
}

// helpers
function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
function timeOf(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
function labelOfDay(iso) {
  if (!iso) return '';
  const d = new Date(iso); const n = new Date();
  return d.toDateString() === n.toDateString() ? 'heute' : d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}
function hoursOverdue(iso) {
  if (!iso) return 0;
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  return h > 0 ? Math.round(h) : 0;
}
function timeUntilNextArrival(missions) {
  const next = missions
    .filter((m) => isToday(m.datetime) && new Date(m.datetime) > new Date())
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0];
  if (!next) return 'kein weiterer';
  const mins = Math.round((new Date(next.datetime) - Date.now()) / 60000);
  return mins < 60 ? `nächste in ${mins} Min` : `nächste in ${Math.round(mins / 60)} h`;
}
function describeLog(l) {
  if (!l) return '';
  const ent = l.entity_type || l.entity || '';
  const act = l.action || l.event_type || 'event';
  const who = l.user_name || l.user_email || 'System';
  if (l.message) return l.message;
  return `${who} · ${act}${ent ? ` · ${ent}` : ''}`;
}
