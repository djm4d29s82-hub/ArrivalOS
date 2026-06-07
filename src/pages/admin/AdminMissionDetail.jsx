import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MapPin, Building2, Clock, Briefcase, Users, Phone, MessageCircle,
  RefreshCw, AlertTriangle, ShieldAlert, Sparkles, Activity, FileText, ChevronRight,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toaster';
import {
  transitionMission, cancelMission, runMatchingEngine, STAGE_LABELS_DE, stageIndex, reopenMission,
} from '@/lib/missionEngine';
import { MissionStatus } from '@/lib/missionStateMachine';
import { assignGreeter, cancelMission as cancelMissionSafe } from '@/api';
import { useRealtimeMissions } from '@/lib/useRealtimeMissions';
import {
  Card, CardBody, Pill, StatusPill, Avatar, Button, IconButton, EmptyState,
  Modal, Field, Select, Textarea, SkeletonCard, SectionHeader,
} from '@/components/ui';
import MissionStepPlanner from '@/components/mission/MissionStepPlanner';
import MissionServices from '@/components/mission/MissionServices';
import MissionExpenses from '@/components/mission/MissionExpenses';
import { relativeTime } from '@/lib/utils';

const STAGES = ['accepted', 'eta_sent', 'on_the_way', 'arrived', 'in_progress', 'completed'];

export default function AdminMissionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { mission } = useRealtimeMissions({ id });
  const [candidate, setCandidate] = useState(null);
  const [company, setCompany] = useState(null);
  const [greeter, setGreeter] = useState(null);
  const [greeters, setGreeters] = useState([]);
  const [logs, setLogs] = useState([]);
  const [plannedCount, setPlannedCount] = useState(0); // reported by MissionStepPlanner
  const [showReassign, setShowReassign] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showReopen, setShowReopen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mission) return;
    if (mission.candidate_id) base44.entities.Candidate.get(mission.candidate_id).then(setCandidate).catch(() => {});
    if (mission.company_id) base44.entities.Company.get(mission.company_id).then(setCompany).catch(() => {});
    if (mission.greeter_id) base44.entities.GreeterProfile.get(mission.greeter_id).then(setGreeter).catch(() => setGreeter(null));
    else setGreeter(null);
    base44.entities.ActivityLog.filter({ entity_id: mission.id }, '-timestamp').then(setLogs).catch(() => setLogs([]));
  }, [mission]);

  useEffect(() => { base44.entities.GreeterProfile.list().then(setGreeters); }, []);

  if (!mission) {
    return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;
  }

  const stage = mission.greeter_stage;
  const stageIdx = stageIndex(stage);
  const refresh = () => qc.invalidateQueries();

  const onRematch = async () => {
    setBusy(true);
    const redispatch = !!mission.greeter_id; // a greeter is assigned → re-dispatch excludes them
    try {
      await runMatchingEngine(mission, redispatch ? { excludeGreeterId: mission.greeter_id } : {});
      toast({ title: redispatch ? 'Neu ausgeschrieben' : 'Matching neu gestartet', description: redispatch ? 'Der bisherige Greeter wurde ausgeschlossen.' : undefined });
      refresh();
    }
    catch (e) { toast({ title: 'Fehler', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };


  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start gap-3">
        <IconButton icon={ArrowLeft} variant="ghost" onClick={() => nav('/admin/missions')} label="Zurück" />
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-gold font-bold mb-1">
            Operations · Mission {mission.id?.slice?.(0, 8) || ''}
          </div>
          <h1 className="font-serif text-[26px] leading-tight font-bold" style={{ color: 'var(--ds-t1)' }}>{mission.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[12.5px] text-[var(--mid)]">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gold" />{formatDateTime(mission.datetime)}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gold" />{mission.location || mission.city}</span>
            {company && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{company.name}</span>}
            <StatusPill status={mission.status} />
            {mission.has_issue && <Pill tone="red" size="xs" dot>Issue gemeldet</Pill>}
          </div>
        </div>
        {['completed', 'cancelled'].includes(mission.status) && (
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => setShowReopen(true)}>
            Wieder öffnen
          </Button>
        )}
      </div>

      {/* Stage progress */}
      <Card variant="default">
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-widest text-[var(--light)] font-semibold">Fortschritt</div>
              <div className="font-semibold text-[14px] mt-0.5" style={{ color: 'var(--ds-t1)' }}>{stage ? STAGE_LABELS_DE[stage] : 'Noch nicht angenommen'}</div>
            </div>
            <Pill tone="navy" size="sm" dot>{stage ? `${Math.max(0, stageIdx)+1}/${STAGES.length}` : '0/6'}</Pill>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {STAGES.map((s, i) => {
              const active = stageIdx >= i;
              return (
                <div key={s} className="flex flex-col gap-1">
                  <div className={`h-1.5 rounded-full transition-all ${active ? 'bg-gold' : ''}`}
                    style={!active ? { background: 'var(--ds-card-border)' } : {}} />
                  <div className="text-[9.5px] uppercase tracking-wider text-center"
                    style={{ color: active ? 'var(--ds-t1)' : 'var(--ds-t3)', fontWeight: active ? '600' : '400' }}>
                    {STAGE_LABELS_DE[s]?.split(' ')[0]}
                  </div>
                </div>
              );
            })}
          </div>
          {mission.eta_at && stage === 'eta_sent' && (
            <div className="mt-3 rounded-lg px-3 py-2 text-[12px]" style={{ background: 'rgba(196,146,40,0.10)', color: 'var(--ds-t1)' }}>
              <span className="font-semibold">ETA:</span> {formatDateTime(mission.eta_at)}
              {mission.eta_note && <span style={{ color: 'var(--ds-t2)' }}> · {mission.eta_note}</span>}
            </div>
          )}
          {mission.last_issue && (
            <div className="mt-3 rounded-lg px-3 py-2 text-[12px] text-red-400"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
              <div className="font-semibold flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" />Letztes Issue · {mission.last_issue.severity}</div>
              <div className="mt-0.5">{mission.last_issue.message}</div>
              <div className="text-[10.5px] text-red-500/70 mt-1">{relativeTime(mission.last_issue.at)} · {mission.last_issue.by}</div>
              {mission.greeter_id && !['completed', 'cancelled'].includes(mission.status) && (
                <Button variant="outline" size="sm" icon={RefreshCw} loading={busy} onClick={onRematch}
                  className="mt-2 !text-red-700 hover:!bg-red-500/10 hover:!border-red-500/30">
                  Anderen Greeter finden
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left column: parties */}
        <div className="lg:col-span-2 space-y-5">
          {/* Greeter */}
          <Card variant="default">
            <CardBody>
              <SectionHeader title="Greeter" action={
                <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => setShowReassign(true)}>
                  {greeter ? 'Neu zuweisen' : 'Zuweisen'}
                </Button>
              } />
              {!greeter && plannedCount === 0 && (
                <div className="mt-2 rounded-lg px-3 py-2 text-[11.5px] flex items-start gap-1.5"
                  style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', color: '#b45309' }}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Plane zuerst die Schritte unten — eine Greeter-Zuweisung ist erst danach möglich.</span>
                </div>
              )}
              {greeter ? (
                <div className="flex items-center gap-3 mt-2">
                  <Avatar name={greeter.full_name} size="lg" ringed />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold" style={{ color: 'var(--ds-t1)' }}>{greeter.full_name}</div>
                    <div className="text-[12px] text-[var(--mid)] flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span>★ {greeter.rating?.toFixed(1) || '—'}</span>
                      <span>·</span>
                      <span>{greeter.city}</span>
                      {greeter.languages?.length > 0 && <><span>·</span><span>{greeter.languages.slice(0, 3).join(', ')}</span></>}
                    </div>
                  </div>
                  <a href={greeter.phone ? `tel:${greeter.phone}` : '#'} className="grid place-items-center w-10 h-10 rounded-lg transition"
                    style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t1)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,146,40,0.12)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-card-border)'; }}>
                    <Phone className="w-4 h-4" />
                  </a>
                  <Link to="/admin/messages" className="grid place-items-center w-10 h-10 rounded-lg transition"
                    style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t1)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,146,40,0.12)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-card-border)'; }}>
                    <MessageCircle className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="mt-2">
                  <EmptyState
                    icon={Users}
                    title="Noch kein Greeter zugewiesen"
                    description={mission.matched_greeters?.length ? `${mission.matched_greeters.length} Kandidaten gematcht` : 'Matching starten oder manuell zuweisen'}
                    action={
                      <div className="flex gap-2 justify-center">
                        {(!mission.matched_greeters || mission.matched_greeters.length === 0) && (
                          <Button variant="outline" size="sm" icon={Sparkles} onClick={onRematch} loading={busy}>Matching</Button>
                        )}
                        <Button variant="primary" size="sm" onClick={() => setShowReassign(true)}>Manuell zuweisen</Button>
                      </div>
                    }
                  />
                </div>
              )}
            </CardBody>
          </Card>

          {/* Candidate */}
          {candidate && (
            <Card variant="default">
              <CardBody>
                <SectionHeader title="Talent" />
                <div className="flex items-center gap-3 mt-2">
                  <Avatar name={candidate.full_name} size="lg" ringed />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold" style={{ color: 'var(--ds-t1)' }}>{candidate.full_name}</div>
                    <div className="text-[12px] text-[var(--mid)] mt-0.5">
                      {candidate.country_of_origin} · {candidate.email}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {candidate.languages?.slice(0, 4).map((l) => <Pill key={l} tone="navy" size="xs">{l}</Pill>)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
                  {candidate.arrival_date && <Info label="Ankunft" value={formatDate(candidate.arrival_date)} />}
                  {(mission.flight_number || mission.flight_no) && <Info label="Flugnummer" value={mission.flight_number || mission.flight_no} />}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Journey-step planner — plan/edit/reorder/date the onboarding steps */}
          <MissionStepPlanner missionId={mission.id} missionDatetime={mission.datetime} onStepsChange={setPlannedCount} />

          {/* Services Marketplace — activate/track partner services for this arrival */}
          <Card variant="default">
            <CardBody>
              <SectionHeader title="Services" />
              <div className="mt-2">
                <MissionServices missionId={mission.id} createdBy={mission.last_updated_by || null} managed />
              </div>
            </CardBody>
          </Card>

          {/* Auslagen / Spesen — approve greeter-fronted costs; approved totals flow onto the company invoice */}
          <Card variant="default">
            <CardBody>
              <SectionHeader title="Auslagen / Spesen" />
              <div className="mt-2">
                <MissionExpenses missionId={mission.id} managed />
              </div>
            </CardBody>
          </Card>

          {/* Activity log */}
          <Card variant="default">
            <CardBody>
              <SectionHeader title="Activity" count={logs.length} />
              {logs.length === 0 ? (
                <div className="text-[12px] text-[var(--light)] py-4 text-center">Noch keine Aktivität</div>
              ) : (
                <ol className="mt-2 space-y-2.5">
                  {logs.slice(0, 20).map((l) => {
                    const dot = l.action?.includes('issue') ? 'bg-red-500' : l.action?.includes('stage') ? 'bg-gold' : 'bg-navy/50';
                    return (
                      <li key={l.id} className="flex items-start gap-2.5 text-[12px]">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dot}`} />
                        <div className="flex-1 min-w-0">
                          <div style={{ color: 'var(--ds-t1)' }}>
                            <span className="font-semibold">{l.actor || 'System'}</span>{' '}
                            <span className="text-[var(--mid)]">{l.action}</span>
                          </div>
                          {l.payload?.note && <div className="text-[var(--mid)] mt-0.5">{l.payload.note}</div>}
                          {l.payload?.message && <div className="text-[var(--mid)] mt-0.5">{l.payload.message}</div>}
                          <div className="text-[10.5px] text-[var(--light)] tabular-nums">{relativeTime(l.timestamp)}</div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right column: details + danger */}
        <aside className="space-y-5">
          <Card variant="default">
            <CardBody>
              <SectionHeader title="Details" />
              <div className="space-y-2 mt-2">
                <Info label="Stadt" value={mission.city} />
                {mission.location && <Info label="Treffpunkt" value={mission.location} />}
                {mission.pay !== undefined && <Info label="Vergütung" value={`${mission.pay} €`} />}
                {mission.duration && <Info label="Dauer" value={`${mission.duration} h`} />}
                {mission.requirements?.languages && <Info label="Sprachen" value={mission.requirements.languages.join(', ')} />}
              </div>
            </CardBody>
          </Card>

          {/* Quick links */}
          <Card variant="default">
            <CardBody>
              <SectionHeader title="Aktionen" />
              <div className="space-y-2 mt-2">
                <Link to={`/admin/messages?mission=${mission.id}`}>
                  <Button variant="outline" size="sm" fullWidth icon={MessageCircle}>Nachrichten öffnen</Button>
                </Link>
                {!['completed', 'cancelled'].includes(mission.status) && (
                  <Button variant="outline" size="sm" fullWidth icon={AlertTriangle} className="!text-red-700 hover:!bg-red-500/10 hover:!border-red-500/30" onClick={() => setShowCancel(true)}>
                    Mission stornieren
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>

      {showReassign && (
        <ReassignDialog
          mission={mission}
          greeters={greeters}
          stepsPlanned={plannedCount > 0}
          onClose={() => setShowReassign(false)}
          onDone={refresh}
        />
      )}
      {showCancel && (
        <CancelDialog
          mission={mission}
          onClose={() => setShowCancel(false)}
          onDone={() => { refresh(); nav('/admin/missions'); }}
        />
      )}
      {showReopen && (
        <ReopenDialog
          mission={mission}
          onClose={() => setShowReopen(false)}
          onDone={refresh}
        />
      )}
    </div>
  );
}

function ReopenDialog({ mission, onClose, onDone }) {
  const { toast } = useToast();
  const hasGreeter = !!mission.greeter_id;
  const OPTIONS = hasGreeter
    ? [['in_progress', 'Onboarding läuft'], ['arrived', 'Vor Ort'], ['on_the_way', 'Unterwegs'], ['accepted', 'Angenommen'], ['assigned', 'Zugewiesen']]
    : [['created', 'Geplant']];
  const [toStatus, setToStatus] = useState(OPTIONS[0][0]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await reopenMission(mission, toStatus, 'admin@neuland.de');
      toast({ title: 'Mission wieder geöffnet' });
      onDone?.(); onClose();
    } catch (e) {
      toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Mission wieder öffnen" description="Auf welchen Status zurücksetzen? Schritte und Fortschritt bleiben erhalten." size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
        <Button variant="primary" onClick={submit} loading={busy}>Wieder öffnen</Button>
      </>}
    >
      <Field label="Status">
        <Select value={toStatus} onChange={(e) => setToStatus(e.target.value)} className="w-full">
          {OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
    </Modal>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[12.5px]">
      <span className="text-[var(--mid)]">{label}</span>
      <span className="font-medium text-right" style={{ color: 'var(--ds-t1)' }}>{value}</span>
    </div>
  );
}

function ReassignDialog({ mission, greeters, stepsPlanned, onClose, onDone }) {
  const { toast } = useToast();
  const [greeterId, setGreeterId] = useState(mission.greeter_id || '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!greeterId) return;
    if (!stepsPlanned) {
      toast({ title: 'Keine Schritte geplant', description: 'Bitte erst den Schritt-Plan erstellen, bevor du einen Greeter zuweist.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      // assignGreeter persists the assignment and logs it via the engine (+ DB status trigger).
      // No extra ActivityLog.create here — the old one used non-existent actor/payload columns.
      await assignGreeter({ mission, greeterId, role: 'admin', actor: 'admin@neuland.de', base44 });
      toast({ title: 'Greeter zugewiesen' });
      onDone?.(); onClose();
    } catch (e) {
      toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Greeter zuweisen" size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
        <Button variant="primary" onClick={submit} loading={busy} disabled={!greeterId}>Zuweisen</Button>
      </>}
    >
      <Field label="Greeter wählen">
        <Select value={greeterId} onChange={(e) => setGreeterId(e.target.value)} className="w-full">
          <option value="">— bitte wählen —</option>
          {greeters
            .filter((g) => g.id !== mission.greeter_id) // never reassign to the current greeter
            .filter((g) => !mission.matched_greeters || mission.matched_greeters.length === 0 || mission.matched_greeters.includes(g.id))
            .map((g) => <option key={g.id} value={g.id}>{g.full_name} · {g.city} · ★{g.rating?.toFixed(1) || '—'}</option>)}
        </Select>
      </Field>
      {mission.matched_greeters?.length > 0 && (
        <div className="text-[11.5px] text-[var(--light)] mt-2">
          {mission.matched_greeters.length} bereits gematchte Greeter werden angezeigt.
        </div>
      )}
    </Modal>
  );
}

function CancelDialog({ mission, onClose, onDone }) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await cancelMissionSafe({ mission, role: 'admin', actor: 'admin@neuland.de', cancellationReason: reason, base44 });
      toast({ title: 'Mission storniert' });
      onDone?.(); onClose();
    } catch (e) {
      toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Mission stornieren" description="Diese Aktion lässt sich nicht rückgängig machen." size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
        <Button variant="danger" onClick={submit} loading={busy}>Mission stornieren</Button>
      </>}
    >
      <Field label="Grund (optional)">
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="z. B. Kunde hat abgesagt …" />
      </Field>
    </Modal>
  );
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}
