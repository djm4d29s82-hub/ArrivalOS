import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, MapPin, Plane, Phone, Mail, Building2, Briefcase, UserCheck, FileText, CheckCircle2, Circle,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardBody, Pill, StatusPill, Avatar, EmptyState, SkeletonCard, SectionHeader } from '@/components/ui';
import { formatDate } from '@/lib/utils';

const STATUS_TONE = { preparation: 'gold', in_progress: 'gold', completed: 'green', cancelled: 'neutral' };
const STATUS_LABEL = { preparation: 'Vorbereitung', in_progress: 'Läuft', completed: 'Abgeschlossen', cancelled: 'Storniert' };
const ACTIVE = ['assigned', 'accepted', 'on_the_way', 'arrived', 'met_talent', 'in_progress', 'matched'];

export default function AdminCandidateDetail() {
  const { id } = useParams();

  const { data: candidate, isLoading } = useQuery({ queryKey: ['candidate', id], queryFn: () => base44.entities.Candidate.get(id) });
  const { data: missions = [] } = useQuery({ queryKey: ['candidate-missions', id], queryFn: () => base44.entities.Mission.filter({ candidate_id: id }, '-datetime') });
  const { data: documents = [] } = useQuery({ queryKey: ['candidate-documents', id], queryFn: () => base44.entities.Document.filter({ candidate_id: id }).catch(() => []) });
  const { data: greeters = [] } = useQuery({ queryKey: ['greeters'], queryFn: () => base44.entities.GreeterProfile.list() });
  const companyId = candidate?.company_id;
  const { data: company } = useQuery({ queryKey: ['company', companyId], queryFn: () => base44.entities.Company.get(companyId), enabled: !!companyId });

  const primary = missions.find((m) => ACTIVE.includes(m.status)) || missions[0];
  const { data: steps = [] } = useQuery({
    queryKey: ['candidate-steps', primary?.id],
    queryFn: () => base44.entities.JourneyStep.filter({ mission_id: primary.id }, 'order'),
    enabled: !!primary?.id,
  });

  if (isLoading || !candidate) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;

  const greeter = primary?.greeter_id ? greeters.find((g) => g.id === primary.greeter_id) : null;
  const doneSteps = steps.filter((s) => s.status === 'completed').length;

  return (
    <div className="space-y-5 pb-12">
      <Link to="/admin/candidates" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: 'var(--ds-t2)' }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Alle Kandidat:innen
      </Link>

      {/* Header */}
      <Card variant="default">
        <CardBody className="pt-5">
          <div className="flex items-start gap-4">
            <Avatar name={candidate.full_name} size="lg" ringed />
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl font-bold leading-tight" style={{ color: 'var(--ds-t1)' }}>{candidate.full_name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[12.5px]" style={{ color: 'var(--ds-t2)' }}>
                {candidate.role && <span>{candidate.role}</span>}
                {(candidate.origin || candidate.country_of_origin) && <span>Herkunft: {candidate.origin || candidate.country_of_origin}</span>}
                {candidate.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-gold" />{candidate.city}</span>}
                {candidate.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3 text-gold" />{candidate.phone}</span>}
                {candidate.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3 text-gold" />{candidate.email}</span>}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {candidate.languages?.map((l) => <Pill key={l} tone="navy" size="xs">{l}</Pill>)}
              </div>
            </div>
            <Pill tone={STATUS_TONE[candidate.status] || 'neutral'} size="sm">{STATUS_LABEL[candidate.status] || candidate.status}</Pill>
          </div>

          {/* Onboarding-Fortschritt */}
          <div className="mt-5">
            <div className="flex justify-between text-[11.5px] mb-1.5">
              <span style={{ color: 'var(--ds-t2)' }}>Onboarding-Fortschritt</span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--ds-t1)' }}>{candidate.progress || 0} %</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--ds-card-border)' }}>
              <div className="h-full bg-gradient-to-r from-gold to-gold-2 rounded-full transition-all" style={{ width: `${candidate.progress || 0}%` }} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Verknüpfungen — die täglichen Sprünge des Admins */}
      <div className="grid sm:grid-cols-3 gap-3">
        <LinkTile to={companyId ? `/admin/companies/${companyId}` : null} icon={Building2} label="Unternehmen" value={company?.name} />
        <LinkTile to={primary ? `/admin/missions/${primary.id}` : null} icon={Briefcase} label="Aktuelle Mission" value={primary ? (primary.title || STATUS_LABEL[primary.status] || primary.status) : null} pill={primary && <StatusPill status={primary.status} size="xs" />} />
        <LinkTile to={greeter ? `/admin/greeters/${greeter.id}` : null} icon={UserCheck} label="Begleiter" value={greeter?.full_name} />
      </div>

      {/* Reise-Eckdaten */}
      <Card variant="default">
        <CardBody className="pt-5">
          <SectionHeader title="Anreise" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-[12.5px]">
            <Fact label="Ankunftsdatum" value={candidate.arrival_date ? formatDate(candidate.arrival_date) : (candidate.arrival_time ? formatDate(candidate.arrival_time) : '—')} />
            <Fact label="Flug" value={candidate.flight_no || primary?.flight_number || primary?.flight_no || '—'} icon={Plane} />
            <Fact label="Stadt" value={candidate.city || '—'} />
            <Fact label="Status" value={STATUS_LABEL[candidate.status] || candidate.status} />
          </div>
        </CardBody>
      </Card>

      {/* Journey / Timeline der aktuellen Mission */}
      <Card variant="default">
        <CardBody className="pt-5">
          <SectionHeader title="Onboarding-Schritte" count={steps.length ? `${doneSteps}/${steps.length}` : undefined} />
          {steps.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Noch keine Schritte" description={primary ? 'Für die Mission sind noch keine Schritte geplant.' : 'Keine Mission vorhanden.'} className="py-8" />
          ) : (
            <div className="mt-2 space-y-1.5">
              {steps.map((s) => {
                const done = s.status === 'completed';
                return (
                  <div key={s.id} className="flex items-center gap-2.5 py-1.5">
                    {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-t3)' }} />}
                    <span className="text-[13px] flex-1" style={{ color: done ? 'var(--ds-t3)' : 'var(--ds-t1)', textDecoration: done ? 'line-through' : 'none' }}>{s.title}</span>
                    {s.scheduled_at && <span className="text-[11px] tabular-nums" style={{ color: 'var(--ds-t3)' }}>{formatDate(s.scheduled_at)}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Missionen */}
      <Card variant="default">
        <CardBody className="pt-5">
          <SectionHeader title="Missionen" count={missions.length} />
          {missions.length === 0 ? <EmptyState icon={Briefcase} title="Keine Missionen" className="py-8" /> : (
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

      {/* Dokumente */}
      <Card variant="default">
        <CardBody className="pt-5">
          <SectionHeader title="Dokumente" count={documents.length} />
          {documents.length === 0 ? <EmptyState icon={FileText} title="Keine Dokumente" className="py-8" /> : (
            <div className="mt-2 divide-y" style={{ borderColor: 'var(--ds-card-border)' }}>
              {documents.map((d) => (
                <div key={d.id} className="flex items-center gap-3 py-2.5">
                  <FileText className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-t3)' }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium truncate" style={{ color: 'var(--ds-t1)' }}>{d.title}</div>
                    {d.type && <div className="text-[11.5px]" style={{ color: 'var(--ds-t3)' }}>{d.type}</div>}
                  </div>
                  <Pill tone={d.verified || d.status === 'verified' ? 'green' : d.status === 'rejected' ? 'red' : 'gold'} size="xs">{d.status}</Pill>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Notizen */}
      {candidate.notes && (
        <Card variant="default">
          <CardBody className="pt-5">
            <SectionHeader title="Notizen" />
            <p className="text-[13px] whitespace-pre-wrap mt-2" style={{ color: 'var(--ds-t2)' }}>{candidate.notes}</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function LinkTile({ to, icon: Icon, label, value, pill }) {
  const inner = (
    <div className="rounded-xl px-4 py-3 h-full flex items-center gap-3" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.10)', color: '#c49228' }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] uppercase tracking-wider" style={{ color: 'var(--ds-t3)' }}>{label}</div>
        <div className="text-[13px] font-medium truncate" style={{ color: value ? 'var(--ds-t1)' : 'var(--ds-t3)' }}>{value || 'Nicht zugeordnet'}</div>
      </div>
      {pill}
    </div>
  );
  return to ? <Link to={to} className="block transition hover:-translate-y-0.5">{inner}</Link> : <div className="opacity-70">{inner}</div>;
}

function Fact({ label, value, icon: Icon }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider" style={{ color: 'var(--ds-t3)' }}>{label}</div>
      <div className="font-medium mt-0.5 inline-flex items-center gap-1" style={{ color: 'var(--ds-t1)' }}>
        {Icon && <Icon className="w-3 h-3 text-gold" />}{value}
      </div>
    </div>
  );
}
