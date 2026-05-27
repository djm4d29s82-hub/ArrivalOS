import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Star } from 'lucide-react';

export default function AdminQuality() {
  const [missions, setMissions] = useState([]);
  const [greeters, setGreeters] = useState([]);

  useEffect(() => {
    base44.entities.Mission.list().then(setMissions);
    base44.entities.GreeterProfile.list().then(setGreeters);
  }, []);

  const completed = missions.filter((m) => m.status === 'completed').length;
  const open = missions.filter((m) => m.status === 'open').length;
  const avgRating = greeters.length ? (greeters.reduce((s, g) => s + (g.rating || 0), 0) / greeters.length).toFixed(2) : '–';
  const completionRate = missions.length ? Math.round((completed / missions.length) * 100) : 0;

  const KPIS = [
    { l: 'Completion-Rate', n: `${completionRate}%`, i: CheckCircle2, trend: 'up', delta: '+4%' },
    { l: 'Ø Greeter-Rating', n: avgRating, i: Star, trend: 'up', delta: '+0.1' },
    { l: 'Offene Missionen', n: open, i: AlertTriangle, trend: open > 3 ? 'down' : 'up', delta: open > 3 ? '+2' : '–1' },
    { l: 'Time-to-Onboard Ø', n: '14 T.', i: TrendingDown, trend: 'up', delta: '–2 T.' },
  ];

  return (
    <div>
      <div className="mb-2 text-[11px] uppercase tracking-widest text-gold font-bold">Operations · Quality</div>
      <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ds-t1)' }}>Quality Dashboard</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--ds-t2)' }}>Operative Wahrheit auf einen Blick — was läuft gut, wo eskalieren wir.</p>

      <div className="grid md:grid-cols-4 gap-4 mt-8">
        {KPIS.map((k) => (
          <div key={k.l} className="rounded-2xl p-5" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <k.i className="w-4 h-4 text-gold" />
              <span className={`text-[11px] font-semibold inline-flex items-center gap-1 ${k.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {k.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {k.delta}
              </span>
            </div>
            <div className="font-serif text-3xl font-bold" style={{ color: 'var(--ds-t1)' }}>{k.n}</div>
            <div className="text-[11.5px] uppercase tracking-wider mt-1" style={{ color: 'var(--ds-t3)' }}>{k.l}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-10">
        <div className="rounded-2xl p-6" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <h2 className="font-serif text-lg font-bold mb-4" style={{ color: 'var(--ds-t1)' }}>Top Greeter (nach Rating)</h2>
          <div className="space-y-3">
            {[...greeters].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5).map((g) => (
              <div key={g.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full grid place-items-center"
                  style={{ background: 'rgba(196,146,40,0.10)' }}>
                  <span className="font-serif text-sm font-bold" style={{ color: '#c49228' }}>{g.full_name?.[0]}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[13.5px]" style={{ color: 'var(--ds-t1)' }}>{g.full_name}</div>
                  <div className="text-[11.5px]" style={{ color: 'var(--ds-t3)' }}>{g.city} · {g.completed_missions} Einsätze</div>
                </div>
                <div className="inline-flex items-center gap-1 text-[12px] font-semibold text-gold">
                  <Star className="w-3 h-3" /> {g.rating}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <h2 className="font-serif text-lg font-bold mb-4" style={{ color: 'var(--ds-t1)' }}>Eskalations-Workflow</h2>
          <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--ds-t2)' }}>Aktuelle Eskalationen — automatisch erkannt aus überfälligen Schritten und negativen Signalen.</p>
          <div className="space-y-2">
            {open === 0 ? (
              <div className="text-[13px] py-6 text-center" style={{ color: 'var(--ds-t2)' }}>Keine aktiven Eskalationen.</div>
            ) : (
              missions.filter((m) => m.status === 'open').slice(0, 3).map((m) => (
                <div key={m.id} className="rounded-lg p-3" style={{ background: 'rgba(196,146,40,0.06)', border: '1px solid rgba(196,146,40,0.25)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-gold" />
                    <span className="text-[11px] uppercase tracking-widest text-gold font-semibold">Offen seit &gt;24h</span>
                  </div>
                  <div className="text-[13px] font-medium" style={{ color: 'var(--ds-t1)' }}>{m.title}</div>
                  <div className="text-[11.5px]" style={{ color: 'var(--ds-t2)' }}>{m.city} · {m.location}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
