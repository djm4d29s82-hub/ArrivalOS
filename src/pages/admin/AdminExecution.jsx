import { useState } from 'react';
import { Users, UserCheck } from 'lucide-react';
import AdminCandidates from './AdminCandidates';
import AdminGreeters from './AdminGreeters';

/**
 * Execution Layer — Talente und Greeter sind im Betrieb gekoppelt, daher ein
 * Sidebar-Punkt mit In-Page-Tabs (Sekundär-Navigation gehört auf die Seite).
 */
const TABS = [
  { key: 'talente', label: 'Talente', icon: UserCheck },
  { key: 'greeter', label: 'Greeter', icon: Users },
];

export default function AdminExecution() {
  const [tab, setTab] = useState('talente');

  return (
    <div className="space-y-5">
      <div className="flex rounded-xl p-1 gap-1 w-fit" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition ${active ? 'bg-navy text-cream' : ''}`}
              style={!active ? { color: 'var(--ds-t2)' } : undefined}
            >
              <Icon className="w-4 h-4" strokeWidth={2.2} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'talente' ? <AdminCandidates /> : <AdminGreeters />}
    </div>
  );
}
