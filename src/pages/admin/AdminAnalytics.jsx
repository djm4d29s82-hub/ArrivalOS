import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatsCard from '@/components/dashboard/StatsCard';
import { Briefcase, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

export default function AdminAnalytics() {
  const { data: missions = [] } = useQuery({ queryKey: ['missions'], queryFn: () => base44.entities.Mission.list() });
  const { data: greeters = [] } = useQuery({ queryKey: ['greeters'], queryFn: () => base44.entities.GreeterProfile.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list() });

  const byStatus = missions.reduce((acc, m) => ((acc[m.status] = (acc[m.status] || 0) + 1), acc), {});
  const completed = byStatus.completed || 0;
  const rate = missions.length ? Math.round((completed / missions.length) * 100) : 0;
  const revenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
  const avgRating = greeters.length ? (greeters.reduce((s, g) => s + (g.rating || 0), 0) / greeters.length).toFixed(2) : '—';

  const byCity = missions.reduce((acc, m) => ((acc[m.city] = (acc[m.city] || 0) + 1), acc), {});
  const cities = Object.entries(byCity).sort((a, b) => b[1] - a[1]);
  const maxCity = cities[0]?.[1] || 1;

  const STATUS_ORDER = ['open', 'matched', 'assigned', 'in_progress', 'completed', 'cancelled'];
  const STATUS_LABEL = {
    open: 'Offen', matched: 'Matched', assigned: 'Zugewiesen', in_progress: 'Läuft', completed: 'Fertig', cancelled: 'Storniert',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold" style={{ color: 'var(--ds-t1)' }}>Analytics</h1>
        <p className="text-sm text-[var(--mid)] mt-1.5">Geschäftliche Kennzahlen · Echtzeit</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label="Erfolgsquote" value={`${rate} %`} icon={CheckCircle2} accent="green" trend={rate} />
        <StatsCard label="Aktive Missionen" value={missions.filter((m) => ['matched', 'assigned', 'in_progress'].includes(m.status)).length} icon={Clock} accent="navy" />
        <StatsCard label="Greeter-Bewertung Ø" value={avgRating} icon={TrendingUp} />
        <StatsCard label="Umsatz bezahlt" value={`${revenue.toLocaleString('de-DE')} €`} icon={Briefcase} accent="navy" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--ds-t1)' }}>Missionen nach Status</h3>
          <div className="space-y-3">
            {STATUS_ORDER.map((s) => {
              const v = byStatus[s] || 0;
              const pct = missions.length ? (v / missions.length) * 100 : 0;
              return (
                <div key={s}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--ds-t2)' }}>{STATUS_LABEL[s]}</span>
                    <span className="font-semibold" style={{ color: 'var(--ds-t1)' }}>{v}</span>
                  </div>
                  <div className="h-2 rounded" style={{ background: 'var(--ds-card-border)' }}>
                    <div className="h-full bg-gradient-to-r from-gold to-gold-2 rounded transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--ds-t1)' }}>Missionen pro Stadt</h3>
          <div className="space-y-3">
            {cities.map(([city, v]) => (
              <div key={city}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--ds-t2)' }}>{city}</span>
                  <span className="font-semibold" style={{ color: 'var(--ds-t1)' }}>{v}</span>
                </div>
                <div className="h-2 rounded" style={{ background: 'var(--ds-card-border)' }}>
                  <div className="h-full bg-navy rounded transition-all" style={{ width: `${(v / maxCity) * 100}%` }} />
                </div>
              </div>
            ))}
            {cities.length === 0 && <div className="text-sm" style={{ color: 'var(--ds-t2)' }}>Noch keine Daten.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
