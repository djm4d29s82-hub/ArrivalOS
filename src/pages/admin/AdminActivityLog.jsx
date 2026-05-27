import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatDateTime } from '@/lib/utils';
import { useState } from 'react';
import { ScrollText, Search } from 'lucide-react';

const ACTION_BADGE = {
  'mission.created':     'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'mission.matched':     'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  'mission.assigned':    'bg-gold/20 text-gold',
  'mission.in_progress': 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'mission.completed':   'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'mission.cancelled':   'bg-red-500/15 text-red-700 dark:text-red-400',
  'step.completed':      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
};

export default function AdminActivityLog() {
  const { data: logs = [] } = useQuery({ queryKey: ['logs'], queryFn: () => base44.entities.ActivityLog.list('-timestamp') });
  const [q, setQ] = useState('');
  const filtered = logs.filter((l) => !q || `${l.description} ${l.action} ${l.created_by}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold" style={{ color: 'var(--ds-t1)' }}>Activity Log</h1>
        <p className="text-sm text-[var(--mid)] mt-1.5">{logs.length} Ereignisse im System</p>
      </div>
      <div className="rounded-xl p-4" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--light)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtern…"
            className="w-full pl-9 pr-3 py-2 rounded-md text-sm focus:outline-none"
            style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }} />
        </div>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <table className="w-full">
          <thead className="text-left text-[10px] uppercase tracking-widest font-semibold"
            style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t3)' }}>
            <tr>
              <th className="px-5 py-3">Zeitpunkt</th>
              <th className="px-5 py-3">Aktion</th>
              <th className="px-5 py-3">Beschreibung</th>
              <th className="px-5 py-3">Wer</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="transition" style={{ borderTop: '1px solid var(--ds-card-border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,146,40,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--ds-t2)' }}>{formatDateTime(l.timestamp || l.created_at)}</td>
                <td className="px-5 py-3"><span className={`badge ${ACTION_BADGE[l.action] || 'bg-gold/15 text-gold'}`}>{l.action}</span></td>
                <td className="px-5 py-3 text-sm" style={{ color: 'var(--ds-t1)' }}>{l.description}</td>
                <td className="px-5 py-3 text-xs" style={{ color: 'var(--ds-t2)' }}>{l.created_by}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="4" className="px-5 py-16 text-center text-sm" style={{ color: 'var(--ds-t2)' }}>
                <ScrollText className="w-8 h-8 mx-auto mb-3 opacity-30" /> Keine Einträge
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
