import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MapPin, Star, Phone, Mail, Briefcase, Wallet, Receipt, CalendarClock, Lock,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toaster';
import { Card, CardBody, Pill, StatusPill, Avatar, EmptyState, SkeletonCard, SectionHeader } from '@/components/ui';
import { formatDate } from '@/lib/utils';

const STATUS_TONE = { available: 'green', busy: 'gold', offline: 'neutral' };
const STATUS_LABEL = { available: 'Online', busy: 'Im Einsatz', offline: 'Offline' };
const ACTIVE = ['assigned', 'accepted', 'on_the_way', 'arrived', 'met_talent', 'in_progress'];
const PAYOUT_TONE = { paid: 'green', pending: 'gold', cancelled: 'neutral' };
const PAYOUT_LABEL = { paid: 'Ausgezahlt', pending: 'Offen', cancelled: 'Storniert' };
const EXP_TONE = { approved: 'green', submitted: 'gold', rejected: 'red' };
const EXP_LABEL = { approved: 'Genehmigt', submitted: 'Eingereicht', rejected: 'Abgelehnt' };

export default function AdminGreeterDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: greeter, isLoading } = useQuery({ queryKey: ['greeter', id], queryFn: () => base44.entities.GreeterProfile.get(id) });
  const { data: priv } = useQuery({ queryKey: ['greeter-private', id], queryFn: () => base44.entities.GreeterPrivate.get(id).catch(() => null) });
  const { data: missions = [] } = useQuery({ queryKey: ['greeter-missions', id], queryFn: () => base44.entities.Mission.filter({ greeter_id: id }, '-datetime') });
  const { data: payouts = [] } = useQuery({ queryKey: ['greeter-payouts', id], queryFn: () => base44.entities.Payout.filter({ greeter_id: id }).catch(() => []) });
  const { data: expenses = [] } = useQuery({ queryKey: ['greeter-expenses', id], queryFn: () => base44.entities.MissionExpense.filter({ greeter_id: id }).catch(() => []) });

  if (isLoading || !greeter) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;

  const setContract = async (status) => {
    try {
      await base44.entities.GreeterProfile.update(id, { contract_status: status });
      toast({ title: 'Gespeichert', description: `Vertragsstatus: ${status}` });
      qc.invalidateQueries({ queryKey: ['greeter', id] });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const completed = missions.filter((m) => m.status === 'completed').length;
  const active = missions.filter((m) => ACTIVE.includes(m.status)).length;
  const earned = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const pendingPay = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
  const slots = Object.entries(greeter.weekly_slots || {}).filter(([, v]) => v).map(([k]) => k.replace('_', ' '));
  const inputStyle = { background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' };

  return (
    <div className="space-y-5 pb-12">
      <Link to="/admin/greeters" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: 'var(--ds-t2)' }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Alle Greeter
      </Link>

      {/* Header */}
      <Card variant="default">
        <CardBody className="pt-5">
          <div className="flex items-start gap-4">
            <Avatar name={greeter.full_name} size="lg" ringed />
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl font-bold leading-tight" style={{ color: 'var(--ds-t1)' }}>{greeter.full_name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[12.5px]" style={{ color: 'var(--ds-t2)' }}>
                {greeter.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-gold" />{greeter.city}</span>}
                <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 text-gold fill-gold" />{greeter.rating?.toFixed(1) || '—'}</span>
                {greeter.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3 text-gold" />{greeter.email}</span>}
                {greeter.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3 text-gold" />{greeter.phone}</span>}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {greeter.languages?.map((l) => <Pill key={l} tone="navy" size="xs">{l}</Pill>)}
              </div>
            </div>
            <Pill tone={STATUS_TONE[greeter.status] || 'neutral'} size="sm" dot>{STATUS_LABEL[greeter.status] || greeter.status}</Pill>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
            <Kpi label="Abgeschlossen" value={completed} />
            <Kpi label="Aktiv" value={active} accent />
            <Kpi label="Verdient" value={`${earned.toLocaleString('de-DE')} €`} />
            <Kpi label="Offen (Auszahlung)" value={`${pendingPay.toLocaleString('de-DE')} €`} />
          </div>
        </CardBody>
      </Card>

      {/* Vertragsstatus + Verfügbarkeit */}
      <Card variant="default">
        <CardBody className="pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <SectionHeader title="Vertrag & Verfügbarkeit" />
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[12px]" style={{ color: 'var(--ds-t2)' }}>Vertragsstatus:</span>
                <select value={greeter.contract_status || 'pending'} onChange={(e) => setContract(e.target.value)}
                  className="h-8 px-2.5 text-[12.5px] rounded-lg cursor-pointer" style={inputStyle}>
                  <option value="pending">Ausstehend</option>
                  <option value="accepted">Angenommen</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-semibold mb-1.5 inline-flex items-center gap-1" style={{ color: 'var(--ds-t2)' }}><CalendarClock className="w-3 h-3" /> Wochen-Slots</div>
            {slots.length === 0 ? <span className="text-[12px]" style={{ color: 'var(--ds-t3)' }}>{greeter.availability || 'Keine Slots hinterlegt'}</span> : (
              <div className="flex flex-wrap gap-1">{slots.map((s) => <Pill key={s} tone="gold" size="xs">{s}</Pill>)}</div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Einsätze */}
      <Card variant="default">
        <CardBody className="pt-5">
          <SectionHeader title="Einsätze" count={missions.length} />
          {missions.length === 0 ? <EmptyState icon={Briefcase} title="Noch keine Einsätze" className="py-8" /> : (
            <div className="mt-2 divide-y" style={{ borderColor: 'var(--ds-card-border)' }}>
              {missions.map((m) => (
                <Link key={m.id} to={`/admin/missions/${m.id}`} className="flex items-center gap-3 py-2.5 group">
                  <div className="w-14 text-[11px] tabular-nums shrink-0" style={{ color: 'var(--ds-t3)' }}>{formatDate(m.datetime)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium truncate group-hover:text-gold transition" style={{ color: 'var(--ds-t1)' }}>{m.title}</div>
                    <div className="text-[11.5px] truncate" style={{ color: 'var(--ds-t3)' }}>{m.location || m.city}</div>
                  </div>
                  {m.pay != null && <span className="text-[12px] font-semibold tabular-nums" style={{ color: '#c49228' }}>{m.pay} €</span>}
                  <StatusPill status={m.status} size="xs" />
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Auszahlungen */}
      <Card variant="default">
        <CardBody className="pt-5">
          <SectionHeader title="Auszahlungen" count={payouts.length} />
          {payouts.length === 0 ? <EmptyState icon={Wallet} title="Keine Auszahlungen" className="py-8" /> : (
            <div className="mt-2 divide-y" style={{ borderColor: 'var(--ds-card-border)' }}>
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="text-[12px] flex-1" style={{ color: 'var(--ds-t3)' }}>{p.paid_at ? formatDate(p.paid_at) : formatDate(p.created_at)}</div>
                  <div className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--ds-t1)' }}>{(p.amount || 0).toLocaleString('de-DE')} €</div>
                  <Pill tone={PAYOUT_TONE[p.status]} size="xs">{PAYOUT_LABEL[p.status] || p.status}</Pill>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Spesen */}
      <Card variant="default">
        <CardBody className="pt-5">
          <SectionHeader title="Spesen" count={expenses.length} />
          {expenses.length === 0 ? <EmptyState icon={Receipt} title="Keine Spesen" className="py-8" /> : (
            <div className="mt-2 divide-y" style={{ borderColor: 'var(--ds-card-border)' }}>
              {expenses.map((x) => (
                <div key={x.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium capitalize" style={{ color: 'var(--ds-t1)' }}>{x.category}</div>
                    {x.note && <div className="text-[11.5px] truncate" style={{ color: 'var(--ds-t3)' }}>{x.note}</div>}
                  </div>
                  <div className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--ds-t1)' }}>{(x.amount || 0).toLocaleString('de-DE')} €</div>
                  <Pill tone={EXP_TONE[x.status]} size="xs">{EXP_LABEL[x.status] || x.status}</Pill>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Auszahlungsdaten (Admin-Sicht) */}
      <Card variant="default">
        <CardBody className="pt-5">
          <SectionHeader title="Auszahlungsdaten" />
          <div className="flex items-center gap-1.5 mt-1 mb-3 text-[11px]" style={{ color: 'var(--ds-t3)' }}>
            <Lock className="w-3 h-3" /> Nur für Admin sichtbar
          </div>
          {!priv ? (
            <p className="text-[12.5px]" style={{ color: 'var(--ds-t3)' }}>Keine Bankdaten hinterlegt.</p>
          ) : (
            <dl className="grid sm:grid-cols-3 gap-3 text-[12.5px]">
              <Field label="IBAN" value={priv.iban} />
              <Field label="Steuer-ID" value={priv.tax_id} />
              <Field label="Auszahlungsadresse" value={priv.payout_address} />
            </dl>
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

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-wider" style={{ color: 'var(--ds-t3)' }}>{label}</dt>
      <dd className="font-medium mt-0.5 break-all" style={{ color: 'var(--ds-t1)' }}>{value || '—'}</dd>
    </div>
  );
}
