import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MapPin, Phone, MessageCircle, Navigation as NavIcon, AlertTriangle,
  Camera, CheckCircle2, Clock, Plane, Building2, FileText, Send, Sparkles, Timer,
  ChevronRight, ChevronDown, ShieldAlert, X, MessageSquare, ExternalLink, WifiOff, Loader2, CheckCheck,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/toaster';
import { useMissionState } from '@/lib/useMissionState';
import { MissionStatus, IssueServerity } from '@/lib/missionStateMachine';
import { addMissionNote } from '@/api';
import { completeJourneyStep } from '@/lib/missionEngine';
import { getDocumentUrl } from '@/lib/storage';
import { resolveStepMeta, stepBringItems } from '@/lib/journeySteps';
import {
  Card, Avatar, Pill, StatusPill, Button, EmptyState, BottomSheet,
  Field, Textarea, Input, SkeletonCard,
} from '@/components/ui';
import MissionKernel from '@/components/mission/MissionKernel';
import MissionServices from '@/components/mission/MissionServices';
import MissionExpenses from '@/components/mission/MissionExpenses';
import FlightStatusControl from '@/components/mission/FlightStatusControl';
import { greeterKernel, greeterProgress, greeterBlockers } from '@/lib/missionKernel';
import { useRealtimeMessages } from '@/lib/useRealtimeMessages';
import { relativeTime, relativeStepDate } from '@/lib/utils';

/**
 * PHASE 2A.1 — GreeterMissionDetail: Operational Workflow UI (Uber/Linear/Ramp Style)
 *
 * Structure:
 * [STICKY TIMELINE]
 * [SCROLLABLE BODY - Cards]
 *   - Talent Info
 *   - Arrival Details
 *   - Company Info
 *   - Documents (Accordion)
 *   - Photos
 *   - Navigation
 *   - Notes
 *   - Emergency Zone
 *   - Timeline Log
 * [STICKY BOTTOM ACTION BAR] (56px, thumb-friendly, mobile-safe-area)
 */
export default function GreeterMissionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  // ✅ NEW: Single hook replaces all manual state management
  const { mission, loading, error, transitionTo, reportIssue, canTransitionTo, isDirty, isSyncing, isOnline } = useMissionState(id, user?.email || '');

  const [candidate, setCandidate] = useState(null);
  const [company, setCompany] = useState(null);
  const [docs, setDocs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [docsExpanded, setDocsExpanded] = useState(false);
  const [steps, setSteps] = useState([]);
  const [msg, setMsg] = useState('');
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Live chat with the talent — same realtime thread TalentGreeter uses (BUG 1 fix).
  const { thread, markRead, send } = useRealtimeMessages({ missionId: id });

  // Open a talent-uploaded document (signed URL) — read-only for the greeter.
  const openDoc = async (d) => {
    try { const url = await getDocumentUrl(d); if (url) window.open(url, '_blank', 'noopener'); } catch { /* empty */ }
  };

  // Load related data (candidate, company, docs, logs)
  const loadRelated = async () => {
    try {
      if (mission?.candidate_id) base44.entities.Candidate.get(mission.candidate_id).then(setCandidate).catch(() => {});
      if (mission?.company_id) base44.entities.Company.get(mission.company_id).then(setCompany).catch(() => {});
      base44.entities.Document.filter({ candidate_id: mission?.candidate_id }).then(setDocs).catch(() => setDocs([]));
      base44.entities.ActivityLog.filter({ entity_id: id }, '-timestamp').then(setLogs).catch(() => setLogs([]));
    } catch (e) {
      console.error('Load related error:', e);
    }
  };

  useEffect(() => {
    if (user?.email) {
      base44.entities.GreeterProfile.filter({ email: user.email }).then((p) => setProfile(p[0]));
    }
  }, [user?.email]);

  useEffect(() => {
    loadRelated();
  }, [mission?.id]);

  // Onboarding journey steps — shown during the in_progress phase (Option A).
  useEffect(() => {
    if (!id) return;
    base44.entities.JourneyStep
      .filter({ mission_id: id }, 'order')
      .then((js) => setSteps([...js].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))))
      .catch(() => setSteps([]));
  }, [id, mission?.status]);

  const onCompleteStep = async (stepId) => {
    try {
      await completeJourneyStep(stepId, user?.email);
      setSteps((prev) => prev.map((s) => (s.id === stepId
        ? { ...s, status: 'completed', completed_at: new Date().toISOString() }
        : s)));
      // Propagate to every surface that derives progress from steps (greeter home, company, talent):
      // refresh the shared caches + this mission (last step may have auto-completed it).
      qc.invalidateQueries({ queryKey: ['journeySteps'] });
      qc.invalidateQueries({ queryKey: ['missions'] });
      qc.invalidateQueries({ queryKey: ['mission', id] });
      toast({ title: '✓ Schritt erledigt' });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  // Mark talent messages read + keep the thread scrolled to the latest.
  useEffect(() => { if (id) markRead(id); }, [id, thread.length, markRead]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread.length]);

  const onSendMessage = async () => {
    if (!msg.trim()) return;
    try {
      await send({ content: msg, missionId: id, receiverId: candidate?.user_id });
      setMsg('');
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="p-4">
        <div className="text-red-600">Fehler: {error?.message || 'Mission nicht gefunden'}</div>
      </div>
    );
  }

  const stage = mission.greeter_stage || mission.status;
  const isMine = profile && mission.greeter_id === profile.id;
  const isMatched = profile && mission.status === 'matched' && (mission.matched_greeters || []).includes(profile.id);
  const canAct = isMine && mission.status !== MissionStatus.COMPLETED;

  // ✅ NEW: Simplified handlers using hook
  const onAccept = async () => {
    try {
      await transitionTo(MissionStatus.ACCEPTED);
      toast({ title: '✓ Einsatz angenommen' });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const onETA = async (etaIso, note) => {
    try {
      if (note) await addMissionNote({ missionId: mission.id, body: `📍 ETA: ${note}`, actor: user?.email, base44 });
      await transitionTo(MissionStatus.ON_THE_WAY);
      toast({ title: '✓ ETA gesendet' });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const onTransition = async (nextStatus, message) => {
    try {
      await transitionTo(nextStatus);
      toast({ title: message });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const onNote = async (text) => {
    try {
      await addMissionNote({ missionId: mission.id, body: text, actor: user?.email, base44 });
      toast({ title: '✓ Notiz gespeichert' });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const onIssue = async (text, severity) => {
    try {
      await reportIssue(severity, text);
      await addMissionNote({ missionId: mission.id, body: `[${severity.toUpperCase()}] ${text}`, actor: user?.email, base44 });
      toast({ title: '✓ Issue gemeldet' });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const onComplete = async (report) => {
    try {
      if (report) await addMissionNote({ missionId: mission.id, body: `Abschlussbericht: ${report}`, actor: user?.email, base44 });
      await transitionTo(MissionStatus.COMPLETED);
      toast({ title: '🎉 Abgeschlossen' });
      setTimeout(() => nav('/greeter-dashboard'), 1000);
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  // Photo handlers
  const onPhotoCapture = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const photoObj = {
        id: Date.now(),
        data: e.target.result,
        timestamp: new Date().toISOString(),
      };
      setPhotos([...photos, photoObj]);
      await addMissionNote({ missionId: mission.id, body: `📸 Foto (${new Date().toLocaleTimeString('de-DE')})`, actor: user?.email, base44 });
      toast({ title: 'Foto gespeichert' });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="pb-[80px]">
      {/* ═══════════════════════════════════════════════ */}
      {/* STICKY HEADER + TIMELINE (Phase 2A Spec)      */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="sticky top-0 z-30 backdrop-blur-sm" style={{ background: 'var(--ds-bg)', borderBottom: '1px solid var(--ds-card-border)' }}>
        <div className="p-3 sm:p-4">
          <button
            onClick={() => nav(-1)}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold mb-3 hover:opacity-70 transition"
            style={{ color: 'var(--ds-t1)' }}
          >
            <ArrowLeft className="w-4 h-4" /> Zurück
          </button>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-[0.12em] font-bold" style={{ color: '#c49228' }}>{whenLabel(mission.datetime)}</div>
              <h1 className="font-serif text-lg sm:text-xl font-bold mt-0.5" style={{ color: 'var(--ds-t1)' }}>{mission.title}</h1>
              <div className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>
                <MapPin className="w-3 h-3" style={{ color: '#c49228' }} />
                <span>{mission.location || mission.city}</span>
              </div>
            </div>
            <StatusPill status={mission.status} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* SCROLLABLE BODY - Cards                        */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="px-3 sm:px-4 py-4 space-y-3.5 max-w-2xl mx-auto">
        {/* Offline / Sync-Status — Aktionen am Gate gehen nie verloren */}
        {!isOnline ? (
          <div className="rounded-xl px-4 py-2.5 flex items-center gap-2 text-[12.5px]" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)', color: '#b45309' }}>
            <WifiOff className="w-4 h-4 shrink-0" />
            Offline — deine Aktionen werden gespeichert und automatisch synchronisiert, sobald du wieder online bist.
          </div>
        ) : (isDirty || isSyncing) ? (
          <div className="rounded-xl px-4 py-2.5 flex items-center gap-2 text-[12.5px]" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)', color: 'var(--ds-t2)' }}>
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: '#c49228' }} />
            Wird synchronisiert…
          </div>
        ) : null}

        {/* MISSION KERNEL — 1 Aussage · ruhige Progress-Zeile · max 2 Blocker */}
        {(isMine || isMatched) && (
          <MissionKernel
            eyebrow={whenLabel(mission.datetime)}
            statement={isMatched
              ? `Neuer Einsatz: ${candidate?.full_name || 'das Talent'} braucht dich.`
              : greeterKernel(mission, candidate?.full_name).statement}
            progress={mission.status === MissionStatus.IN_PROGRESS ? undefined : greeterProgress(mission)}
            blockers={greeterBlockers(mission, docs)}
          >
            {canAct && (
              <button
                onClick={() => setSheet('issue')}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium hover:opacity-70 transition"
                style={{ color: 'var(--ds-t3)' }}
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Problem melden
              </button>
            )}
          </MissionKernel>
        )}

        {/* ONBOARDING STEPS — Greeter checks off the multi-week journey (in_progress only) */}
        {isMine && mission.status === MissionStatus.IN_PROGRESS && steps.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <div className="px-3 sm:px-4 pt-3 pb-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[9px] uppercase tracking-[0.12em] font-semibold" style={{ color: 'var(--ds-t3)' }}>Onboarding-Schritte</div>
                {(() => {
                  const done = steps.filter((s) => s.status === 'completed').length;
                  const pct = Math.round((done / steps.length) * 100);
                  return <span className="text-[11px] tabular-nums font-semibold" style={{ color: '#c49228' }}>{done}/{steps.length} · {pct}%</span>;
                })()}
              </div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ds-card-border)' }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${Math.round((steps.filter((s) => s.status === 'completed').length / steps.length) * 100)}%`,
                    background: 'linear-gradient(90deg, #c49228, #d4a83a)',
                  }}
                />
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--ds-card-border)' }}>
              {steps.map((s, i) => {
                const done = s.status === 'completed';
                const StepIcon = resolveStepMeta(s).icon;
                const due = relativeStepDate(s.scheduled_at);
                const bring = stepBringItems(s);
                return (
                  <div key={s.id} className="flex items-start gap-3 px-3 sm:px-4 py-3" style={i > 0 ? { borderTop: '1px solid var(--ds-card-border)' } : {}}>
                    <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: done ? 'rgba(34,197,94,0.12)' : 'rgba(196,146,40,0.10)', color: done ? '#16a34a' : '#c49228' }}>
                      <StepIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium" style={{ color: done ? 'var(--ds-t3)' : 'var(--ds-t1)', textDecoration: done ? 'line-through' : 'none' }}>{s.title}</div>
                      {due && <div className="text-[11px] mt-0.5" style={{ color: 'var(--ds-t3)' }}>{due}</div>}
                      {!done && bring.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          <span className="text-[9px] uppercase tracking-[0.1em] font-semibold mr-0.5" style={{ color: 'var(--ds-t3)' }}>Mitbringen</span>
                          {bring.map((b, bi) => (
                            <span key={bi} className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t2)' }}>{b}</span>
                          ))}
                        </div>
                      )}
                      {/* Documents the talent uploaded for this step — read-only download */}
                      {(() => {
                        const stepDocs = docs.filter((d) => d.step_id === s.id);
                        if (!stepDocs.length) return null;
                        return (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {stepDocs.map((d) => (
                              <button
                                key={d.id}
                                onClick={() => openDoc(d)}
                                className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded transition"
                                style={{ background: 'rgba(196,146,40,0.10)', color: '#c49228' }}
                                title={d.title}
                              >
                                <FileText className="w-3 h-3" /> <span className="max-w-[140px] truncate">{d.title}</span>
                                <ExternalLink className="w-3 h-3 opacity-70" />
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#16a34a' }} />
                    ) : (
                      <button
                        onClick={() => onCompleteStep(s.id)}
                        className="shrink-0 h-11 px-4 rounded-lg text-[12.5px] font-semibold transition active:scale-95"
                        style={{ background: 'rgba(196,146,40,0.15)', color: '#c49228' }}
                      >
                        Erledigt
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SERVICES — read-only: what's being arranged for this arrival */}
        {isMine && (
          <div className="rounded-xl p-3 sm:p-4" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <div className="text-[9px] uppercase tracking-[0.12em] font-semibold mb-2.5" style={{ color: 'var(--ds-t3)' }}>Services</div>
            <MissionServices missionId={mission.id} />
          </div>
        )}

        {/* AUSLAGEN / SPESEN — greeter submits fronted costs (tickets/transport); admin approves → company invoice */}
        {isMine && (
          <div className="rounded-xl p-3 sm:p-4" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <MissionExpenses missionId={mission.id} greeterId={profile?.id} />
          </div>
        )}

        {/* TALENT INFO CARD */}
        {candidate && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <div className="flex items-center gap-3 p-3 sm:p-4">
              <Avatar name={candidate.full_name} size="lg" ringed />
              <div className="min-w-0 flex-1">
                <div className="text-[9px] uppercase tracking-[0.12em] font-semibold" style={{ color: 'var(--ds-t3)' }}>Talent</div>
                <div className="font-semibold text-[14px] sm:text-[15px]" style={{ color: 'var(--ds-t1)' }}>{candidate.full_name}</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {candidate.languages?.slice(0, 3).map((l) => (
                    <Pill key={l} tone="navy" size="xs">{l}</Pill>
                  ))}
                  {candidate.country_of_origin && (
                    <Pill tone="gold" size="xs">{candidate.country_of_origin}</Pill>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Contact Actions */}
            <div className="grid grid-cols-3" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
              {candidate?.phone ? (
                <a
                  href={`tel:${candidate.phone}`}
                  className="flex items-center justify-center gap-1.5 py-3 text-[12px] font-medium transition"
                  style={{ color: 'var(--ds-t1)' }}
                >
                  <Phone className="w-3.5 h-3.5" style={{ color: '#c49228' }} />
                  <span className="hidden sm:inline">Anrufen</span>
                </a>
              ) : (
                <div className="py-3 grid place-items-center" style={{ color: 'var(--ds-t3)' }}>
                  <Phone className="w-3.5 h-3.5" />
                </div>
              )}
              <a
                href={candidate?.phone ? `https://wa.me/${onlyDigits(candidate.phone)}` : '#'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-3 text-[12px] font-medium transition"
                style={{ color: 'var(--ds-t1)', borderLeft: '1px solid var(--ds-card-border)', borderRight: '1px solid var(--ds-card-border)' }}
              >
                <MessageCircle className="w-3.5 h-3.5" style={{ color: '#c49228' }} />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
              <Link
                to="/greeter-dashboard/messages"
                className="flex items-center justify-center gap-1.5 py-3 text-[12px] font-medium transition"
                style={{ color: 'var(--ds-t1)' }}
              >
                <Send className="w-3.5 h-3.5" style={{ color: '#c49228' }} />
                <span className="hidden sm:inline">Chat</span>
              </Link>
            </div>
          </div>
        )}

        {/* ARRIVAL DETAILS CARD */}
        <Card variant="default" className="p-3 sm:p-4 space-y-2.5">
          <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--light)] font-semibold">Ankunftsdetails</div>
          <DetailRow icon={Clock} label="Treffpunkt" value={formatDateTimeShort(mission.datetime)} accent />
          {(mission.flight_number || candidate?.flight_no) && (
            <DetailRow icon={Plane} label="Flug" value={`${mission.flight_number || candidate.flight_no}${candidate?.arrival_time ? ' · ' + formatTime(candidate.arrival_time) : ''}`} />
          )}
          {(mission.flight_number || candidate?.flight_no) && (
            <FlightStatusControl mission={mission} canEdit={isMine} />
          )}
          {mission.eta_at && (
            <DetailRow icon={Timer} label="Deine ETA" value={formatTime(mission.eta_at)} accent />
          )}
          {mission.pay && (
            <DetailRow icon={Sparkles} label="Vergütung" value={`${mission.pay} €`} />
          )}
        </Card>

        {/* COMPANY INFO CARD */}
        {company && (
          <div className="p-3 sm:p-4 rounded-xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <div className="text-[9px] uppercase tracking-[0.12em] font-semibold mb-2" style={{ color: 'var(--ds-t3)' }}>Unternehmen</div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.10)', color: '#c49228' }}>
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[14px]" style={{ color: 'var(--ds-t1)' }}>{company.name}</div>
                {company.city && (
                  <div className="text-[12px] flex items-center gap-1 mt-1" style={{ color: 'var(--ds-t2)' }}>
                    <MapPin className="w-3 h-3" /> {company.city}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTS (Accordion) */}
        {docs.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <button
              onClick={() => setDocsExpanded(!docsExpanded)}
              className="w-full px-3 sm:px-4 py-3 flex items-center justify-between transition"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: 'var(--ds-t2)' }} />
                <span className="font-semibold text-[13px]" style={{ color: 'var(--ds-t1)' }}>Dokumente</span>
                <span className="text-[11px]" style={{ color: 'var(--ds-t3)' }}>{docs.length}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition ${docsExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--ds-t3)' }} />
            </button>
            {docsExpanded && (
              <div style={{ borderTop: '1px solid var(--ds-card-border)' }}>
                {docs.map((d, i) => (
                  <div key={d.id} className="px-3 sm:px-4 py-2.5 flex items-center gap-2.5" style={i > 0 ? { borderTop: '1px solid var(--ds-card-border)' } : {}}>
                    <FileText className="w-3.5 h-3.5" style={{ color: 'var(--ds-t2)' }} />
                    <span className="text-[12px] flex-1 truncate" style={{ color: 'var(--ds-t1)' }}>{d.name || d.title}</span>
                    {d.verified ? (
                      <Pill tone="green" size="xs">✓</Pill>
                    ) : (
                      <Pill tone="amber" size="xs">!</Pill>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PHOTOS SECTION */}
        {photos.length > 0 && (
          <Card variant="default" className="p-3 sm:p-4">
            <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--light)] font-semibold mb-3">
              Fotos ({photos.length})
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img src={photo.data} alt="Mission" className="w-full h-24 object-cover rounded-lg" />
                  <button
                    onClick={() => setPhotos(photos.filter((p) => p.id !== photo.id))}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full grid place-items-center opacity-0 group-hover:opacity-100 transition shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* NAVIGATION */}
        {mission.location && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(mission.location + ', ' + (mission.city || ''))}`}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl px-3 sm:px-4 py-3 flex items-center gap-3 transition-all"
            style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(196,146,40,0.30)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ds-card-border)'; }}
          >
              <div className="w-10 h-10 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.15)', color: '#c49228' }}>
                <NavIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[13px]" style={{ color: 'var(--ds-t1)' }}>Navigation öffnen</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--ds-t2)' }}>{mission.location}</div>
              </div>
              <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--ds-t3)' }} />
          </a>
        )}

        {/* TIMELINE LOG */}
        {logs.length > 0 && (
          <div className="p-3 sm:p-4 rounded-xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <div className="text-[9px] uppercase tracking-[0.12em] font-semibold mb-2.5" style={{ color: 'var(--ds-t3)' }}>
              Timeline
            </div>
            <ol className="relative space-y-2">
              {logs.slice(0, 20).map((l, i) => (
                <li key={l.id || i} className="flex gap-2 text-[11px] items-start">
                  <div className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: 'rgba(196,146,40,0.50)' }} />
                  <div className="min-w-0 flex-1">
                    <div style={{ color: 'var(--ds-t1)' }}>{l.description || l.action}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--ds-t3)' }}>{relativeTime(l.timestamp || l.created_at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* LIVE CHAT — Talent ↔ Greeter (BUG 1 fix) */}
        {isMine && (
          <div className="p-3 sm:p-4 rounded-xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <div className="text-[9px] uppercase tracking-[0.12em] font-semibold mb-2.5 inline-flex items-center gap-1.5" style={{ color: 'var(--ds-t3)' }}>
              <MessageSquare className="w-3 h-3" /> Chat mit {candidate?.full_name || 'Talent'}
            </div>
            <div className="rounded-xl p-3 max-h-72 overflow-y-auto space-y-3 bg-black/[0.05] dark:bg-white/[0.04]">
              {thread.length === 0 && (
                <div className="text-center text-[12px] py-4" style={{ color: 'var(--ds-t2)' }}>Noch keine Nachrichten — schreib die erste!</div>
              )}
              {thread.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`max-w-[80%] ${mine ? 'ml-auto text-right' : ''}`}>
                    <div className="text-[10px] mb-0.5" style={{ color: 'var(--ds-t3)' }}>
                      {m.sender_name} · {relativeTime(m.timestamp)}
                    </div>
                    <div
                      className="inline-block rounded-lg px-3 py-2 text-[13px]"
                      style={mine
                        ? { background: '#1a2340', color: 'rgba(255,255,255,0.90)' }
                        : { background: 'var(--ds-card)', color: 'var(--ds-t1)', border: '1px solid var(--ds-card-border)' }}
                    >
                      {m.content}
                    </div>
                    {mine && m.read && <div className="text-[10px] mt-0.5 inline-flex items-center gap-1" style={{ color: 'var(--ds-t3)' }}><CheckCheck className="w-2.5 h-2.5" /> gelesen</div>}
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="mt-2.5 flex gap-2">
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={2}
                placeholder={`Schreib ${candidate?.full_name?.split(' ')[0] || 'dem Talent'}…`}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
                className="flex-1 px-3 py-2 rounded-lg text-[13px] focus:outline-none transition"
                style={{ background: 'var(--ds-input, var(--ds-card))', border: '1px solid var(--ds-input-border, var(--ds-card-border))', color: 'var(--ds-t1)' }}
              />
              <Button variant="primary" size="sm" icon={Send} onClick={onSendMessage} disabled={!msg.trim()}>
                Senden
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* STICKY BOTTOM ACTION BAR (Phase 2A Core)      */}
      {/* 56px minimum height, thumb-friendly            */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="fixed bottom-0 inset-x-0 z-40 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.25)]" style={{ background: 'var(--ds-bg)', borderTop: '1px solid var(--ds-card-border)' }}>
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        <PrimaryActionBar
            mission={mission}
            stage={stage}
            isMine={isMine}
            isMatched={isMatched}
            canTransitionTo={canTransitionTo}
            isDirty={isDirty}
            isSyncing={isSyncing}
            onAccept={onAccept}
            onSendETA={() => setSheet('eta')}
            onTransition={onTransition}
            onPhotoUpload={() => fileInputRef.current?.click()}
            onIssue={() => setSheet('issue')}
            onNote={() => setSheet('note')}
            onWrap={() => setSheet('wrap')}
          />
        </div>
      </div>

      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPhotoCapture(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />

      {/* BOTTOM SHEETS */}
      <ETASheet open={sheet === 'eta'} onClose={() => setSheet(null)} mission={mission} onSubmit={onETA} isDirty={isDirty} />
      <NoteSheet open={sheet === 'note'} onClose={() => setSheet(null)} onSubmit={onNote} isDirty={isDirty} />
      <IssueSheet open={sheet === 'issue'} onClose={() => setSheet(null)} onSubmit={onIssue} isDirty={isDirty} />
      <WrapSheet open={sheet === 'wrap'} onClose={() => setSheet(null)} onSubmit={onComplete} isDirty={isDirty} />
    </div>
  );
}

/* ════════════════════════════════════════════ */
/* SUBCOMPONENTS                                */
/* ════════════════════════════════════════════ */

function DetailRow({ icon: Icon, label, value, accent = false }) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="w-7 h-7 rounded-lg grid place-items-center shrink-0 mt-0.5"
        style={{ background: accent ? 'rgba(196,146,40,0.15)' : 'var(--ds-card-border)', color: accent ? '#c49228' : 'var(--ds-t2)' }}
      >
        <Icon className="w-3 h-3" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase tracking-[0.12em] font-semibold" style={{ color: 'var(--ds-t3)' }}>{label}</div>
        <div className="text-[12px] font-medium truncate" style={{ color: accent ? '#c49228' : 'var(--ds-t1)' }}>{value}</div>
      </div>
    </div>
  );
}

function PrimaryActionBar({ mission, stage, isMine, isMatched, canTransitionTo, isDirty, isSyncing, onAccept, onSendETA, onTransition, onPhotoUpload, onIssue, onNote, onWrap }) {
  // Matched but not yet accepted
  if (isMatched) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="lg" fullWidth className="!h-12">
          Ablehnen
        </Button>
        <Button
          variant="gold"
          size="lg"
          fullWidth
          icon={CheckCircle2}
          loading={isDirty || isSyncing}
          onClick={onAccept}
          className="!h-12"
        >
          Annehmen
        </Button>
      </div>
    );
  }

  if (!isMine) {
    return (
      <div className="text-center text-[12px] text-[var(--mid)] py-3">
        Du bist diesem Einsatz nicht zugewiesen.
      </div>
    );
  }

  // STATUS-DRIVEN PRIMARY ACTIONS (based on new MissionStatus enum)
  let primary = null;
  const secondaryActions = [];
  const isBusy = isDirty || isSyncing;

  switch (mission.status) {
    case MissionStatus.ASSIGNED:
      // Greeter must first accept the assignment (assigned → accepted) before sending an ETA.
      // ETA senden (→ on_the_way) is only legal from 'accepted', so it lives in the next case.
      primary = (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={CheckCircle2}
          loading={isBusy}
          disabled={!canTransitionTo(MissionStatus.ACCEPTED)}
          onClick={onAccept}
          className="!h-12"
        >
          ✓ Einsatz annehmen
        </Button>
      );
      secondaryActions.push(
        { icon: Camera, label: 'Foto', onClick: onPhotoUpload },
        { icon: MessageSquare, label: 'Notiz', onClick: onNote }
      );
      break;

    case MissionStatus.ACCEPTED:
      primary = (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={Timer}
          loading={isBusy}
          disabled={!canTransitionTo(MissionStatus.ON_THE_WAY)}
          onClick={onSendETA}
          className="!h-12"
        >
          ETA senden
        </Button>
      );
      secondaryActions.push(
        { icon: Camera, label: 'Foto', onClick: onPhotoUpload },
        { icon: MessageSquare, label: 'Notiz', onClick: onNote }
      );
      break;

    case MissionStatus.ON_THE_WAY:
      primary = (
        <Button
          variant="gold"
          size="lg"
          fullWidth
          icon={MapPin}
          loading={isBusy}
          disabled={!canTransitionTo(MissionStatus.ARRIVED)}
          onClick={() => onTransition(MissionStatus.ARRIVED, '✓ Check-in')}
          className="!h-12"
        >
          ✓ Vor Ort — Check-in
        </Button>
      );
      secondaryActions.push(
        { icon: Camera, label: 'Foto', onClick: onPhotoUpload },
        { icon: ShieldAlert, label: 'Problem', onClick: onIssue }
      );
      break;

    case MissionStatus.ARRIVED:
      // Option A: arriving at the airport STARTS the onboarding phase (in_progress) —
      // it does not complete the mission. The multi-week journey steps then appear in
      // the body; checking off the last step auto-completes the mission.
      primary = (
        <Button
          variant="gold"
          size="lg"
          fullWidth
          icon={CheckCircle2}
          loading={isBusy}
          disabled={!canTransitionTo(MissionStatus.IN_PROGRESS)}
          onClick={() => onTransition(MissionStatus.IN_PROGRESS, '✓ Onboarding gestartet')}
          className="!h-12"
        >
          ✓ Talent ist da — Onboarding starten
        </Button>
      );
      secondaryActions.push(
        { icon: Camera, label: 'Foto', onClick: onPhotoUpload },
        { icon: ShieldAlert, label: 'Problem', onClick: onIssue }
      );
      break;

    case MissionStatus.IN_PROGRESS:
      // Onboarding weeks: the journey-steps checklist below drives completion
      // automatically (last step → completed). This is a manual fallback to close out.
      primary = (
        <Button
          variant="success"
          size="lg"
          fullWidth
          icon={CheckCircle2}
          loading={isBusy}
          disabled={!canTransitionTo(MissionStatus.COMPLETED)}
          onClick={onWrap}
          className="!h-12"
        >
          ✓ Onboarding abschließen
        </Button>
      );
      secondaryActions.push(
        { icon: Camera, label: 'Foto', onClick: onPhotoUpload },
        { icon: MessageSquare, label: 'Notiz', onClick: onNote }
      );
      break;

    case MissionStatus.MET_TALENT:
      // Legacy direct-completion path (kept for any mission still on met_talent).
      primary = (
        <Button
          variant="success"
          size="lg"
          fullWidth
          icon={CheckCircle2}
          loading={isBusy}
          disabled={!canTransitionTo(MissionStatus.COMPLETED)}
          onClick={() => onTransition(MissionStatus.COMPLETED, '🎉 Abgeschlossen')}
          className="!h-12"
        >
          ✓ Abschließen
        </Button>
      );
      secondaryActions.push(
        { icon: Camera, label: 'Foto', onClick: onPhotoUpload },
        { icon: ShieldAlert, label: 'Problem', onClick: onIssue }
      );
      break;

    case MissionStatus.COMPLETED:
    case MissionStatus.CANCELLED:
      return (
        <div className="text-center py-3 font-medium text-green-700">
          ✓ Einsatz abgeschlossen
        </div>
      );

    default:
      primary = (
        <Button variant="primary" size="lg" fullWidth onClick={onSendETA} className="!h-12">
          ETA senden
        </Button>
      );
  }

  return (
    <div className="space-y-2">
      {primary}
      {secondaryActions.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {secondaryActions.map((action, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              icon={action.icon}
              onClick={action.onClick}
              className="!h-10 !text-[11.5px]"
              disabled={isBusy}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════ */
/* BOTTOM SHEETS (Mobile-first)                */
/* ════════════════════════════════════════════ */

function ETASheet({ open, onClose, mission, onSubmit, isDirty }) {
  const [eta, setEta] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      const t = new Date(Date.now() + 30 * 60 * 1000);
      setEta(t.toISOString().slice(0, 16));
      setNote('');
    }
  }, [open]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="ETA an Talent senden"
      description="Wann wirst du am Treffpunkt sein?"
      footer={
        <Button
          variant="gold"
          size="lg"
          fullWidth
          loading={isDirty}
          onClick={() => {
            onSubmit(new Date(eta).toISOString(), note);
            onClose();
          }}
        >
          ETA senden
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Geschätzte Ankunftszeit">
          <Input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
        </Field>
        <Field label="Optionale Notiz" hint="z. B. Verkehrslage">
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ich warte am Ausgang Terminal 1…" />
        </Field>
      </div>
    </BottomSheet>
  );
}

function NoteSheet({ open, onClose, onSubmit, isDirty }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) setText('');
  }, [open]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Notiz hinzufügen"
      description="Wird in der Timeline gespeichert."
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!text.trim()}
          loading={isDirty}
          onClick={() => {
            onSubmit(text);
            onClose();
          }}
        >
          Speichern
        </Button>
      }
    >
      <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Talent hat Verspätung gemeldet…" autoFocus />
    </BottomSheet>
  );
}

function IssueSheet({ open, onClose, onSubmit, isDirty }) {
  const [text, setText] = useState('');
  const [severity, setSeverity] = useState(IssueServerity.WARNING);

  useEffect(() => {
    if (open) {
      setText('');
      setSeverity(IssueServerity.WARNING);
    }
  }, [open]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Problem melden"
      description="Operations wird benachrichtigt."
      footer={
        <Button
          variant="danger"
          size="lg"
          fullWidth
          disabled={!text.trim()}
          loading={isDirty}
          onClick={() => {
            onSubmit(text, severity);
            onClose();
          }}
        >
          Melden
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Schweregrad">
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: IssueServerity.INFO, l: 'Info', tone: 'bg-blue-50 border-blue-200 text-blue-700' },
              { v: IssueServerity.WARNING, l: 'Warnung', tone: 'bg-amber-50 border-amber-200 text-amber-800' },
              { v: IssueServerity.CRITICAL, l: 'Kritisch', tone: 'bg-red-50 border-red-200 text-red-700' },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setSeverity(o.v)}
                className={`py-2 rounded-lg text-[12px] font-medium border transition ${severity === o.v ? o.tone : ''}`}
                style={severity !== o.v ? { background: 'var(--ds-card)', borderColor: 'var(--ds-card-border)', color: 'var(--ds-t2)' } : {}}
              >
                {o.l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Was ist passiert?">
          <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Beschreibe das Problem…" autoFocus />
        </Field>
      </div>
    </BottomSheet>
  );
}

function WrapSheet({ open, onClose, onSubmit, isDirty }) {
  const [report, setReport] = useState('');

  useEffect(() => {
    if (open) setReport('');
  }, [open]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Einsatz abschließen"
      description="Kurzer Abschlussbericht"
      footer={
        <Button
          variant="success"
          size="lg"
          fullWidth
          icon={CheckCircle2}
          loading={isDirty}
          onClick={() => {
            onSubmit(report);
            onClose();
          }}
        >
          Abschließen
        </Button>
      }
    >
      <Textarea rows={5} value={report} onChange={(e) => setReport(e.target.value)} placeholder="z. B. Pickup pünktlich, Hotel-Check-in ok…" />
    </BottomSheet>
  );
}

/* ════════════════════════════════════════════ */
/* HELPERS                                     */
/* ════════════════════════════════════════════ */

function whenLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (isToday) return 'Heute';
  if (isTomorrow) return 'Morgen';
  return d.toLocaleDateString('de-DE', { weekday: 'short', month: '2-digit', day: '2-digit' });
}

function formatDateTimeShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' · ' +
    d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function onlyDigits(str) {
  return str?.replace(/\D/g, '') || '';
}
