import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, MapPin, Languages, Award, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  PageHeader, Card, Pill, Avatar, EmptyState, SearchInput, Select, SkeletonCard,
} from '@/components/ui';

export default function AdminGreeters() {
  const { data: greeters = [], isLoading } = useQuery({
    queryKey: ['greeters'], queryFn: () => base44.entities.GreeterProfile.list(),
  });
  const { data: missions = [] } = useQuery({ queryKey: ['missions'], queryFn: () => base44.entities.Mission.list() });

  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const cities = [...new Set(greeters.map((g) => g.city).filter(Boolean))];

  const filtered = greeters.filter((g) => {
    if (cityFilter !== 'all' && g.city !== cityFilter) return false;
    if (search && !`${g.full_name} ${g.languages?.join(' ')}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Stammdaten · Greeter"
        title="Greeter-Netzwerk"
        description={`${greeters.length} Greeter im Netzwerk · ${filtered.length} angezeigt`}
      />

      <div className="px-4 py-3 flex flex-wrap items-center gap-3 rounded-2xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <div className="flex-1 min-w-[220px]">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name oder Sprache…" />
        </div>
        <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="text-[12.5px] shrink-0">
          <option value="all">Alle Städte</option>
          {cities.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : filtered.length === 0 ? (
        <Card variant="flat">
          <EmptyState icon={Users} title="Keine Greeter gefunden" description="Versuche andere Filterkriterien." />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((g) => {
            const completed = missions.filter((m) => m.greeter_id === g.id && m.status === 'completed').length;
            const active = missions.filter((m) => m.greeter_id === g.id && ['assigned', 'in_progress'].includes(m.status)).length;
            return (
              <Card key={g.id} variant="default" interactive className="overflow-hidden">
                <div className="p-5 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={g.full_name} size="lg" ringed />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[15px] truncate" style={{ color: 'var(--ds-t1)' }}>{g.full_name}</div>
                      <div className="flex items-center gap-1 text-[12px] text-[var(--mid)] mt-0.5">
                        <MapPin className="w-3 h-3 text-gold" /> {g.city}
                      </div>
                    </div>
                    <Pill tone={g.status === 'available' ? 'green' : 'neutral'} size="xs" dot>
                      {g.status === 'available' ? 'Online' : 'Offline'}
                    </Pill>
                  </div>

                  <div className="flex items-center gap-3 text-[12px] text-[var(--mid)] mb-3">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-gold fill-gold" />
                      <span className="font-semibold tabular-nums" style={{ color: 'var(--ds-t1)' }}>{g.rating?.toFixed(1) || '—'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      <span className="tabular-nums">{completed} Einsätze</span>
                    </span>
                    {active > 0 && <Pill tone="gold" size="xs">{active} aktiv</Pill>}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {g.languages?.slice(0, 4).map((l) => (
                      <Pill key={l} tone="navy" size="xs">{l}</Pill>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
