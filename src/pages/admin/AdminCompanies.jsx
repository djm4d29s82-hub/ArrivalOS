import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Mail, MapPin, Briefcase } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toaster';
import {
  PageHeader, Card, Pill, EmptyState, SearchInput, SkeletonCard,
} from '@/components/ui';

const TIERS = ['starter', 'professional', 'enterprise'];
const TIER_LABEL = { starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise' };

export default function AdminCompanies() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: companies = [], isLoading } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });

  const setTier = async (c, tier) => {
    try {
      await base44.entities.Company.update(c.id, { package_tier: tier });
      qc.invalidateQueries({ queryKey: ['companies'] });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };
  const { data: missions = [] } = useQuery({ queryKey: ['missions'], queryFn: () => base44.entities.Company.list ? base44.entities.Mission.list() : [] });

  const [search, setSearch] = useState('');
  const filtered = companies.filter((c) => {
    if (search && !`${c.name} ${c.industry || ''} ${c.city || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Stammdaten · Kunden"
        title="Unternehmen"
        description={`${companies.length} Unternehmen · ${filtered.length} angezeigt`}
      />

      <div className="px-4 py-3 rounded-2xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, Branche oder Stadt…" />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3"><SkeletonCard /><SkeletonCard /></div>
      ) : filtered.length === 0 ? (
        <Card variant="flat">
          <EmptyState icon={Building2} title="Keine Unternehmen gefunden" />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <CompanyCard key={c.id} company={c} missions={missions} onSetTier={setTier} onSaved={() => qc.invalidateQueries({ queryKey: ['companies'] })} toast={toast} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyCard({ company: c, missions, onSetTier, onSaved, toast }) {
  const myMissions = missions.filter((m) => m.company_id === c.id);
  const active = myMissions.filter((m) => ['assigned', 'in_progress', 'matched'].includes(m.status)).length;

  // Rechnungsadresse inline pflegen (§14 Empfängerblock) — speichern bei Blur, nur wenn geändert.
  const saveField = async (field, value) => {
    if ((c[field] || '') === value.trim()) return;
    try {
      await base44.entities.Company.update(c.id, { [field]: value.trim() || null });
      toast({ title: 'Gespeichert', description: 'Rechnungsadresse aktualisiert.' });
      onSaved?.();
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const inputStyle = { background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' };

  return (
    <Card variant="default" interactive className="p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl grid place-items-center shrink-0"
          style={{ background: 'rgba(196,146,40,0.10)', color: '#c49228' }}>
          <Building2 className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[15px] truncate" style={{ color: 'var(--ds-t1)' }}>{c.name}</div>
          {c.industry && <div className="text-[10.5px] uppercase tracking-widest text-[var(--light)] font-semibold mt-0.5">{c.industry}</div>}
        </div>
      </div>

      <div className="space-y-1.5 text-[12px] text-[var(--mid)]">
        {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-gold" />{c.email}</div>}
        {c.city && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-gold" />{c.city}</div>}
      </div>

      <div className="mt-4 pt-3 flex items-center justify-between text-[12px]" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
        <span className="flex items-center gap-1.5" style={{ color: 'var(--ds-t2)' }}>
          <Briefcase className="w-3 h-3" />
          <span><span className="font-semibold tabular-nums" style={{ color: 'var(--ds-t1)' }}>{myMissions.length}</span> Missionen</span>
        </span>
        {active > 0 && <Pill tone="gold" size="xs">{active} aktiv</Pill>}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[10.5px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ds-t3)' }}>Paket-Tier</span>
        <select
          value={c.package_tier || 'professional'}
          onChange={(e) => onSetTier(c, e.target.value)}
          className="h-8 px-2.5 text-[12px] rounded-lg cursor-pointer"
          style={inputStyle}
        >
          {TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
        </select>
      </div>

      {/* Rechnungsadresse (§14) — erscheint im Empfängerblock der Rechnung */}
      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
        <div className="text-[10.5px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--ds-t3)' }}>Rechnungsadresse</div>
        <div className="flex gap-2">
          <input
            defaultValue={c.street || ''}
            onBlur={(e) => saveField('street', e.target.value)}
            placeholder="Straße & Nr."
            className="flex-1 h-8 px-2.5 text-[12px] rounded-lg"
            style={inputStyle}
          />
          <input
            defaultValue={c.zip || ''}
            onBlur={(e) => saveField('zip', e.target.value)}
            placeholder="PLZ"
            className="w-20 h-8 px-2.5 text-[12px] rounded-lg"
            style={inputStyle}
          />
        </div>
        <div className="text-[10px] mt-1" style={{ color: 'var(--ds-t3)' }}>Stadt: {c.city || '—'} · erscheint auf der Rechnung</div>
      </div>
    </Card>
  );
}
