import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, ChevronRight, ChevronDown, Plus, Calendar, Filter } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, SearchInput, Select } from '@/components/ui';
import { missionProgress } from '@/lib/missionKernel';
import CompanyArrivalForm from './CompanyArrivalForm';

const STATUS_CFG = {
  matched:     { bg: 'rgba(167,139,250,0.15)', color: '#c4b5fd', label: 'Matched',        progress: 25 },
  assigned:    { bg: 'rgba(96,165,250,0.15)',  color: '#93c5fd', label: 'Zugewiesen',     progress: 50 },
  in_progress: { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', label: 'In Arbeit',      progress: 75 },
  completed:   { bg: 'rgba(74,222,128,0.15)',  color: '#86efac', label: 'Abgeschlossen',  progress: 100 },
  created:     { bg: 'rgba(196,146,40,0.12)',  color: '#c49228', label: 'Geplant',        progress: 5 },
};

const FILTER_STATUSES = ['created', 'matched', 'assigned', 'in_progress', 'completed', 'cancelled'];
const FILTER_LABELS = {
  created: 'Geplant', matched: 'Matched', assigned: 'Zugewiesen',
  in_progress: 'Läuft', completed: 'Abgeschlossen', cancelled: 'Storniert',
};
const ACTIVE_STATUSES = ['matched', 'assigned', 'accepted', 'on_the_way', 'arrived', 'met_talent', 'in_progress'];

/**
 * CompanyHome — the single company landing page.
 * Merges the old CompanyDashboard (hero + stats + active/planned) with the old
 * CompanyMissions (search + status filter + full list). One arrival flow:
 * the "Neue Ankunft" button opens the CompanyArrivalForm wizard.
 */
export default function CompanyDashboard() {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const [showArrivalForm, setShowArrivalForm] = useState(false);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: missions = [] }   = useQuery({ queryKey: ['missions'],     queryFn: () => base44.entities.Mission.list('-datetime') });
  const { data: candidates = [] } = useQuery({ queryKey: ['candidates'],   queryFn: () => base44.entities.Candidate.list() });
  const { data: greeters = [] }   = useQuery({ queryKey: ['greeters'],     queryFn: () => base44.entities.GreeterProfile.list() });
  const { data: allSteps = [] }   = useQuery({ queryKey: ['journeySteps'], queryFn: () => base44.entities.JourneyStep.list() });

  const stepsByMission = useMemo(() => {
    const map = {};
    for (const s of allSteps) { (map[s.mission_id] ||= []).push(s); }
    return map;
  }, [allSteps]);

  const myMissions   = companyId ? missions.filter((m) => m.company_id === companyId) : missions;
  const myCandidates = companyId ? candidates.filter((c) => c.company_id === companyId) : candidates;
  const active    = myMissions.filter((m) => ACTIVE_STATUSES.includes(m.status));
  const planned   = myMissions.filter((m) => m.status === 'created');
  const completed = myMissions.filter((m) => m.status === 'completed');
  const done = completed.length;

  const isFiltering = q.trim() !== '' || statusFilter !== 'all';
  const filtered = myMissions.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (q && !`${m.title} ${m.city} ${m.location || ''}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const renderLine = (m) => (
    <MissionLine
      key={m.id}
      mission={m}
      candidate={candidates.find((c) => c.id === m.candidate_id)}
      greeter={greeters.find((g) => g.id === m.greeter_id)}
      steps={stepsByMission[m.id]}
    />
  );

  return (
    <>
    <div className="space-y-8 pb-12">

      {/* Welcome hero */}
      <div className="rounded-2xl overflow-hidden relative" style={{ background: 'var(--ds-card)', border: '1px solid rgba(196,146,40,0.25)' }}>
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 100% at 0% 50%, rgba(196,146,40,0.07), transparent)' }} />
        <div className="px-7 pt-8 pb-7 relative">
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold mb-2" style={{ color: '#c49228' }}>
            Ihre Talente · Live
          </div>
          <h1 className="font-serif text-[32px] md:text-[38px] leading-[1.1] font-bold" style={{ color: 'var(--ds-t1)' }}>
            Willkommen, {user?.full_name?.split(' ')[0] || 'Team'}.
          </h1>
          <p className="text-[14px] mt-2 max-w-lg leading-relaxed" style={{ color: 'var(--ds-t2)' }}>
            {active.length > 0
              ? `${active.length} ${active.length === 1 ? 'Mission läuft' : 'Missionen laufen'} gerade. Jede sichtbar — in Echtzeit.`
              : 'Jede Ankunft. Jeder Greeter. Jeder Status — in Echtzeit.'}
          </p>

          <div className="grid grid-cols-4 gap-5 mt-6">
            {[
              { n: myCandidates.length, l: 'Talente' },
              { n: active.length,       l: 'Aktiv' },
              { n: done,                l: 'Abgeschlossen' },
              { n: myMissions.length,   l: 'Missionen' },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-serif text-3xl font-bold tabular-nums" style={{ color: '#c49228' }}>{s.n}</div>
                <div className="text-[10px] uppercase tracking-widest mt-1" style={{ color: 'var(--ds-t3)' }}>{s.l}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowArrivalForm(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all hover:-translate-y-px"
            style={{ background: '#c49228', color: '#0c1220' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#d4a83a'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(196,146,40,.35)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#c49228'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <Plus className="w-4 h-4" /> Neue Ankunft planen
          </button>
        </div>
      </div>

      {/* Search + status filter */}
      <Card variant="default" className="px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titel, Stadt oder Treffpunkt…" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--light)]" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Alle Status</option>
            {FILTER_STATUSES.map((s) => <option key={s} value={s}>{FILTER_LABELS[s]}</option>)}
          </Select>
        </div>
      </Card>

      {isFiltering ? (
        /* Filtered results */
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="font-serif text-[18px] font-bold" style={{ color: 'var(--ds-t1)' }}>Ergebnisse</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(196,146,40,0.15)', color: '#c49228' }}>{filtered.length}</span>
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-2xl px-6 py-10 text-center" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
              <Briefcase className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--ds-t3)' }} />
              <div className="text-[13px] font-medium" style={{ color: 'var(--ds-t2)' }}>Keine Missionen gefunden</div>
            </div>
          ) : (
            <div className="space-y-2">{filtered.map(renderLine)}</div>
          )}
        </section>
      ) : (
        <>
          {/* Active missions */}
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="font-serif text-[18px] font-bold" style={{ color: 'var(--ds-t1)' }}>Laufende Einsätze</span>
              {active.length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(196,146,40,0.15)', color: '#c49228' }}>{active.length}</span>
              )}
            </div>
            {active.length === 0 ? (
              <div className="rounded-2xl px-6 py-10 text-center" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
                <Briefcase className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--ds-t3)' }} />
                <div className="text-[13px] font-medium" style={{ color: 'var(--ds-t2)' }}>Aktuell keine aktiven Einsätze</div>
              </div>
            ) : (
              <div className="space-y-2">{active.map(renderLine)}</div>
            )}
          </section>

          {/* Planned arrivals */}
          {planned.length > 0 && (
            <section>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="font-serif text-[18px] font-bold" style={{ color: 'var(--ds-t1)' }}>Geplante Ankünfte</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(196,146,40,0.15)', color: '#c49228' }}>{planned.length}</span>
              </div>
              <div className="space-y-2">
                {planned.map((m) => (
                  <PlannedRow key={m.id} mission={m} candidate={candidates.find((c) => c.id === m.candidate_id)} />
                ))}
              </div>
            </section>
          )}

          {/* Completed (collapsible) */}
          {completed.length > 0 && (
            <section>
              <button onClick={() => setShowCompleted((v) => !v)} className="flex items-center gap-2.5 mb-4">
                <span className="font-serif text-[18px] font-bold" style={{ color: 'var(--ds-t1)' }}>Abgeschlossen</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.15)', color: '#16a34a' }}>{completed.length}</span>
                <ChevronDown className={`w-4 h-4 transition ${showCompleted ? 'rotate-180' : ''}`} style={{ color: 'var(--ds-t3)' }} />
              </button>
              {showCompleted && <div className="space-y-2">{completed.map(renderLine)}</div>}
            </section>
          )}
        </>
      )}
    </div>

    <CompanyArrivalForm open={showArrivalForm} onOpenChange={setShowArrivalForm} />
    </>
  );
}

function MissionLine({ mission, candidate, greeter, steps }) {
  const cfg = STATUS_CFG[mission.status] || { bg: 'rgba(196,146,40,0.12)', color: '#c49228', label: mission.status, progress: 10 };
  const prog = missionProgress(mission, steps);
  const stateMsg = {
    matched:     'Greeter wird zugewiesen.',
    assigned:    'Greeter ist bereit.',
    in_progress: 'Ankunft läuft gerade.',
    completed:   'Erfolgreich angekommen.',
  }[mission.status];

  const arrivalStr = mission.datetime
    ? new Date(mission.datetime).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) + ', ' +
      new Date(mission.datetime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Link
      to={`/company/missions/${mission.id}`}
      className="block rounded-xl overflow-hidden transition-all"
      style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(196,146,40,0.25)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ds-card-border)'; }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        {candidate && (
          <div className="w-9 h-9 rounded-full grid place-items-center shrink-0 font-serif font-bold text-[13px]" style={{ background: 'rgba(196,146,40,0.15)', color: '#c49228' }}>
            {candidate.full_name?.[0] || '?'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-[13.5px] truncate" style={{ color: 'var(--ds-t1)' }}>{candidate?.full_name || mission.title}</span>
            <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] flex-wrap" style={{ color: 'var(--ds-t3)' }}>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" style={{ color: '#c49228' }} />
              {mission.city}
            </span>
            {greeter && <span style={{ color: 'var(--ds-t2)' }}>· {greeter.full_name?.split(' ')[0]}</span>}
            {arrivalStr && (
              <span className="flex items-center gap-1">
                · <Calendar className="w-3 h-3" /> {arrivalStr}
              </span>
            )}
          </div>
          {stateMsg && <div className="text-[10.5px] font-medium mt-0.5" style={{ color: 'rgba(196,146,40,0.80)' }}>{stateMsg}</div>}
        </div>

        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-t3)' }} />
      </div>

      {/* Progress bar — echte Fortschrittsquelle */}
      <div className="h-1" style={{ background: 'var(--ds-card-border)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${prog.pct}%`, background: 'linear-gradient(90deg, #c49228, #d4a83a)' }}
        />
      </div>
    </Link>
  );
}

function PlannedRow({ mission, candidate }) {
  const arrivalStr = mission.datetime
    ? new Date(mission.datetime).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' }) + ', ' +
      new Date(mission.datetime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <Link
      to={`/company/missions/${mission.id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
      style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(196,146,40,0.20)'; e.currentTarget.style.background = 'var(--ds-card-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ds-card-border)'; e.currentTarget.style.background = 'var(--ds-card)'; }}
    >
      <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.10)' }}>
        <Calendar className="w-3.5 h-3.5" style={{ color: '#c49228' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[13px] truncate" style={{ color: 'var(--ds-t1)' }}>
          {candidate?.full_name || mission.title}
        </div>
        <div className="text-[11.5px] flex items-center gap-1.5" style={{ color: 'var(--ds-t3)' }}>
          <MapPin className="w-3 h-3" style={{ color: '#c49228' }} /> {mission.city} · {arrivalStr}
        </div>
      </div>
      <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: 'rgba(196,146,40,0.12)', color: '#c49228' }}>
        Geplant
      </span>
    </Link>
  );
}
