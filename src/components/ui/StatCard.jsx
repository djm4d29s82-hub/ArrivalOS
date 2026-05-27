import { Card } from './Card';

/**
 * StatCard — KPI tile. Use sparingly: 3–6 max per screen.
 */
export function StatCard({ label, value, hint, icon: Icon, tone = 'navy', trend, trendValue, className = '' }) {
  const tones = {
    navy:  { bg: null,            color: null,           cls: '' },
    gold:  { bg: null,            color: '#8a6818',      cls: 'bg-gold/15 dark:bg-gold/20 dark:!text-[#d4a83a]' },
    green: { bg: null,            color: null,           cls: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400' },
    red:   { bg: null,            color: null,           cls: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
    blue:  { bg: null,            color: null,           cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  };
  const t = tones[tone] || tones.navy;
  const isNavy = tone === 'navy' || !tones[tone];
  return (
    <Card variant="default" className={`p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--ds-t3)' }}>{label}</div>
          <div className="font-serif text-[34px] leading-none font-bold mt-2.5 tabular-nums" style={{ color: 'var(--ds-t1)' }}>{value}</div>
          {(hint || trend) && (
            <div className="flex items-center gap-2 mt-2.5">
              {trend && (
                <span className={`text-[11px] font-semibold tabular-nums ${trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : ''}`}
                  style={!trend || trend === 'neutral' ? { color: 'var(--ds-t2)' } : undefined}>
                  {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
                </span>
              )}
              {hint && <span className="text-[11.5px]" style={{ color: 'var(--ds-t2)' }}>{hint}</span>}
            </div>
          )}
        </div>
        {Icon && (
          isNavy
            ? <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t1)' }}>
                <Icon className="w-4 h-4" strokeWidth={2.2} />
              </div>
            : <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${t.cls}`}
                style={t.color ? { color: t.color } : undefined}>
                <Icon className="w-4 h-4" strokeWidth={2.2} />
              </div>
        )}
      </div>
    </Card>
  );
}
