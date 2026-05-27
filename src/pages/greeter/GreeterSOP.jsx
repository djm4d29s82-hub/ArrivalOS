import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ScrollText, ChevronRight, Award, BookOpen } from 'lucide-react';

const CATEGORIES = {
  arrival: 'Ankunft', administration: 'Behörden', banking: 'Bank',
  housing: 'Wohnen', connectivity: 'Mobilfunk', onboarding: 'Onboarding', escalation: 'Eskalation',
};

export default function GreeterSOP() {
  const [sops, setSops] = useState([]);
  useEffect(() => { base44.entities.SOP.list('-updated_at').then(setSops); }, []);

  return (
    <div className="max-w-3xl">
      <div className="mb-2 text-[11px] uppercase tracking-widest text-gold font-bold">Greeter · Schulung</div>
      <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ds-t1)' }}>Deine SOPs &amp; Wissen</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--ds-t2)' }}>
        Alle Standardabläufe, Checklisten und Code of Conduct. Jederzeit nachschlagen, wenn du im Einsatz bist.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mt-8">
        <div className="rounded-xl p-5" style={{ background: 'rgba(196,146,40,0.10)', border: '1px solid rgba(196,146,40,0.30)' }}>
          <Award className="w-5 h-5 mb-2" style={{ color: '#c49228' }} />
          <div className="text-[11px] uppercase tracking-widest font-bold" style={{ color: '#c49228' }}>Zertifizierung</div>
          <div className="font-serif text-xl font-bold mt-1" style={{ color: 'var(--ds-t1)' }}>Stufe 2 · Aktiv</div>
          <div className="text-[12px] mt-1" style={{ color: 'var(--ds-t2)' }}>7 / 7 SOPs abgeschlossen · nächste Stufe ab 25 Einsätzen.</div>
        </div>
        <div className="rounded-xl p-5" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <BookOpen className="w-5 h-5 mb-2" style={{ color: '#c49228' }} />
          <div className="text-[11px] uppercase tracking-widest font-bold" style={{ color: 'var(--ds-t3)' }}>Letzte Schulung</div>
          <div className="font-serif text-xl font-bold mt-1" style={{ color: 'var(--ds-t1)' }}>Eskalationen</div>
          <div className="text-[12px] mt-1" style={{ color: 'var(--ds-t2)' }}>SOP-007 · vor 5 Tagen abgeschlossen.</div>
        </div>
      </div>

      <h2 className="font-serif text-lg font-bold mt-10 mb-3" style={{ color: 'var(--ds-t1)' }}>SOP-Bibliothek</h2>
      <div className="space-y-2">
        {sops.map((s) => (
          <button
            key={s.id}
            className="w-full rounded-xl p-4 flex items-center gap-4 transition text-left"
            style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(196,146,40,0.30)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ds-card-border)'; }}
          >
            <div className="w-10 h-10 rounded-lg grid place-items-center flex-shrink-0" style={{ background: 'rgba(196,146,40,0.10)' }}>
              <ScrollText className="w-4 h-4" style={{ color: '#c49228' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] font-semibold" style={{ color: '#c49228' }}>{s.code}</span>
                <span className="font-semibold text-[14px]" style={{ color: 'var(--ds-t1)' }}>{s.title}</span>
              </div>
              <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ds-t3)' }}>{CATEGORIES[s.category]} · {s.steps} Schritte · v{s.version}</div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--ds-t3)' }} />
          </button>
        ))}
      </div>
    </div>
  );
}
