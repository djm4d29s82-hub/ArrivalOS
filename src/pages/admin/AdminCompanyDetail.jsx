import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Building2, Mail, MapPin, Users, Briefcase, FileText, UserCog,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toaster';
import { Card, CardBody, Pill, StatusPill, EmptyState, SkeletonCard, SectionHeader } from '@/components/ui';
import { printInvoice } from '@/lib/invoicePdf';
import { formatDate } from '@/lib/utils';

const TIERS = ['starter', 'professional', 'enterprise'];
const TIER_LABEL = { starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise' };
const INV_LABEL = { draft: 'Entwurf', paid: 'Bezahlt', pending: 'Offen', overdue: 'Überfällig', cancelled: 'Storniert' };
const INV_TONE = { draft: 'neutral', paid: 'green', pending: 'gold', overdue: 'red', cancelled: 'neutral' };
const ACTIVE = ['assigned', 'accepted', 'on_the_way', 'arrived', 'met_talent', 'in_progress', 'matched'];

export default function AdminCompanyDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: company, isLoading } = useQuery({ queryKey: ['company', id], queryFn: () => base44.entities.Company.get(id) });
  const { data: candidates = [] } = useQuery({ queryKey: ['company-candidates', id], queryFn: () => base44.entities.Candidate.filter({ company_id: id }) });
  const { data: missions = [] } = useQuery({ queryKey: ['company-missions', id], queryFn: () => base44.entities.Mission.filter({ company_id: id }, '-datetime') });
  const { data: invoices = [] } = useQuery({ queryKey: ['company-invoices', id], queryFn: () => base44.entities.Invoice.filter({ company_id: id }, '-issued_at') });
  const { data: team = [] } = useQuery({ queryKey: ['company-team', id], queryFn: () => base44.entities.User.filter({ company_id: id }).catch(() => []) });

  if (isLoading || !company) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;

  const save = async (patch) => {
    try {
      await base44.entities.Company.update(id, patch);
      toast({ title: 'Gespeichert' });
      qc.invalidateQueries({ queryKey: ['company', id] });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };
  const saveField = (field) => (e) => {
    const v = e.target.value.trim();
    if ((company[field] || '') !== v) save({ [field]: v || null });
  };

  const activeMissions = missions.filter((m) => ACTIVE.includes(m.status));
  const openInvoiceSum = invoices.filter((i) => ['pending', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.amount || 0), 0);
  const inputStyle = { background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' };

  return (
    <div className="space-y-5 pb-12">
      <Link to="/admin/companies" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: 'var(--ds-t2)' }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Alle Unternehmen
      </Link>

      {/* Header */}
      <Card variant="default">
        <CardBody className="pt-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.10)', color: '#c49228' }}>
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl font-bold leading-tight" style={{ color: 'var(--ds-t1)' }}>{company.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[12.5px]" style={{ color: 'var(--ds-t2)' }}>
                {company.industry && <span>{company.industry}</span>}
                {company.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3 text-gold" />{company.email}</span>}
                {company.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-gold" />{company.city}</span>}
              </div>
            </div>
            <Pill tone="gold" size="sm">{TIER_LABEL[company.package_tier] || company.package_tier}</Pill>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
            <Kpi label="Missionen" value={missions.length} />
            <Kpi label="Aktiv" value={activeMissions.length} accent />
            <Kpi label="Talente" value={candidates.length} />
            <Kpi label="Offen (Rechnungen)" value={`${openInvoiceSum.toLocaleString('de-DE')} €`} />
          </div>
        </CardBody>
      </Card>

      {/* Stammdaten editierbar */}
      <Card variant="default">
        <CardBody className="pt-5">
          <SectionHeader title="Stammdaten & Rechnungsadresse" />
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <label className="block">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--ds-t2)' }}>Paket-Tier</span>
              <select value={company.package_tier || 'professional'} onChange={(e) => save({ package_tier: e.target.value })}
                className="mt-1 w-full h-9 px-2.5 text-[13px] rounded-lg cursor-pointer" style={inputStyle}>
                {TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
              </select>
            </label>
            <Editable label="Stadt" defaultValue={company.city} onBlur={saveField('city')} style={inputStyle} />
            <Editable label="Straße & Nr." defaultValue={company.street} onBlur={saveField('street')} style={inputStyle} />
            <Editable label="PLZ" defaultValue={company.zip} onBlur={saveField('zip')} style={inputStyle} />
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--ds-t3)' }}>Adresse erscheint im Empfängerblock der Rechnung (§14).</p>
        </CardBody>
      </Card>

      {/* Missionen */}
      <Card variant="default">
        <CardBody className="pt-5">
          <SectionHeader title="Missionen" count={missions.length} />
          {missions.length === 0 ? <EmptyState icon={Briefcase} title="Noch keine Missionen" className="py-8" /> : (
            <div className="mt-2 divide-y" style={{ borderColor: 'var(--ds-card-border)' }}>
              {missions.map((m) => (
                <Link key={m.id} to={`/admin/missions/${m.id}`} className="flex items-center gap-3 py-2.5 group">
                  <div className="w-14 text-[11px] tabular-nums shrink-0" style={{ color: 'var(--ds-t3)' }}>{formatDate(m.datetime)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium truncate group-hover:text-gold transition" style={{ color: 'var(--ds-t1)' }}>{m.title}</div>
                    <div className="text-[11.5px] truncate" style={{ color: 'var(--ds-t3)' }}>{m.location || m.city}</div>
                  </div>
                  <StatusPill status={m.status} size="xs" />
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Talente */}
      <Card variant="default">
        <CardBody className="pt-5">
          <SectionHeader title="Talente" count={candidates.length} />
          {candidates.length === 0 ? <EmptyState icon={Users} title="Keine Talente" className="py-8" /> : (
            <div className="mt-2 divide-y" style={{ borderColor: 'var(--ds-card-border)' }}>
              {candidates.map((c) => (
                <Link key={c.id} to={`/admin/candidates/${c.id}`} className="flex items-center gap-3 py-2.5 group">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium truncate group-hover:text-gold transition" style={{ color: 'var(--ds-t1)' }}>{c.full_name}</div>
                    <div className="text-[11.5px] truncate" style={{ color: 'var(--ds-t3)' }}>{[c.role, c.city, c.country_of_origin].filter(Boolean).join(' · ')}</div>
                  </div>
                  {c.arrival_time && <span className="text-[11px] tabular-nums shrink-0" style={{ color: 'var(--ds-t3)' }}>{formatDate(c.arrival_time)}</span>}
                  <Pill tone={c.status === 'completed' ? 'green' : c.status === 'cancelled' ? 'neutral' : 'gold'} size="xs">{c.status}</Pill>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Rechnungen */}
      <Card variant="default">
        <CardBody className="pt-5">
          <SectionHeader title="Rechnungen" count={invoices.length} />
          {invoices.length === 0 ? <EmptyState icon={FileText} title="Keine Rechnungen" className="py-8" /> : (
            <div className="mt-2 divide-y" style={{ borderColor: 'var(--ds-card-border)' }}>
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 py-2.5">
                  <div className="font-mono text-[11.5px] w-24 shrink-0 truncate" style={{ color: 'var(--ds-t2)' }}>{inv.invoice_number || (inv.status === 'draft' ? 'Entwurf' : String(inv.id).slice(0, 8))}</div>
                  <div className="text-[12px] flex-1" style={{ color: 'var(--ds-t3)' }}>{formatDate(inv.issued_at)}</div>
                  <div className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--ds-t1)' }}>{(inv.amount || 0).toLocaleString('de-DE')} €</div>
                  <Pill tone={INV_TONE[inv.status]} size="xs">{INV_LABEL[inv.status] || inv.status}</Pill>
                  <button onClick={() => printInvoice({ invoice: inv, company })} className="btn-ghost text-xs">{inv.status === 'draft' ? 'Vorschau' : 'PDF'}</button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Team / Kontakte */}
      <Card variant="default">
        <CardBody className="pt-5">
          <SectionHeader title="Team & Kontakte" count={team.length} />
          {team.length === 0 ? <EmptyState icon={UserCog} title="Keine verknüpften Nutzer" className="py-8" /> : (
            <div className="mt-2 divide-y" style={{ borderColor: 'var(--ds-card-border)' }}>
              {team.map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium truncate" style={{ color: 'var(--ds-t1)' }}>{u.full_name || u.email}</div>
                    <div className="text-[11.5px] truncate" style={{ color: 'var(--ds-t3)' }}>{u.email}</div>
                  </div>
                  <Pill tone="navy" size="xs">{u.role}</Pill>
                  {u.status === 'pending_approval' && <Pill tone="gold" size="xs">wartet</Pill>}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--ds-card-2, rgba(0,0,0,0.02))', border: '1px solid var(--ds-card-border)' }}>
      <div className="text-[18px] font-bold tabular-nums leading-none" style={{ color: accent ? '#c49228' : 'var(--ds-t1)' }}>{value}</div>
      <div className="text-[10.5px] uppercase tracking-wider mt-1" style={{ color: 'var(--ds-t3)' }}>{label}</div>
    </div>
  );
}

function Editable({ label, defaultValue, onBlur, style }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold" style={{ color: 'var(--ds-t2)' }}>{label}</span>
      <input defaultValue={defaultValue || ''} onBlur={onBlur} className="mt-1 w-full h-9 px-2.5 text-[13px] rounded-lg" style={style} />
    </label>
  );
}
