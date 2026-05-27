import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/toaster';
import { Check, X } from 'lucide-react';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const SLOTS = ['Vormittag', 'Nachmittag', 'Abend'];

export default function GreeterAvailability() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('available');
  const [slots, setSlots] = useState({});

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.GreeterProfile.filter({ email: user.email }).then((p) => {
      const pr = p[0];
      setProfile(pr);
      if (pr) {
        setStatus(pr.status || 'available');
        setSlots(pr.weekly_slots || {});
      }
    });
  }, [user?.email]);

  if (!profile) return <div className="p-8 text-sm text-[var(--mid)]">Profil wird geladen…</div>;

  const toggle = (day, slot) => {
    const key = `${day}_${slot}`;
    setSlots((s) => ({ ...s, [key]: !s[key] }));
  };

  const save = async () => {
    await base44.entities.GreeterProfile.update(profile.id, { status, weekly_slots: slots });
    toast({ title: 'Verfügbarkeit gespeichert' });
  };

  const setAll = (val) => {
    const next = {};
    DAYS.forEach((d) => SLOTS.forEach((s) => (next[`${d}_${s}`] = val)));
    setSlots(next);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold" style={{ color: 'var(--ds-t1)' }}>Verfügbarkeit</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--ds-t2)' }}>Wann bist du erreichbar? Bessere Verfügbarkeit = mehr Matches.</p>
      </div>

      <div className="rounded-xl p-5" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <div className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--ds-t2)' }}>Status</div>
        <div className="flex gap-2 flex-wrap">
          {[
            { v: 'available', label: 'Verfügbar', dot: 'bg-emerald-500' },
            { v: 'busy', label: 'Aktuell beschäftigt', dot: 'bg-amber-500' },
            { v: 'unavailable', label: 'Nicht verfügbar', dot: 'bg-red-500' },
          ].map((s) => (
            <button
              key={s.v}
              onClick={() => setStatus(s.v)}
              className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 transition ${status === s.v ? 'bg-navy text-cream' : ''}`}
              style={status !== s.v ? { background: 'var(--ds-card-border)', color: 'var(--ds-t1)', border: '1px solid var(--ds-card-border)' } : {}}
            >
              <span className={`w-2 h-2 rounded-full ${s.dot}`} /> {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--ds-card-border)' }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--ds-t1)' }}>Wochenplan</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ds-t2)' }}>Klicke auf die Zeitfenster, in denen du verfügbar bist.</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setAll(true)} className="btn-ghost text-xs">Alle aktivieren</button>
            <button onClick={() => setAll(false)} className="btn-ghost text-xs">Alle leeren</button>
          </div>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-24"></th>
                {DAYS.map((d) => (
                  <th key={d} className="text-xs text-[var(--mid)] font-semibold uppercase tracking-widest px-2 py-2">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((s) => (
                <tr key={s}>
                  <td className="text-xs text-[var(--mid)] font-semibold uppercase tracking-widest px-2 py-1.5">{s}</td>
                  {DAYS.map((d) => {
                    const on = !!slots[`${d}_${s}`];
                    return (
                      <td key={d} className="px-1 py-1">
                        <button
                          onClick={() => toggle(d, s)}
                          className="w-full h-12 rounded-lg border-2 flex items-center justify-center transition"
                          style={on
                            ? { background: 'rgba(196,146,40,0.15)', borderColor: '#c49228', color: '#c49228' }
                            : { background: 'transparent', borderColor: 'var(--ds-card-border)', color: 'var(--ds-t3)' }
                          }
                        >
                          {on ? <Check className="w-4 h-4" /> : <X className="w-3 h-3 opacity-40" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={save} className="btn-primary">Verfügbarkeit speichern</button>
    </div>
  );
}
