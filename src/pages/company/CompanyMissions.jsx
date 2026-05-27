import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, Clock, Filter, Briefcase, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createMission } from '@/api';
import { useToast } from '@/components/ui/toaster';
import { formatDateTime, relativeTime } from '@/lib/utils';
import {
  PageHeader, Card, StatusPill, Avatar, Button,
  EmptyState, SearchInput, Select, Modal, Field, Input, Textarea, SkeletonCard,
} from '@/components/ui';
import { companyKernel, missionProgress } from '@/lib/missionKernel';

const STATUSES = ['created', 'open', 'matched', 'assigned', 'in_progress', 'completed', 'cancelled'];
const STATUS_LABELS = {
  created: 'Neu', open: 'Offen', matched: 'Matched', assigned: 'Zugewiesen',
  in_progress: 'Läuft', completed: 'Abgeschlossen', cancelled: 'Storniert',
  issue_open: 'Problem offen',
};

const PRIORITY_BORDER = { normal: 'var(--ds-card-border)', active: 'rgba(96,165,250,0.35)', critical: 'rgba(239,68,68,0.40)' };

export default function CompanyMissions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const companyId = user?.company_id;

  const { data: missions = [], isLoading } = useQuery({ queryKey: ['missions'], queryFn: () => base44.entities.Mission.list('-datetime') });
  const { data: candidates = [] } = useQuery({ queryKey: ['candidates'], queryFn: () => base44.entities.Candidate.list() });
  const { data: greeters = [] } = useQuery({ queryKey: ['greeters'], queryFn: () => base44.entities.GreeterProfile.list() });
  const { data: allSteps = [] } = useQuery({ queryKey: ['journeySteps'], queryFn: () => base44.entities.JourneyStep.list() });

  const stepsByMission = useMemo(() => {
    const map = {};
    for (const s of allSteps) { (map[s.mission_id] ||= []).push(s); }
    return map;
  }, [allSteps]);

  const { data: allLogs = [] } = useQuery({ queryKey: ['activityLog'], queryFn: () => base44.entities.ActivityLog.list('-timestamp') });
  const lastActivityByMission = useMemo(() => {
    const map = {};
    for (const l of allLogs) { if (!map[l.entity_id]) map[l.entity_id] = l; } // sorted desc → first is newest
    return map;
  }, [allLogs]);

  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const myCandidates = companyId ? candidates.filter((c) => c.company_id === companyId) : candidates;
  const my = companyId ? missions.filter((m) => m.company_id === companyId) : missions;
  const filtered = my.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (q && !`${m.title} ${m.city} ${m.location || ''}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const active = my.filter((m) => ['created', 'matched', 'assigned', 'accepted', 'on_the_way', 'arrived', 'met_talent', 'in_progress'].includes(m.status)).length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Relocation · Missionen"
        title="Meine Missionen"
        description={`${my.length} gesamt · ${active} laufend`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setShowForm(true)}>
            Mission anfordern
          </Button>
        }
      />

      <Card variant="default" className="px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titel, Stadt oder Treffpunkt…" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--light)]" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Alle Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-3"><SkeletonCard /><SkeletonCard /></div>
      ) : filtered.length === 0 ? (
        <Card variant="flat">
          <EmptyState
            icon={Briefcase}
            title="Keine Missionen gefunden"
            description="Fordere die erste Mission an, wir matchen passende Greeter automatisch."
            action={<Button variant="primary" icon={Plus} onClick={() => setShowForm(true)}>Mission anfordern</Button>}
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              candidate={candidates.find((c) => c.id === m.candidate_id)}
              greeter={greeters.find((g) => g.id === m.greeter_id)}
              steps={stepsByMission[m.id]}
              lastActivity={lastActivityByMission[m.id]}
            />
          ))}
        </div>
      )}

      {showForm && (
        <RequestForm
          companyId={companyId}
          candidates={myCandidates}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['missions'] });
            toast({ title: 'Mission angefordert', description: 'Matching läuft im Hintergrund.' });
          }}
        />
      )}

    </div>
  );
}

function MissionCard({ mission, candidate, greeter, steps, lastActivity }) {
  const k = companyKernel(mission, { greeter, candidate, steps });
  const prog = missionProgress(mission, steps);
  const baseBorder = PRIORITY_BORDER[k.priority] || 'var(--ds-card-border)';
  const isCancelled = mission.status === 'cancelled';
  return (
    <Link
      to={`/company/missions/${mission.id}`}
      className="rounded-xl p-5 block transition-all"
      style={{ background: 'var(--ds-card)', border: `1px solid ${baseBorder}` }}
      onMouseEnter={(e) => { if (k.priority === 'normal') e.currentTarget.style.borderColor = 'rgba(196,146,40,0.28)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = baseBorder; }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="font-serif text-lg font-semibold leading-tight" style={{ color: 'var(--ds-t1)' }}>{mission.title}</div>
        <StatusPill status={mission.status} />
      </div>

      {/* STATE — eine lesbare Aussage */}
      <div className="text-[13px] mb-2.5" style={{ color: 'var(--ds-t1)' }}>{k.statement}</div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] mb-3" style={{ color: 'var(--ds-t3)' }}>
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" style={{ color: '#c49228' }} />{mission.city}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" style={{ color: '#c49228' }} />{formatDateTime(mission.datetime)}</span>
        {candidate && (
          <span className="flex items-center gap-1 min-w-0">
            <Avatar name={candidate.full_name} size="xs" />
            <span className="truncate" style={{ color: 'var(--ds-t2)' }}>{candidate.full_name}</span>
          </span>
        )}
      </div>

      {/* Fortschritt */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ds-card-border)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${prog.pct}%`, background: isCancelled ? 'transparent' : 'linear-gradient(90deg, #c49228, #d4a83a)' }} />
        </div>
        <span className="text-[10.5px] tabular-nums shrink-0" style={{ color: 'var(--ds-t3)' }}>
          {prog.total ? `${Math.min(prog.index + 1, prog.total)}/${prog.total}` : `${prog.pct}%`}
        </span>
      </div>

      {/* NEXT + Blocker */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        {k.next ? (
          <span className="text-[11.5px] truncate" style={{ color: 'var(--ds-t2)' }}>→ {k.next}</span>
        ) : <span />}
        {k.blockers.length > 0 && (
          <div className="flex gap-1.5 shrink-0">
            {k.blockers.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium"
                style={b.tone === 'red'
                  ? { background: 'rgba(239,68,68,0.12)', color: '#dc2626' }
                  : { background: 'rgba(245,158,11,0.14)', color: '#b45309' }}>
                <AlertTriangle className="w-2.5 h-2.5" /> {b.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Letzte Aktivität */}
      {lastActivity && (
        <div className="mt-2.5 pt-2.5 text-[11px] truncate" style={{ borderTop: '1px solid var(--ds-card-border)', color: 'var(--ds-t3)' }}>
          {lastActivity.description} · {relativeTime(lastActivity.timestamp)}
        </div>
      )}
    </Link>
  );
}

function RequestForm({ companyId, candidates = [], onClose, onCreated }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState({ title: '', description: '', city: 'München', location: '', datetime: '', languages: 'Englisch', pay: 90, candidateId: '' });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await createMission({
        companyId,
        candidateId: form.candidateId || undefined,
        datetime: form.datetime,
        location: form.location,
        city: form.city,
        title: form.title,
        pay: Number(form.pay) || 0,
        role: user?.role || 'company',
        actor: user?.email || 'company@neuland.de',
        base44,
      });
      onCreated?.(); onClose();
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Modal
      open onClose={onClose}
      title="Mission anfordern"
      description="Wir matchen Greeter automatisch nach Stadt und Sprache."
      size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
        <Button variant="primary" onClick={submit} loading={busy} disabled={!form.title || !form.datetime}>Anfordern</Button>
      </>}
    >
      <div className="space-y-4">
        <Field label="Titel"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        {candidates.length > 0 && (
          <Field label="Talent (optional)">
            <Select value={form.candidateId} onChange={(e) => setForm({ ...form, candidateId: e.target.value })} className="w-full">
              <option value="">— Noch nicht zugewiesen —</option>
              {candidates.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.country_of_origin ? ` · ${c.country_of_origin}` : ''}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Beschreibung"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stadt">
            <Select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full">
              {['München', 'Berlin', 'Hamburg', 'Köln', 'Frankfurt', 'Stuttgart'].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Datum & Uhrzeit"><Input required type="datetime-local" value={form.datetime} onChange={(e) => setForm({ ...form, datetime: e.target.value })} /></Field>
        </div>
        <Field label="Ort / Treffpunkt"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sprachen (kommagetrennt)"><Input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} /></Field>
          <Field label="Vergütung (€)"><Input type="number" value={form.pay} onChange={(e) => setForm({ ...form, pay: e.target.value })} /></Field>
        </div>
      </div>
    </Modal>
  );
}
