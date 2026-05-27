import { Activity } from 'lucide-react';
import { relativeTime } from '@/lib/utils';

const ACTION_DOT = {
  'mission.created': 'bg-blue-500',
  'mission.matched': 'bg-purple-500',
  'mission.assigned': 'bg-gold',
  'mission.in_progress': 'bg-amber-500',
  'mission.completed': 'bg-emerald-500',
  'mission.cancelled': 'bg-red-500',
  'step.completed': 'bg-emerald-400',
};

export default function ActivityFeed({ items = [], title = 'Aktivitäten' }) {
  return (
    <div className="rounded-xl shadow-s1 overflow-hidden"
      style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
      <div className="px-5 py-4 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--ds-card-border)' }}>
        <Activity className="w-4 h-4 text-gold" />
        <h3 className="font-semibold text-sm" style={{ color: 'var(--ds-t1)' }}>{title}</h3>
        <span className="ml-auto text-xs" style={{ color: 'var(--ds-t3)' }}>{items.length}</span>
      </div>
      <div className="max-h-[480px] overflow-y-auto">
        {items.length === 0 && <div className="px-5 py-12 text-sm text-center" style={{ color: 'var(--ds-t2)' }}>Noch keine Aktivitäten</div>}
        {items.map((it) => (
          <div key={it.id} className="px-5 py-3 transition last:border-0"
            style={{ borderBottom: '1px solid var(--ds-card-border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,146,40,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${ACTION_DOT[it.action] || 'bg-[var(--mid)]'}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm" style={{ color: 'var(--ds-t1)' }}>{it.description}</div>
                <div className="text-[11px] mt-1" style={{ color: 'var(--ds-t3)' }}>
                  {it.created_by} · {relativeTime(it.timestamp || it.created_at)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
