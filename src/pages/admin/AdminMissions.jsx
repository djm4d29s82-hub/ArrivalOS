import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Filter, Briefcase, MapPin, Calendar, ChevronRight, Building2, Sparkles, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMissionState } from '@/lib/useMissionState';
import { MissionStatus, getStatusLabel } from '@/lib/missionStateMachine';
import { runMatching, STAGE_LABELS_DE, createMission } from '@/api';
import { reopenMission } from '@/lib/missionEngine';
import { useToast } from '@/components/ui/toaster';
import {
  PageHeader, SectionHeader, Card, Pill, StatusPill, Avatar, Button, IconButton,
  EmptyState, SearchInput, Select, Modal, Field, Input, Textarea, SkeletonCard,
} from '@/components/ui';

const STATUSES = ['open', 'matched', 'assigned', 'in_progress', 'completed', 'cancelled'];
const STATUS_LABELS = {
  open: 'Offen', matched: 'Matched', assigned: 'Zugewiesen',
  in_progress: 'Läuft', completed: 'Abgeschlossen', cancelled: 'Storniert',
};

export default function AdminMissions() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: missions = [], isLoading } = useQuery({ queryKey: ['missions'], queryFn: () => base44.entities.Mission.list('-datetime') });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: candidates = [] } = useQuery({ queryKey: ['candidates'], queryFn: () => base44.entities.Candidate.list() });
  const { data: greeters = [] } = useQuery({ queryKey: ['greeters'], queryFn: () => base44.entities.GreeterProfile.list() });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const filtered = missions.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (search && !`${m.title} ${m.city} ${m.location || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // group by status bucket for visual scanning — must cover ALL statuses,
  // otherwise a mission (e.g. a freshly 'created' one) lands in no bucket and
  // stays invisible even though the counter shows it.
  const CRITICAL = ['created', 'open', 'matched', 'issue_open', 'issue_reported'];
  const ACTIVE = ['assigned', 'accepted', 'on_the_way', 'arrived', 'met_talent', 'in_progress'];
  const CLOSED = ['completed', 'cancelled'];
  const covered = new Set([...CRITICAL, ...ACTIVE, ...CLOSED]);

  const buckets = [
    { key: 'critical', label: 'Aufmerksamkeit nötig', items: filtered.filter((m) => CRITICAL.includes(m.status)) },
    { key: 'active', label: 'Aktive Einsätze', items: filtered.filter((m) => ACTIVE.includes(m.status)) },
    { key: 'closed', label: 'Erledigt', items: filtered.filter((m) => CLOSED.includes(m.status)) },
    // Defensive catch-all: any unknown/future status still renders here.
    { key: 'other', label: 'Sonstige', items: filtered.filter((m) => !covered.has(m.status)) },
  ];

  const refresh = () => qc.invalidateQueries();

  const onRematch = async (m) => {
    try { await runMatching({ mission: m, role: 'admin', actor: 'admin@neuland.de' }); toast({ title: 'Matching gestartet' }); refresh(); }
    catch (e) { toast({ title: 'Fehler', description: e.message, variant: 'destructive' }); }
  };

  const onReopen = async (m) => {
    try { await reopenMission(m, m.greeter_id ? 'in_progress' : 'created', 'admin@neuland.de'); toast({ title: 'Mission wieder geöffnet' }); refresh(); }
    catch (e) { toast({ title: 'Fehler', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Operations · Missionen"
        title="Missionen"
        description={`${missions.length} Missionen gesamt · ${filtered.length} angezeigt`}
        actions={
          <Button variant="primary" icon={Plus} size="md" onClick={() => setShowForm(true)}>
            Neue Mission
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-3 rounded-2xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <div className="flex-1 min-w-[220px]">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titel, Stadt oder Treffpunkt…" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-[var(--light)]" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-[12.5px]">
            <option value="all">Alle Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : filtered.length === 0 ? (
        <Card variant="flat">
          <EmptyState
            icon={Briefcase}
            title="Keine Missionen gefunden"
            description="Lege eine neue Mission an oder passe die Filter an."
            action={<Button variant="primary" icon={Plus} onClick={() => setShowForm(true)}>Neue Mission</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {buckets.map((b) => {
            if (b.items.length === 0) return null;
            const BucketIcon = b.key === 'critical' ? AlertCircle : b.key === 'active' ? Clock : CheckCircle2;
            const bucketColor = b.key === 'critical' ? 'text-red-600' : b.key === 'active' ? 'text-gold' : 'text-green-600';
            return (
              <section key={b.key} className="space-y-3.5">
                <div className="flex items-center gap-2 px-1">
                  <div className={`w-5 h-5 ${bucketColor}`}><BucketIcon size={20} /></div>
                  <h2 className="font-semibold text-[14px]" style={{ color: 'var(--ds-t1)' }}>{b.label}</h2>
                  <div className="text-[11px] font-medium text-[var(--mid)] ml-auto">{b.items.length} {b.items.length === 1 ? 'Einsatz' : 'Einsätze'}</div>
                </div>
                <div className="space-y-2">
                  {b.items.map((m) => (
                    <MissionCard
                      key={m.id}
                      mission={m}
                      company={companies.find((c) => c.id === m.company_id)}
                      candidate={candidates.find((c) => c.id === m.candidate_id)}
                      greeter={greeters.find((g) => g.id === m.greeter_id)}
                      onRematch={onRematch}
                      onReopen={onReopen}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {showForm && <NewMissionForm companies={companies} onClose={() => setShowForm(false)} onCreated={refresh} />}
    </div>
  );
}

function MissionCard({ mission, company, candidate, greeter, onRematch, onReopen }) {
  const { transitionTo, canTransitionTo, isDirty, isSyncing } = useMissionState(mission.id, 'admin@neuland.de');
  const stage = mission.greeter_stage;
  const isPriority = [MissionStatus.ASSIGNED, MissionStatus.ACCEPTED].includes(mission.status);
  const isBusy = isDirty || isSyncing;

  const onAdvance = async (nextStatus) => {
    try {
      await transitionTo(nextStatus);
    } catch (e) {
      // Error toast handled by hook
    }
  };
  
  return (
    <div className="rounded-xl transition flex items-center gap-3 px-3 py-2.5"
      style={{ background: 'var(--ds-card)', border: isPriority ? '1px solid rgba(239,68,68,0.25)' : '1px solid var(--ds-card-border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,146,40,0.04)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-card)'; }}
    >
      {/* Clickable body — date + title + meta on one row */}
      <Link to={`/admin/missions/${mission.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-center w-12 shrink-0 rounded-lg py-1.5" style={{ background: 'var(--ds-card-border)' }}>
          <div className="text-[8.5px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ds-t3)' }}>{dayShort(mission.datetime)}</div>
          <div className="font-serif text-[17px] font-bold tabular-nums leading-none" style={{ color: '#c49228' }}>{dayOf(mission.datetime)}</div>
          <div className="text-[9px] text-[var(--mid)] tabular-nums">{timeOf(mission.datetime)}</div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-[14px] truncate" style={{ color: 'var(--ds-t1)' }}>{mission.title}</span>
            <StatusPill status={mission.status} />
          </div>
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11.5px] mt-1" style={{ color: 'var(--mid)' }}>
            <span className="inline-flex items-center gap-1 min-w-0"><MapPin className="w-3 h-3 text-gold shrink-0" /><span className="truncate">{mission.location || mission.city}</span></span>
            {company && <><span className="text-[var(--light)]">·</span><span className="truncate">{company.name}</span></>}
            {candidate && <span style={{ color: 'var(--ds-t2)' }}>· {candidate.full_name}</span>}
            {greeter && <Pill tone="navy" size="xs">{greeter.full_name?.split(' ')[0]}</Pill>}
            {stage && stage !== 'completed' && <Pill tone="gold" size="xs">{STAGE_LABELS_DE[stage]}</Pill>}
            {mission.has_issue && <Pill tone="red" size="xs">⚠ Issue</Pill>}
          </div>
        </div>
      </Link>

      {/* Pay + actions inline (no separate bar) */}
      <div className="flex items-center gap-2 shrink-0">
        {mission.pay ? <span className="font-semibold text-[13px] tabular-nums" style={{ color: '#c49228' }}>{mission.pay} €</span> : null}
        {mission.status === MissionStatus.ASSIGNED && (
          <Button variant="outline" size="xs" icon={Sparkles} onClick={() => onRematch(mission)}>Matching</Button>
        )}
        {mission.status === MissionStatus.ACCEPTED && (
          <Button variant="primary" size="xs" disabled={!canTransitionTo(MissionStatus.ON_THE_WAY) || isBusy} loading={isBusy} onClick={() => onAdvance(MissionStatus.ON_THE_WAY)}>Unterwegs</Button>
        )}
        {mission.status === MissionStatus.ON_THE_WAY && (
          <Button variant="primary" size="xs" disabled={!canTransitionTo(MissionStatus.ARRIVED) || isBusy} loading={isBusy} onClick={() => onAdvance(MissionStatus.ARRIVED)}>Vor Ort</Button>
        )}
        {mission.status === MissionStatus.ARRIVED && (
          <Button variant="success" size="xs" disabled={!canTransitionTo(MissionStatus.COMPLETED) || isBusy} loading={isBusy} onClick={() => onAdvance(MissionStatus.COMPLETED)}>Abschließen</Button>
        )}
        {![MissionStatus.COMPLETED, MissionStatus.CANCELLED, MissionStatus.ISSUE_REPORTED].includes(mission.status) && (
          <Button variant="ghost" size="xs" className="!text-red-600 hover:!bg-red-500/10" disabled={isBusy} onClick={() => onAdvance(MissionStatus.CANCELLED)}>Stornieren</Button>
        )}
        {[MissionStatus.COMPLETED, MissionStatus.CANCELLED].includes(mission.status) && (
          <Button variant="outline" size="xs" icon={RefreshCw} onClick={() => onReopen(mission)}>Wieder öffnen</Button>
        )}
      </div>
    </div>
  );
}

function NewMissionForm({ companies, onClose, onCreated }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: '', description: '', company_id: companies[0]?.id || '',
    city: 'München', location: '', datetime: '',
    languages: 'Englisch', pay: 90,
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await createMission({
        companyId: form.company_id,
        title: form.title,
        city: form.city,
        location: form.location,
        datetime: form.datetime,
        pay: Number(form.pay) || 0,
        role: 'admin',
        actor: 'admin@neuland.de',
        base44,
      });
      toast({ title: 'Mission angelegt' });
      onCreated?.(); onClose();
    } catch (e) {
      toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Neue Mission"
      description="Anschließend startet das Matching automatisch."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" onClick={submit} loading={busy}>Mission anlegen</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Titel"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Beschreibung"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unternehmen">
            <Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} className="w-full">
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Stadt">
            <Select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full">
              {['München', 'Berlin', 'Hamburg', 'Köln', 'Frankfurt', 'Stuttgart'].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Ort / Treffpunkt"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum & Uhrzeit"><Input required type="datetime-local" value={form.datetime} onChange={(e) => setForm({ ...form, datetime: e.target.value })} /></Field>
          <Field label="Vergütung (€)"><Input type="number" value={form.pay} onChange={(e) => setForm({ ...form, pay: e.target.value })} /></Field>
        </div>
        <Field label="Sprachen (kommagetrennt)"><Input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} /></Field>
      </form>
    </Modal>
  );
}

// helpers
function timeOf(iso) { return iso ? new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—'; }
function dayOf(iso) { return iso ? String(new Date(iso).getDate()).padStart(2, '0') : '—'; }
function dayShort(iso) { return iso ? new Date(iso).toLocaleDateString('de-DE', { weekday: 'short' }) : ''; }
