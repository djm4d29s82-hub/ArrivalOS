import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plane, MapPin, Home, Smartphone, FileText, Landmark, CheckCircle2, Circle, Clock,
  Phone, MessageCircle, ChevronRight, Sparkles, Navigation as NavIcon, Timer,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { STAGE_LABELS_DE } from '@/api';
import { Card, Avatar, Pill, Button, SectionHeader } from '@/components/ui';
import { getStatusLabel } from '@/lib/missionStateMachine';
import { relativeTime, relativeStepDate } from '@/lib/utils';
import MissionKernel from '@/components/mission/MissionKernel';
import { talentKernel } from '@/lib/missionKernel';
import { JOURNEY_STEPS, journeyProgress, resolveStepMeta } from '@/lib/journeySteps';

/**
 * TalentDashboard — emotional, warm welcome screen.
 * Greeting + journey progress + next steps + greeter card + appointments + documents.
 */
export default function TalentDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [steps, setSteps] = useState([]);
  const [greeter, setGreeter] = useState(null);
  const [mission, setMission] = useState(null);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const cid = user?.candidate_id || 'ca1';
    let interval;
    const load = async () => {
      const c = await base44.entities.Candidate.get(cid);
      setCandidate(c);
      const ms = await base44.entities.Mission.filter({ candidate_id: cid });
      if (ms.length) {
        const active = ms.find((m) => ['assigned', 'in_progress'].includes(m.status)) || ms[0];
        setMission(active);
        const js = await base44.entities.JourneyStep.filter({ mission_id: active.id }, 'order');
        setSteps(js);
        if (active.greeter_id) {
          const g = await base44.entities.GreeterProfile.get(active.greeter_id);
          setGreeter(g);
        }
      }
      try {
        const docs = await base44.entities.Document.filter({ candidate_id: cid });
        setDocuments(docs);
      } catch { /* empty */ }
    };
    load();
    interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, [user]);

  // Single source of truth for journey position (replaces dual progress model)
  const jp = journeyProgress(steps);
  const progressPct = steps.length ? Math.round((jp.completed / jp.total) * 100) : (candidate?.progress ?? 0);
  const arrivalDate = candidate?.arrival_date;
  const daysToArrival = arrivalDate ? Math.ceil((new Date(arrivalDate) - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  // Full journey timeline — real DB steps, or the static plan as a fallback.
  const journeyList = steps.length > 0
    ? steps
    : JOURNEY_STEPS.map((m, i) => ({ id: `f-${i}`, key: m.key, title: m.title, description: m.short, status: 'pending' }));

  return (
    <div className="max-w-4xl space-y-6">
      {/* Hero greeting */}
      <div className="rounded-2xl overflow-hidden -mx-1">
        <div className="px-7 pt-8 pb-7 bg-gradient-to-br from-navy via-navy to-navy-2 text-cream">
          <div className="text-[11px] uppercase tracking-[0.16em] text-gold font-bold mb-1.5">
            Deine Journey
          </div>
          <h1 className="font-serif text-[32px] md:text-[38px] leading-[1.1] font-bold">
            Schön, dass du da bist, {candidate?.full_name?.split(' ')[0] || 'Talent'}.
          </h1>
          <p className="text-cream/75 text-[14px] mt-2 max-w-lg leading-relaxed">
            {daysToArrival !== null && daysToArrival > 0 && <>Deine Reise nach <strong className="text-cream">{candidate?.city || 'Deutschland'}</strong> beginnt in {daysToArrival} Tagen.</>}
            {daysToArrival === 0 && 'Heute ist dein erster Tag. Willkommen in Deutschland.'}
            {daysToArrival !== null && daysToArrival < 0 && <>Du bist angekommen. Wie läuft&apos;s?</>}
            {daysToArrival === null && <>Auf dem Weg nach <strong className="text-cream">{candidate?.city || 'Deutschland'}</strong>.</>}
          </p>

          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[11px] uppercase tracking-widest text-cream/55 font-semibold">Schritt {Math.min(jp.currentIndex + 1, jp.total)} von {jp.total}</div>
              <div className="font-serif text-3xl font-bold text-gold tabular-nums">{progressPct}%</div>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-gold to-[#e8c875] transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* MISSION KERNEL — Wo bin ich? Was kommt als Nächstes? */}
      {(() => {
        const k = talentKernel({ mission, steps });
        return (
          <MissionKernel
            eyebrow="Deine Journey"
            statement={k.statement}
            sub={k.sub}
            progress={{ index: jp.currentIndex, total: jp.total }}
            primaryAction={k.actionLabel ? { label: k.actionLabel, onClick: () => nav('/talent/greeter'), variant: 'gold' } : undefined}
          />
        );
      })()}

      {/* Live Greeter Tracker */}
      {mission?.greeter_stage && mission.greeter_stage !== 'completed' && greeter && (
        <LiveGreeterTracker mission={mission} greeter={greeter} />
      )}

      {/* Greeter card */}
      {greeter && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <div className="p-5 flex items-center gap-4">
            <Avatar name={greeter.full_name} size="xl" ringed />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[0.14em] font-bold mb-0.5" style={{ color: '#c49228' }}>Dein Greeter</div>
              <div className="font-serif text-xl font-bold" style={{ color: 'var(--ds-t1)' }}>{greeter.full_name}</div>
              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                {greeter.languages?.slice(0, 3).map((l) => (
                  <Pill key={l} tone="navy" size="xs">{l}</Pill>
                ))}
                {greeter.rating && (
                  <Pill tone="gold" size="xs">★ {greeter.rating.toFixed(1)}</Pill>
                )}
              </div>
              {greeter.phone && (
                <div className="flex items-center gap-1.5 mt-2 text-[12.5px]" style={{ color: 'var(--ds-t2)' }}>
                  <Phone className="w-3.5 h-3.5" style={{ color: '#c49228' }} />
                  <span className="tabular-nums">{greeter.phone}</span>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
            <Link to="/talent/messages" className="flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition" style={{ color: 'var(--ds-t1)' }}>
              <MessageCircle className="w-4 h-4" style={{ color: '#c49228' }} /> Chat
            </Link>
            {greeter.phone && (
              <a href={`tel:${greeter.phone}`} className="flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition" style={{ color: 'var(--ds-t1)', borderLeft: '1px solid var(--ds-card-border)' }}>
                <Phone className="w-4 h-4" style={{ color: '#c49228' }} /> Anrufen
              </a>
            )}
          </div>
        </div>
      )}

      {/* Kein Greeter zugewiesen — kein leerer State ohne Erklärung */}
      {!greeter && (
        <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <div className="w-9 h-9 rounded-full grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.12)', color: '#c49228' }}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-[13px] leading-relaxed" style={{ color: 'var(--ds-t2)' }}>
            Dein Greeter wird gerade zugewiesen — du erfährst es hier, sobald jemand bestätigt ist.
          </div>
        </div>
      )}

      {/* Journey timeline — the full plan, on one screen (merged from TalentJourney) */}
      <section>
        <SectionHeader title="Deine Journey" count={`${jp.completed}/${journeyList.length}`} />
        <div className="space-y-2.5 animate-stagger">
          {journeyList.map((s) => {
            const meta = resolveStepMeta(s);
            const Icon = meta.icon;
            const done = s.status === 'completed';
            const isInProgress = s.status === 'in_progress';
            return (
              <div
                key={s.id}
                className="px-4 py-3.5 flex items-center gap-3 rounded-xl"
                style={{
                  background: 'var(--ds-card)',
                  border: `1px solid ${isInProgress ? 'rgba(196,146,40,0.35)' : 'var(--ds-card-border)'}`,
                  opacity: (!done && !isInProgress) ? 0.7 : 1,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                  style={{
                    background: done ? 'rgba(34,197,94,0.12)' : isInProgress ? 'rgba(196,146,40,0.15)' : 'var(--ds-card-border)',
                    color: done ? '#16a34a' : isInProgress ? '#c49228' : 'var(--ds-t2)',
                  }}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" strokeWidth={2.2} /> : <Icon className="w-4 h-4" strokeWidth={2.2} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[14px]" style={{ color: done ? 'var(--ds-t3)' : 'var(--ds-t1)', textDecoration: done ? 'line-through' : 'none' }}>{s.title || meta.title}</div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>{s.description || meta.short}</div>
                  {!done && s.scheduled_at && (
                    <div className="text-[11px] mt-1 inline-flex items-center gap-1" style={{ color: '#c49228' }}>
                      <Clock className="w-3 h-3" /> {relativeStepDate(s.scheduled_at)}
                    </div>
                  )}
                </div>
                {done ? (
                  <Pill tone="green" size="xs">Erledigt</Pill>
                ) : isInProgress ? (
                  <Pill tone="gold" size="xs">Läuft</Pill>
                ) : (
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-t3)' }} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Documents */}
      <section>
        <SectionHeader
          title="Deine Dokumente"
          count={documents.length || undefined}
          action={
            <Link to="/talent/documents" className="text-[12px] text-gold font-medium hover:underline">
              Alle ansehen →
            </Link>
          }
        />
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          {documents.length === 0 && (
            <div className="px-4 py-6 text-center">
              <Sparkles className="w-5 h-5 mx-auto mb-2" style={{ color: '#c49228' }} />
              <div className="text-[13px]" style={{ color: 'var(--ds-t2)' }}>Noch keine Dokumente hochgeladen.</div>
              <Link to="/talent/documents">
                <Button variant="outline" size="sm" className="mt-3">Dokumente hochladen</Button>
              </Link>
            </div>
          )}
          {documents.slice(0, 4).map((d, i) => (
            <div key={d.id} className="px-4 py-3 flex items-center gap-3" style={i > 0 ? { borderTop: '1px solid var(--ds-card-border)' } : {}}>
              <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.10)' }}>
                <FileText className="w-3.5 h-3.5" style={{ color: '#c49228' }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[13px] truncate" style={{ color: 'var(--ds-t1)' }}>{d.name || d.title}</div>
                <div className="text-[11px]" style={{ color: 'var(--ds-t2)' }}>{d.type || 'Dokument'}</div>
              </div>
              {d.verified ? (
                <Pill tone="green" size="xs" icon={CheckCircle2}>Geprüft</Pill>
              ) : (
                <Pill tone="amber" size="xs">In Prüfung</Pill>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const STAGE_STEP_LABELS = {
  accepted: 'Greeter angenommen',
  eta_sent: 'ETA bestätigt',
  on_the_way: 'Greeter ist unterwegs zu dir',
  arrived: 'Greeter ist am Treffpunkt',
  in_progress: 'Ihr seid gemeinsam unterwegs',
  wrap_up: 'Letzte Schritte',
};

function LiveGreeterTracker({ mission, greeter }) {
  const stage = mission.greeter_stage;
  const STAGES = ['accepted', 'eta_sent', 'on_the_way', 'arrived', 'in_progress'];
  const idx = STAGES.indexOf(stage);
  const pct = idx >= 0 ? ((idx + 1) / STAGES.length) * 100 : 0;

  return (
    <Card variant="default" className="overflow-hidden border-gold/30">
      <div className="px-5 pt-4 pb-3 bg-gradient-to-br from-gold/[0.08] to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
          </span>
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-[#8a6818] font-bold">Live</span>
        </div>
        <div className="flex items-start gap-3">
          <Avatar name={greeter.full_name} size="md" ringed />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[14px] leading-tight" style={{ color: 'var(--ds-t1)' }}>
              {STAGE_STEP_LABELS[stage] || getStatusLabel(stage) || stage}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>
              {greeter.full_name}
              {mission.eta_at && stage === 'eta_sent' && (
                <> · <span className="font-medium" style={{ color: 'var(--ds-t1)' }}>ETA {formatTime(mission.eta_at)}</span></>
              )}
              {mission.checked_in_at && stage === 'arrived' && (
                <> · angekommen {relativeTime(mission.checked_in_at)}</>
              )}
            </div>
          </div>
        </div>

        {mission.eta_note && stage === 'eta_sent' && (
          <div className="mt-3 px-3 py-2 rounded-lg text-[12px]" style={{ background: 'rgba(196,146,40,0.10)', color: 'var(--ds-t1)' }}>
            <Timer className="w-3 h-3 inline mr-1" style={{ color: '#c49228' }} />
            {mission.eta_note}
          </div>
        )}

        <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: 'var(--ds-card-border)' }}>
          <div className="h-full bg-gradient-to-r from-gold to-[#e8c875] transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[9.5px] uppercase tracking-wider">
          {STAGES.map((s, i) => (
            <span key={s} style={{ color: i <= idx ? 'var(--ds-t1)' : 'var(--ds-t3)', fontWeight: i <= idx ? 600 : 400 }}>
              {STAGE_LABELS_DE[s]?.split(' ')[0]}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
        <Link to="/talent/messages" className="flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition" style={{ color: 'var(--ds-t1)' }}>
          <MessageCircle className="w-4 h-4" style={{ color: '#c49228' }} /> Nachricht
        </Link>
        {greeter.phone && (
          <a href={`tel:${greeter.phone}`} className="flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition" style={{ color: 'var(--ds-t1)', borderLeft: '1px solid var(--ds-card-border)' }}>
            <Phone className="w-4 h-4" style={{ color: '#c49228' }} /> Anrufen
          </a>
        )}
      </div>
    </Card>
  );
}

function formatTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—';
}
