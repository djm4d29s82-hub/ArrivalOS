export default function StatsCard({ label, value, delta, icon: Icon, accent = 'gold', trend }) {
  const accentBg = {
    gold: 'bg-gold/10 text-gold',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    navy: 'bg-navy/10 text-navy dark:bg-white/[0.10] dark:text-white/75',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  }[accent] || 'bg-gold/10 text-gold';

  return (
    <div className="rounded-xl p-5 shadow-s1 hover:shadow-s2 transition"
      style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ds-t3)' }}>{label}</div>
          <div className="font-serif text-3xl font-bold mt-1.5" style={{ color: 'var(--ds-t1)' }}>{value}</div>
          {delta && <div className="text-xs mt-1.5" style={{ color: 'var(--ds-t2)' }}>{delta}</div>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg grid place-items-center ${accentBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-3 h-1 rounded overflow-hidden" style={{ background: 'var(--ds-card-border)' }}>
          <div className="h-full bg-gold rounded" style={{ width: `${Math.min(100, Math.max(0, trend))}%` }} />
        </div>
      )}
    </div>
  );
}
