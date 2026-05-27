import { MapPin, Calendar, ArrowRight } from 'lucide-react';
import { formatDate, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';

export default function CandidateCard({ candidate, onClick }) {
  const status = candidate.status || 'preparation';
  const statusClass = STATUS_COLORS[status] || 'bg-cream-3 text-navy dark:bg-white/[0.08] dark:text-white/70';
  return (
    <div onClick={onClick} className="rounded-xl p-5 shadow-s1 hover:shadow-s2 hover:-translate-y-0.5 transition-all cursor-pointer"
      style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="font-serif text-lg font-semibold truncate" style={{ color: 'var(--ds-t1)' }}>{candidate.full_name}</div>
          <div className="text-[10px] tracking-widest uppercase font-semibold mt-0.5" style={{ color: 'var(--ds-t3)' }}>{candidate.role}</div>
        </div>
        <div className="w-8 h-8 rounded-full grid place-items-center shrink-0"
          style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t1)' }}>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
      <span className={`badge ${statusClass} mb-3`}>{STATUS_LABELS[status] || status}</span>
      <div className="space-y-1.5 text-xs" style={{ color: 'var(--ds-t2)' }}>
        <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-gold" /> {candidate.city}</div>
        <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-gold" /> Ankunft: {formatDate(candidate.arrival_date)}</div>
        <div>Herkunft: <span className="font-medium" style={{ color: 'var(--ds-t1)' }}>{candidate.origin}</span></div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-[11px] mb-1.5">
          <span style={{ color: 'var(--ds-t2)' }}>Onboarding-Fortschritt</span>
          <span className="font-semibold" style={{ color: 'var(--ds-t1)' }}>{candidate.progress || 0} %</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ds-card-border)' }}>
          <div className="h-full bg-gradient-to-r from-gold to-gold-2 rounded-full transition-all" style={{ width: `${candidate.progress || 0}%` }} />
        </div>
      </div>
    </div>
  );
}
