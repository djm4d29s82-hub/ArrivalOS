import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import CandidateCard from '@/components/dashboard/CandidateCard';
import { useState } from 'react';
import { Search } from 'lucide-react';

export default function AdminCandidates() {
  const { data: candidates = [] } = useQuery({ queryKey: ['candidates'], queryFn: () => base44.entities.Candidate.list('-created_at') });
  const [q, setQ] = useState('');
  const filtered = candidates.filter((c) => !q || `${c.full_name} ${c.role} ${c.city} ${c.origin}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold" style={{ color: 'var(--ds-t1)' }}>Kandidat:innen</h1>
        <p className="text-sm text-[var(--mid)] mt-1.5">{candidates.length} aktive Onboardings</p>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--light)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, Rolle, Stadt suchen…"
            className="w-full pl-9 pr-3 py-2 rounded-md text-sm focus:outline-none"
            style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => <CandidateCard key={c.id} candidate={c} />)}
      </div>
      {filtered.length === 0 && <div className="text-center py-20 text-sm text-[var(--mid)]">Keine Kandidat:innen gefunden.</div>}
    </div>
  );
}
