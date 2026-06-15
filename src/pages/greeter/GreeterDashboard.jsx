import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, MapPin, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { assignGreeter } from '@/api';
import { notify } from '@/lib/notify';
import { useToast } from '@/components/ui/toaster';
import MissionKernel from '@/components/mission/MissionKernel';
import { greeterKernel, greeterProgress } from '@/lib/missionKernel';
import { relativeStepDate } from '@/lib/utils';
import { resolveStepMeta } from '@/lib/journeySteps';

const STATUS_CFG = {
  matched:     { bg: 'rgba(167,139,250,0.15)', color: '#c4b5fd', label: 'Matched' },
  assigned:    { bg: 'rgba(96,165,250,0.15)',  color: '#93c5fd', label: 'Zugewiesen' },
  in_progress: { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', label: 'In Arbeit' },
  completed:   { bg: 'rgba(74,222,128,0.15)',  color: '#86efac', label: 'Abgeschlossen' },
};

export default function GreeterHome() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (user?.email) base44.entities.GreeterProfile.filter({ email: user.email }).then((p) => setProfile(p[0]));
  }, [user?.email]);

  // Poll so a greeter's step check-off (and status changes) surface here within a few seconds.
  const { data: missions = [] }   = useQuery({ queryKey: ['missions'],     queryFn: () => base44.entities.Mission.list('-created_at'), refetchInterval: 12000 });
  const { data: candidates = [] } = useQuery({ queryKey: ['candidates'],   queryFn: () => base44.entities.Candidate.list() });
  const { data: allSteps = [] }   = useQuery({ queryKey: ['journeySteps'], queryFn: () => base44.entities.JourneyStep.list(), refetchInterval: 12000 });

  if (!profile) return (
    <div className="py-16 text-center text-sm" style={{ color: 'var(--ds-t3)' }}>Profil wird geladen…</div>
  );

  const mine = missions.filter((m) => m.greeter_id === profile.id);

  // Task-view: aggregate scheduled journey steps across all of the greeter's missions.
  const mineIds = new Set(mine.map((m) => m.id));
  const missionById = Object.fromEntries(mine.map((m) => [m.id, m]));
  const candidateFor = (mid) => candidates.find((c) => c.id === missionById[mid]?.candidate_id);
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(endOfToday.getTime() + 7 * 86400000);
  const openSteps = allSteps
    .filter((s) => mineIds.has(s.mission_id) && s.status !== 'completed' && s.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const dueToday = openSteps.filter((s) => new Date(s.scheduled_at) <= endOfToday); // today + overdue
  const dueWeek  = openSteps.filter((s) => { const t = new Date(s.scheduled_at); return t > endOfToday && t <= endOfWeek; });
  const newRequests = missions.filter((m) => m.status === 'matched' && m.matched_greeters?.includes(profile.id));
  const today    = mine.filter((m) => isToday(m.datetime) && m.status !== 'completed');
  const upcoming = mine.filter((m) => !isToday(m.datetime) && new Date(m.datetime) > new Date() && m.status !== 'completed').slice(0, 3);
  const doneThisMonth = mine.filter((m) => m.status === 'completed' && isThisMonth(m.completed_at || m.updated_at)).length;
  const earningsThisMonth = mine
    .filter((m) => m.status === 'completed' && isThisMonth(m.completed_at || m.updated_at))
    .reduce((sum, m) => sum + (Number(m.pay) || 0), 0);

  const onAccept = async (m) => {
    try {
      await assignGreeter({ mission: m, greeterId: profile.id, role: user?.role || 'greeter', actor: user?.email || profile.email, base44 });
      await notify({
        userEmail: user?.email, title: 'Mission angenommen!',
        message: `Du hast Mission "${m.title}" angenommen.`, type: 'success', missionId: m.id,
      });
      toast({ title: 'Einsatz angenommen', description: m.title });
      qc.invalidateQueries();
    } catch (e) {
      toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8 pb-12">

      {/* Welcome hero */}
      <div className="rounded-2xl overflow-hidden relative" style={{ background: 'var(--ds-card)', border: '1px solid rgba(196,146,40,0.25)' }}>
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 100% at 0% 50%, rgba(196,146,40,0.07), transparent)' }} />
        <div className="px-7 pt-8 pb-7 relative">
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold mb-2" style={{ color: '#c49228' }}>
            {greetingForTime()} · {todayLabel()}
          </div>
          <h1 className="font-serif text-[32px] md:text-[38px] leading-[1.1] font-bold" style={{ color: 'var(--ds-t1)' }}>
            {greetingForTime()}, {profile.full_name?.split(' ')[0] || 'Greeter'}.
          </h1>
          <p className="text-[14px] mt-2" style={{ color: 'var(--ds-t2)' }}>
            {today.length > 0
              ? today.length === 1 ? 'Jemand wartet heute auf dich.' : `${today.length} Menschen warten heute auf dich.`
              : newRequests.length > 0
                ? `${newRequests.length} ${newRequests.length === 1 ? 'neue Anfrage' : 'neue Anfragen'} warten auf dich.`
                : 'Heute keine Einsätze geplant.'}
          </p>

          {/* Stats — ruhige Zeile, sekundär zur Begrüßung */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5">
            {[
              { n: today.length, l: 'Heute' },
              { n: doneThisMonth, l: 'Geholfen' },
              { n: profile.rating?.toFixed(1) || '—', l: 'Rating' },
              { n: earningsThisMonth > 0 ? `${earningsThisMonth} €` : '—', l: 'Verdient' },
            ].map((s) => (
              <div key={s.l} className="flex items-baseline gap-1.5">
                <span className="font-serif text-[18px] font-bold tabular-nums" style={{ color: '#c49228' }}>{s.n}</span>
                <span className="text-[10.5px] uppercase tracking-widest" style={{ color: 'var(--ds-t3)' }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New requests */}
      {newRequests.length > 0 && (
        <section>
          <SectionLabel title="Neue Anfragen" count={newRequests.length} />
          <div className="space-y-3">
            {newRequests.slice(0, 3).map((m) => {
              const candidate = candidates.find((c) => c.id === m.candidate_id);
              return (
                <div key={m.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(96,165,250,0.15)', color: '#93c5fd' }}>Neue Anfrage</span>
                      <span className="text-[11px] tabular-nums" style={{ color: 'var(--ds-t3)' }}>{formatShort(m.datetime)}</span>
                    </div>
                    <div className="font-semibold text-[15px]" style={{ color: 'var(--ds-t1)' }}>{m.title}</div>
                    <div className="flex items-center gap-1.5 text-[12px] mt-1" style={{ color: 'var(--ds-t3)' }}>
                      <MapPin className="w-3 h-3" style={{ color: '#c49228' }} />
                      {m.location || m.city}
                      {m.pay && <><span style={{ color: 'var(--ds-t3)' }}>·</span><span className="font-medium" style={{ color: 'var(--ds-t1)' }}>{m.pay} €</span></>}
                    </div>
                    {candidate && (
                      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
                        <div className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold shrink-0" style={{ background: 'rgba(196,146,40,0.15)', color: '#c49228' }}>
                          {candidate.full_name?.[0]}
                        </div>
                        <div className="text-[12px]" style={{ color: 'var(--ds-t2)' }}>
                          <span className="font-medium" style={{ color: 'var(--ds-t1)' }}>{candidate.full_name}</span>
                          {candidate.languages?.length > 0 && <span> · {candidate.languages.slice(0, 2).join(', ')}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                    <Link
                      to={`/greeter-dashboard/missions/${m.id}`}
                      className="text-center py-2 rounded-full text-[13px] font-medium transition"
                      style={{ border: '1px solid var(--ds-card-border)', color: 'var(--ds-t2)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-card-hover)'; e.currentTarget.style.color = 'var(--ds-t1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ds-t2)'; }}
                    >
                      Details
                    </Link>
                    <button
                      onClick={() => onAccept(m)}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-full text-[13px] font-medium transition"
                      style={{ background: '#c49228', color: '#0c1220' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#d4a83a'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(196,146,40,.35)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#c49228'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Annehmen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Fällige Aufgaben — Steps aus ALLEN Missionen, nach Datum aggregiert */}
      {dueToday.length > 0 && (
        <section>
          <SectionLabel title="Fällige Aufgaben" count={dueToday.length} />
          <div className="space-y-2">
            {dueToday.map((s) => (
              <TaskRow key={s.id} step={s} mission={missionById[s.mission_id]} candidate={candidateFor(s.mission_id)} />
            ))}
          </div>
        </section>
      )}

      {/* Aufgaben diese Woche — nächste 7 Tage (immer sichtbar als Wochen-Überblick) */}
      <section>
        <SectionLabel title="Aufgaben diese Woche" count={dueWeek.length} />
        {dueWeek.length > 0 ? (
          <div className="space-y-2">
            {dueWeek.map((s) => (
              <TaskRow key={s.id} step={s} mission={missionById[s.mission_id]} candidate={candidateFor(s.mission_id)} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl px-6 py-8 text-center" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <CheckCircle2 className="w-7 h-7 mx-auto mb-2.5" style={{ color: 'var(--ds-t3)' }} />
            <div className="text-[13px] font-medium" style={{ color: 'var(--ds-t2)' }}>Diese Woche keine geplanten Aufgaben.</div>
          </div>
        )}
      </section>

      {/* Today's missions — dringendste als Kernel, Rest als ruhige Zeilen */}
      <section>
        <SectionLabel title="Heutige Einsätze" count={today.length} />
        {today.length === 0 ? (
          <div className="rounded-2xl px-6 py-10 text-center" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <Briefcase className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--ds-t3)' }} />
            <div className="text-[13px] font-medium mb-1" style={{ color: 'var(--ds-t2)' }}>Heute ist frei</div>
            <div className="text-[12px]" style={{ color: 'var(--ds-t3)' }}>Keine bestätigten Einsätze heute.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {[...today].sort((a, b) => new Date(a.datetime) - new Date(b.datetime)).map((m, idx) => {
              const candidate = candidates.find((c) => c.id === m.candidate_id);
              const timeStr = timeOf(m.datetime);
              const minsTo = Math.round((new Date(m.datetime) - Date.now()) / 60000);
              const upcomingSoon = minsTo > 0 && minsTo < 120;

              // Dringendste Mission → MissionKernel (1 Aussage · 1 Aktion)
              if (idx === 0) {
                return (
                  <MissionKernel
                    key={m.id}
                    eyebrow={`${upcomingSoon ? `in ${minsTo} Min` : 'Heute'} · ${timeStr}`}
                    statement={greeterKernel(m, candidate?.full_name).statement}
                    sub={m.location || m.city}
                    progress={greeterProgress(m)}
                    primaryAction={{ label: 'Einsatz öffnen', onClick: () => nav(`/greeter-dashboard/missions/${m.id}`) }}
                  />
                );
              }

              // Weitere heutige Einsätze → ruhige Zeile
              const cfg = STATUS_CFG[m.status] || { bg: 'rgba(196,146,40,0.12)', color: '#c49228', label: m.status };
              return (
                <Link
                  key={m.id}
                  to={`/greeter-dashboard/missions/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all"
                  style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(196,146,40,0.25)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ds-card-border)'; }}
                >
                  <div className="text-center w-12 shrink-0">
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ds-t3)' }}>heute</div>
                    <div className="font-serif text-lg font-bold tabular-nums leading-none mt-0.5" style={{ color: 'var(--ds-t1)' }}>{timeStr}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[13.5px] truncate" style={{ color: 'var(--ds-t1)' }}>{m.title}</div>
                    <div className="flex items-center gap-1.5 text-[11.5px] mt-0.5" style={{ color: 'var(--ds-t3)' }}>
                      <MapPin className="w-3 h-3" style={{ color: '#c49228' }} /> {m.location || m.city}
                    </div>
                  </div>
                  <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming this week */}
      {upcoming.length > 0 && (
        <section>
          <SectionLabel title="Diese Woche" count={upcoming.length} action={
            <Link to="/greeter-dashboard/missions" className="text-[12px] font-medium" style={{ color: '#c49228' }}>Alle →</Link>
          } />
          <div className="space-y-2">
            {upcoming.map((m) => {
              const candidate = candidates.find((c) => c.id === m.candidate_id);
              const cfg = STATUS_CFG[m.status] || { bg: 'rgba(196,146,40,0.12)', color: '#c49228', label: m.status };
              return (
                <Link key={m.id} to={`/greeter-dashboard/missions/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all"
                  style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-card-hover)'; e.currentTarget.style.borderColor = 'rgba(196,146,40,0.25)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-card)'; e.currentTarget.style.borderColor = 'var(--ds-card-border)'; }}
                >
                  <div className="text-center w-12 shrink-0">
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ds-t3)' }}>{dayShort(m.datetime)}</div>
                    <div className="font-serif text-lg font-bold tabular-nums leading-none mt-0.5" style={{ color: 'var(--ds-t1)' }}>{dayOf(m.datetime)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[13.5px] truncate" style={{ color: 'var(--ds-t1)' }}>{m.title}</div>
                    <div className="flex items-center gap-1.5 text-[11.5px] mt-0.5" style={{ color: 'var(--ds-t3)' }}>
                      <Clock className="w-3 h-3" /> {timeOf(m.datetime)}
                      <MapPin className="w-3 h-3 ml-1" /> {m.city || '—'}
                    </div>
                  </div>
                  <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function TaskRow({ step, mission, candidate }) {
  const due = relativeStepDate(step.scheduled_at);
  const overdue = due.includes('überfällig');
  const StepIcon = resolveStepMeta(step).icon;
  return (
    <Link
      to={`/greeter-dashboard/missions/${step.mission_id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
      style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(196,146,40,0.25)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ds-card-border)'; }}
    >
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.10)', color: '#c49228' }}>
        <StepIcon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-[13.5px] truncate" style={{ color: 'var(--ds-t1)' }}>{step.title}</div>
        <div className="flex items-center gap-1.5 text-[11.5px] mt-0.5" style={{ color: 'var(--ds-t3)' }}>
          <span className="truncate">{candidate?.full_name || mission?.title || 'Mission'}</span>
          {due && <span style={{ color: overdue ? '#dc2626' : 'var(--ds-t3)' }}>· {due}</span>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-t3)' }} />
    </Link>
  );
}

function SectionLabel({ title, count, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <span className="font-serif text-[18px] font-bold" style={{ color: 'var(--ds-t1)' }}>{title}</span>
        {count > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(196,146,40,0.15)', color: '#c49228' }}>{count}</span>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function greetingForTime() { const h = new Date().getHours(); if (h < 11) return 'Guten Morgen'; if (h < 18) return 'Guten Tag'; return 'Guten Abend'; }
function todayLabel() { return new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' }); }
function isToday(iso) { if (!iso) return false; const d = new Date(iso); return d.toDateString() === new Date().toDateString(); }
function isThisMonth(iso) { if (!iso) return false; const d = new Date(iso); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }
function timeOf(iso) { return iso ? new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—'; }
function dayOf(iso) { return iso ? String(new Date(iso).getDate()).padStart(2, '0') : '—'; }
function dayShort(iso) { return iso ? new Date(iso).toLocaleDateString('de-DE', { weekday: 'short' }) : ''; }
function formatShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) + ', ' + timeOf(iso);
}
