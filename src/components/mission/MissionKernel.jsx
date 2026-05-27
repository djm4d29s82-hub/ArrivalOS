import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

/**
 * MissionKernel — the calm core of a mission. "1 statement · 1 action · max 2 blockers."
 *
 * Presentational only: each portal computes the statement/action/blockers (see
 * src/lib/missionKernel.js) and passes them in. Reuses the warm hero surface pattern
 * (ds-card + gold radial ambient) established in the dashboards.
 */
const BLOCKER_TONE = {
  red:   { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626', border: 'rgba(239,68,68,0.25)' },
  amber: { bg: 'rgba(245,158,11,0.14)', color: '#b45309', border: 'rgba(245,158,11,0.28)' },
};

// Urgency accent — calm (gold) by default, clear escalation for active/critical.
const PRIORITY = {
  normal:   { border: 'rgba(196,146,40,0.25)', glow: 'rgba(196,146,40,0.08)', eyebrow: '#c49228' },
  active:   { border: 'rgba(96,165,250,0.35)', glow: 'rgba(96,165,250,0.09)', eyebrow: '#2f6fd0' },
  critical: { border: 'rgba(239,68,68,0.40)',  glow: 'rgba(239,68,68,0.10)',  eyebrow: '#dc2626' },
};

export default function MissionKernel({
  eyebrow,
  statement,
  sub,
  next,
  progress,
  primaryAction,
  blockers = [],
  priority = 'normal',
  children,
  className = '',
}) {
  const caps = blockers.slice(0, 2); // hard cap: never more than 2 blockers
  const p = PRIORITY[priority] || PRIORITY.normal;
  const pct = progress && progress.total > 0
    ? Math.min(100, ((progress.index + 1) / progress.total) * 100)
    : 0;

  return (
    <div
      className={`rounded-2xl overflow-hidden relative ${className}`}
      style={{ background: 'var(--ds-card)', border: `1px solid ${p.border}` }}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 100% at 0% 0%, ${p.glow}, transparent)` }}
      />
      <div className="relative px-5 sm:px-7 pt-6 pb-6 space-y-4">
        {eyebrow && (
          <div className="text-[10.5px] uppercase tracking-[0.16em] font-bold" style={{ color: p.eyebrow }}>
            {eyebrow}
          </div>
        )}

        {/* 1 statement — the dominant focus */}
        <div>
          <div className="font-serif text-[22px] sm:text-[26px] leading-[1.15] font-bold" style={{ color: 'var(--ds-t1)' }}>
            {statement}
          </div>
          {sub && (
            <div className="text-[13.5px] mt-1.5 leading-relaxed" style={{ color: 'var(--ds-t2)' }}>{sub}</div>
          )}
        </div>

        {/* NEXT — der nächste konkrete Schritt */}
        {next && (
          <div className="flex items-center gap-2 text-[12.5px] min-w-0">
            <span className="text-[10px] uppercase tracking-[0.12em] font-semibold shrink-0" style={{ color: 'var(--ds-t3)' }}>Nächstes</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: '#c49228' }} />
            <span className="font-medium truncate" style={{ color: 'var(--ds-t1)' }}>{next}</span>
          </div>
        )}

        {/* calm progress line */}
        {progress && progress.total > 0 && (
          <div>
            <div className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--ds-t3)' }}>
              Schritt {Math.min(progress.index + 1, progress.total)} von {progress.total}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ds-card-border)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #c49228, #d4a83a)' }}
              />
            </div>
          </div>
        )}

        {/* max 2 blockers — only when genuinely present */}
        {caps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {caps.map((b, i) => {
              const t = BLOCKER_TONE[b.tone] || BLOCKER_TONE.amber;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-medium"
                  style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}
                >
                  <AlertTriangle className="w-3 h-3" /> {b.label}
                </span>
              );
            })}
          </div>
        )}

        {/* 1 action */}
        {primaryAction && (
          <Button
            variant={primaryAction.variant || 'gold'}
            size="lg"
            fullWidth
            loading={primaryAction.loading}
            disabled={primaryAction.disabled}
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </Button>
        )}

        {children}
      </div>
    </div>
  );
}
