import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ScrollText, Search, Plus } from 'lucide-react';

const CATEGORIES = {
  arrival: 'Ankunft',
  administration: 'Behörden',
  banking: 'Bank',
  housing: 'Wohnen',
  connectivity: 'Mobilfunk',
  onboarding: 'Onboarding',
  escalation: 'Eskalation',
};

export default function AdminSOPs() {
  const [sops, setSops] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => { base44.entities.SOP.list('-updated_at').then(setSops); }, []);

  const filtered = sops.filter((s) =>
    !q || s.title.toLowerCase().includes(q.toLowerCase()) || s.code.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div className="mb-2 text-[11px] uppercase tracking-widest text-gold font-bold">Operations · SOPs</div>
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ds-t1)' }}>Standard Operating Procedures</h1>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--ds-t2)' }}>Die operative Wahrheit. Jeder Greeter folgt diesen — überall, jedes Mal.</p>
        </div>
        <button className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Neue SOP
        </button>
      </div>

      <div className="mt-6 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--light)]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="SOP suchen…"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-[13.5px] focus:outline-none transition"
          style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }} />
      </div>

      <div className="mt-8 rounded-2xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <table className="w-full text-[13px]">
          <thead className="text-[11px] uppercase tracking-widest" style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t3)' }}>
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Code</th>
              <th className="text-left px-5 py-3 font-semibold">Titel</th>
              <th className="text-left px-5 py-3 font-semibold">Kategorie</th>
              <th className="text-left px-5 py-3 font-semibold">Schritte</th>
              <th className="text-left px-5 py-3 font-semibold">Version</th>
              <th className="text-left px-5 py-3 font-semibold">Aktualisiert</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[12.5px]" style={{ color: 'var(--ds-t3)' }}>
                  Keine SOPs gefunden.
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="cursor-pointer transition" style={{ borderTop: '1px solid var(--ds-card-border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,146,40,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <td className="px-5 py-3.5 font-mono text-[12px] text-gold font-semibold">{s.code}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2" style={{ color: 'var(--ds-t1)' }}>
                    <ScrollText className="w-3.5 h-3.5" style={{ color: '#c49228' }} />{s.title}
                  </div>
                </td>
                <td className="px-5 py-3.5" style={{ color: 'var(--ds-t2)' }}>{CATEGORIES[s.category] || s.category}</td>
                <td className="px-5 py-3.5" style={{ color: 'var(--ds-t2)' }}>{s.steps}</td>
                <td className="px-5 py-3.5" style={{ color: 'var(--ds-t2)' }}>v{s.version}</td>
                <td className="px-5 py-3.5" style={{ color: 'var(--ds-t3)' }}>{new Date(s.updated_at).toLocaleDateString('de-DE')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
