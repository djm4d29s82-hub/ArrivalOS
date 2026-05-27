import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Pill } from '@/components/ui';
import { JOURNEY_STEPS } from '@/lib/journeySteps';

export default function TalentJourney() {
  const { user } = useAuth();
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentRef = useRef(null);

  useEffect(() => {
    const cid = user?.candidate_id || 'ca1';
    (async () => {
      try {
        const ms = await base44.entities.Mission.filter({ candidate_id: cid });
        if (ms.length) {
          const active = ms.find((m) => ['assigned', 'in_progress'].includes(m.status)) || ms[0];
          const js = await base44.entities.JourneyStep.filter({ mission_id: active.id }, 'order');
          if (js.length >= 8) {
            setSteps(js);
          } else {
            setSteps(JOURNEY_STEPS.map((c, i) => ({ id: `s-${i}`, title: c.title, status: 'pending', ...c })));
          }
        } else {
          setSteps(JOURNEY_STEPS.map((c, i) => ({ id: `s-${i}`, title: c.title, status: 'pending', ...c })));
        }
      } catch {
        setSteps(JOURNEY_STEPS.map((c, i) => ({ id: `s-${i}`, title: c.title, status: 'pending', ...c })));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  // Bring the current step into view once loaded — "where am I" should be immediate
  useEffect(() => {
    if (!loading && currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-[var(--mid)]">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back link */}
      <Link to="/talent" className="inline-flex items-center gap-1.5 text-[12.5px] transition" style={{ color: 'var(--ds-t2)' }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Zurück
      </Link>

      {/* Hero header */}
      <div className="rounded-2xl overflow-hidden bg-navy text-cream px-6 py-6">
        <div className="text-[10.5px] uppercase tracking-[0.18em] text-gold font-bold mb-1.5">Deine Journey</div>
        <h1 className="font-serif text-[26px] md:text-[30px] font-bold leading-[1.1]">
          Acht Momente.<br />Einer nach dem anderen.
        </h1>
        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[11px] uppercase tracking-widest text-cream/50 font-semibold">Fortschritt</div>
            <div className="text-[13px] text-cream/70">
              <span className="font-serif text-2xl font-bold text-gold">{completedCount}</span>
              <span className="text-cream/40"> / {steps.length} abgeschlossen</span>
            </div>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-[#e8c875] transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Connector line */}
        <div className="absolute left-[19px] top-4 bottom-4 w-[1.5px]" style={{ background: 'linear-gradient(to bottom, rgba(196,146,40,0.40), var(--ds-card-border))' }} />

        <div className="space-y-3">
          {steps.map((step, i) => {
            const cfg = JOURNEY_STEPS[i] || JOURNEY_STEPS[0];
            const Icon = cfg.icon;
            const isCompleted = step.status === 'completed';
            const isInProgress = step.status === 'in_progress';
            const isPending = !isCompleted && !isInProgress;

            return (
              <div key={step.id} ref={isInProgress ? currentRef : null} className="flex gap-4 items-start scroll-mt-24">
                {/* Timeline dot */}
                <div className="relative z-10 shrink-0 mt-4">
                  {isCompleted ? (
                    <div className="w-10 h-10 rounded-full bg-gold/15 border-2 border-gold grid place-items-center animate-step-complete">
                      <CheckCircle2 className="w-4 h-4 text-gold" strokeWidth={2.5} />
                    </div>
                  ) : isInProgress ? (
                    <div className="w-10 h-10 rounded-full border-2 border-gold grid place-items-center animate-pulse-ring" style={{ background: 'var(--ds-card)' }}>
                      <Icon className="w-4 h-4" style={{ color: 'var(--ds-t1)' }} strokeWidth={2.2} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full grid place-items-center opacity-40" style={{ background: 'var(--ds-card-border)', border: '1px solid var(--ds-card-border)' }}>
                      <Icon className="w-4 h-4" style={{ color: 'var(--ds-t2)' }} strokeWidth={2.2} />
                    </div>
                  )}
                </div>

                {/* Step card */}
                <div
                  className="flex-1 rounded-xl px-4 py-3.5 transition-all"
                  style={{
                    background: 'var(--ds-card)',
                    border: (isCompleted || isInProgress)
                      ? '1px solid rgba(196,146,40,0.30)'
                      : '1px solid var(--ds-card-border)',
                    borderLeft: (isCompleted || isInProgress) ? '3px solid #c49228' : undefined,
                    opacity: isPending ? 0.60 : 1,
                  }}
                >
                  {/* DU BIST HIER — current step marker */}
                  {isInProgress && (
                    <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: 'rgba(196,146,40,0.15)', color: '#c49228' }}>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gold" />
                      </span>
                      Du bist hier
                    </div>
                  )}
                  {/* Top row */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: 'var(--ds-t3)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-semibold text-[14px]" style={{ color: 'var(--ds-t1)' }}>{step.title || cfg.title}</span>
                    {isCompleted && <Pill tone="green" size="xs">Erledigt</Pill>}
                    {isInProgress && <Pill tone="gold" size="xs">Läuft</Pill>}
                  </div>

                  {/* Emotional subtitle — only for active/done */}
                  {(isCompleted || isInProgress) && (
                    <div className="font-serif text-[15px] leading-snug mt-1" style={{ color: 'var(--ds-t1)' }}>
                      {cfg.emotional}
                    </div>
                  )}

                  {/* Detail text */}
                  <div className={`text-[12.5px] leading-relaxed ${(isCompleted || isInProgress) ? 'mt-1' : 'mt-0.5'}`} style={{ color: 'var(--ds-t2)' }}>
                    {step.description || cfg.detail}
                  </div>

                  {isInProgress && (
                    <div className="flex items-center gap-1.5 mt-2.5 text-[11.5px] font-medium" style={{ color: '#c49228' }}>
                      <Clock className="w-3 h-3" /> In Bearbeitung…
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
