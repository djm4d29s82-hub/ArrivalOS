import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plane, MapPin, Home, Smartphone, FileText, Landmark, CheckCircle2, Circle, Clock,
  Phone, MessageCircle, ChevronRight, Sparkles, Navigation as NavIcon, Timer,
  Upload, Loader2, Download,
  FileCheck, ShieldPlus, Building2, Stethoscope, Languages, Calculator, PackageOpen,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/LangContext';
import { Card, Avatar, Pill, Button, SectionHeader } from '@/components/ui';
import { uploadDocument, getDocumentUrl } from '@/lib/storage';
import { relativeTime, relativeStepDate } from '@/lib/utils';
import MissionKernel from '@/components/mission/MissionKernel';
import { JOURNEY_STEPS, journeyProgress, resolveStepMeta, stepBringItems, localizeStep } from '@/lib/journeySteps';
import { SERVICE_BY_KEY, SERVICE_STATUS, localizeService, serviceStatusLabel } from '@/lib/serviceCatalog';
import GreeterReviewCard from '@/components/talent/GreeterReviewCard';
import TalentArrivalSignal from '@/components/talent/TalentArrivalSignal';

const SERVICE_ICONS = { FileCheck, ShieldPlus, Building2, Landmark, Smartphone, Stethoscope, Languages, Calculator };

/**
 * TalentDashboard — emotional, warm welcome screen (DE/EN).
 * Greeting + journey progress + next steps + greeter card + appointments + documents.
 */
export default function TalentDashboard() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [steps, setSteps] = useState([]);
  const [greeter, setGreeter] = useState(null);
  const [mission, setMission] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [services, setServices] = useState([]);
  const [docBusyStep, setDocBusyStep] = useState(null);
  const cid = user?.candidate_id || 'ca1';

  const refreshDocs = async () => {
    try { setDocuments(await base44.entities.Document.filter({ candidate_id: cid })); } catch { /* empty */ }
  };
  const onUploadStep = async (stepId, file) => {
    if (!file) return;
    setDocBusyStep(stepId);
    try {
      await uploadDocument({ file, candidateId: cid, stepId, type: 'step' });
      await refreshDocs();
    } catch { /* surfaced via missing chip; keep UI calm */ }
    finally { setDocBusyStep(null); }
  };
  const openDoc = async (d) => {
    try { const url = await getDocumentUrl(d); if (url) window.open(url, '_blank', 'noopener'); } catch { /* empty */ }
  };

  useEffect(() => {
    const cid = user?.candidate_id || 'ca1';
    let interval;
    const load = async () => {
      const c = await base44.entities.Candidate.get(cid);
      setCandidate(c);
      const ms = await base44.entities.Mission.filter({ candidate_id: cid });
      if (ms.length) {
        const active = ms.find((m) => ['assigned', 'in_progress'].includes(m.status)) || ms[0];
        setMission(active);
        const js = await base44.entities.JourneyStep.filter({ mission_id: active.id }, 'order');
        setSteps(js);
        if (active.greeter_id) {
          const g = await base44.entities.GreeterProfile.get(active.greeter_id);
          setGreeter(g);
        }
        try {
          const svc = await base44.entities.MissionService.filter({ mission_id: active.id });
          setServices(Array.isArray(svc) ? svc : []);
        } catch { /* table/migration optional */ }
      }
      try {
        const docs = await base44.entities.Document.filter({ candidate_id: cid });
        setDocuments(docs);
      } catch { /* empty */ }
    };
    load();
    interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, [user]);

  // Single source of truth for journey position (replaces dual progress model)
  const jp = journeyProgress(steps);
  const progressPct = steps.length ? Math.round((jp.completed / jp.total) * 100) : (candidate?.progress ?? 0);
  const arrivalDate = candidate?.arrival_date;
  const daysToArrival = arrivalDate ? Math.ceil((new Date(arrivalDate) - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const city = candidate?.city || t('dash.fallbackCity');

  // Full journey timeline — real DB steps, or the static plan as a fallback.
  const journeyList = steps.length > 0
    ? steps
    : JOURNEY_STEPS.map((m, i) => ({ id: `f-${i}`, key: m.key, title: m.title, description: m.short, status: 'pending' }));

  // Talent kernel ("where am I / what's next") — localized via the dict (missionKernel stays German).
  const kernel = (() => {
    const stage = mission?.greeter_stage;
    const stageKeys = ['accepted', 'eta_sent', 'on_the_way', 'arrived', 'in_progress', 'wrap_up'];
    if (stage && stageKeys.includes(stage)) {
      return { statement: t(`kernel.stage.${stage}`), actionLabel: t('kernel.live') };
    }
    let idx = steps.findIndex((s) => s.status === 'in_progress');
    if (idx < 0) idx = steps.findIndex((s) => s.status !== 'completed');
    if (idx < 0) return { statement: t('kernel.doneTitle'), sub: t('kernel.doneSub') };
    const ls = localizeStep(steps[idx], lang);
    return { statement: t('kernel.next', { step: ls.title }), sub: ls.emotional, actionLabel: t('kernel.viewStep') };
  })();

  return (
    <div className="max-w-4xl space-y-6">
      {/* Hero greeting */}
      <div className="rounded-2xl overflow-hidden -mx-1">
        <div className="px-7 pt-8 pb-7 bg-gradient-to-br from-navy via-navy to-navy-2 text-cream">
          <div className="text-[11px] uppercase tracking-[0.16em] text-gold font-bold mb-1.5">
            {t('dash.eyebrow')}
          </div>
          <h1 className="font-serif text-[32px] md:text-[38px] leading-[1.1] font-bold">
            {t('dash.hello', { name: candidate?.full_name?.split(' ')[0] || 'Talent' })}
          </h1>
          <p className="text-cream/75 text-[14px] mt-2 max-w-lg leading-relaxed">
            {daysToArrival !== null && daysToArrival > 0 && t('dash.arriveIn', { city, days: daysToArrival })}
            {daysToArrival === 0 && t('dash.arriveToday')}
            {daysToArrival !== null && daysToArrival < 0 && t('dash.arrived')}
            {daysToArrival === null && t('dash.onWay', { city })}
          </p>

          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[11px] uppercase tracking-widest text-cream/55 font-semibold">{t('dash.stepXofY', { i: Math.min(jp.currentIndex + 1, jp.total), n: jp.total })}</div>
              <div className="font-serif text-3xl font-bold text-gold tabular-nums">{progressPct}%</div>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-gold to-[#e8c875] transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* MISSION KERNEL — Wo bin ich? Was kommt als Nächstes? */}
      <MissionKernel
        eyebrow={t('dash.eyebrow')}
        statement={kernel.statement}
        sub={kernel.sub}
        progress={{ index: jp.currentIndex, total: jp.total }}
        primaryAction={kernel.actionLabel ? { label: kernel.actionLabel, onClick: () => nav('/talent/greeter'), variant: 'gold' } : undefined}
      />

      {/* Live Greeter Tracker */}
      {mission?.greeter_stage && mission.greeter_stage !== 'completed' && greeter && (
        <LiveGreeterTracker mission={mission} greeter={greeter} />
      )}

      {/* Greeter card */}
      {greeter && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <div className="p-5 flex items-center gap-4">
            <Avatar name={greeter.full_name} size="xl" ringed />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[0.14em] font-bold mb-0.5" style={{ color: '#c49228' }}>{t('dash.greeterEyebrow')}</div>
              <div className="font-serif text-xl font-bold" style={{ color: 'var(--ds-t1)' }}>{greeter.full_name}</div>
              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                {greeter.languages?.slice(0, 3).map((l) => (
                  <Pill key={l} tone="navy" size="xs">{l}</Pill>
                ))}
                {greeter.rating && (
                  <Pill tone="gold" size="xs">★ {greeter.rating.toFixed(1)}</Pill>
                )}
              </div>
              {greeter.phone && (
                <div className="flex items-center gap-1.5 mt-2 text-[12.5px]" style={{ color: 'var(--ds-t2)' }}>
                  <Phone className="w-3.5 h-3.5" style={{ color: '#c49228' }} />
                  <span className="tabular-nums">{greeter.phone}</span>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
            <Link to="/talent/messages" className="flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition" style={{ color: 'var(--ds-t1)' }}>
              <MessageCircle className="w-4 h-4" style={{ color: '#c49228' }} /> {t('dash.chat')}
            </Link>
            {greeter.phone && (
              <a href={`tel:${greeter.phone}`} className="flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition" style={{ color: 'var(--ds-t1)', borderLeft: '1px solid var(--ds-card-border)' }}>
                <Phone className="w-4 h-4" style={{ color: '#c49228' }} /> {t('dash.call')}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Kein Greeter zugewiesen — kein leerer State ohne Erklärung */}
      {!greeter && (
        <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <div className="w-9 h-9 rounded-full grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.12)', color: '#c49228' }}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-[13px] leading-relaxed" style={{ color: 'var(--ds-t2)' }}>
            {t('dash.noGreeter')}
          </div>
        </div>
      )}

      {/* Journey timeline — the full plan, on one screen */}
      <section>
        <SectionHeader title={t('dash.journeyTitle')} count={`${jp.completed}/${journeyList.length}`} />
        <div className="space-y-2.5 animate-stagger">
          {journeyList.map((s) => {
            const meta = resolveStepMeta(s);
            const Icon = meta.icon;
            const ls = localizeStep(s, lang);
            const bring = stepBringItems(s, lang);
            const done = s.status === 'completed';
            const isInProgress = s.status === 'in_progress';
            return (
              <div
                key={s.id}
                className="px-4 py-3.5 flex items-center gap-3 rounded-xl"
                style={{
                  background: 'var(--ds-card)',
                  border: `1px solid ${isInProgress ? 'rgba(196,146,40,0.35)' : 'var(--ds-card-border)'}`,
                  opacity: (!done && !isInProgress) ? 0.7 : 1,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                  style={{
                    background: done ? 'rgba(34,197,94,0.12)' : isInProgress ? 'rgba(196,146,40,0.15)' : 'var(--ds-card-border)',
                    color: done ? '#16a34a' : isInProgress ? '#c49228' : 'var(--ds-t2)',
                  }}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" strokeWidth={2.2} /> : <Icon className="w-4 h-4" strokeWidth={2.2} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[14px]" style={{ color: done ? 'var(--ds-t3)' : 'var(--ds-t1)', textDecoration: done ? 'line-through' : 'none' }}>{ls.title}</div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>{ls.description}</div>
                  {!done && s.scheduled_at && (
                    <div className="text-[11px] mt-1 inline-flex items-center gap-1" style={{ color: '#c49228' }}>
                      <Clock className="w-3 h-3" /> {relativeStepDate(s.scheduled_at, lang)}
                    </div>
                  )}
                  {!done && bring.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[9px] uppercase tracking-[0.1em] font-semibold mr-0.5" style={{ color: 'var(--ds-t3)' }}>{t('bring.label')}</span>
                      {bring.map((b, bi) => (
                        <span key={bi} className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t2)' }}>{b}</span>
                      ))}
                    </div>
                  )}
                  {/* Documents linked to this step — talent uploads + sees them; greeter sees them too */}
                  {!String(s.id).startsWith('f-') && (() => {
                    const stepDocs = documents.filter((d) => d.step_id === s.id);
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
                            <Download className="w-3 h-3 opacity-70" />
                          </button>
                        ))}
                        <label
                          className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition ${docBusyStep === s.id ? 'opacity-60 pointer-events-none' : ''}`}
                          style={{ border: '1px dashed var(--ds-card-border)', color: 'var(--ds-t3)' }}
                        >
                          {docBusyStep === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          {t('step.upload')}
                          <input type="file" className="sr-only" disabled={docBusyStep === s.id}
                            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; onUploadStep(s.id, f); }} />
                        </label>
                      </div>
                    );
                  })()}
                </div>
                {done ? (
                  <Pill tone="green" size="xs">{t('step.done')}</Pill>
                ) : isInProgress ? (
                  <Pill tone="gold" size="xs">{t('step.inProgress')}</Pill>
                ) : (
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-t3)' }} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Flight delay banner */}
      {mission?.flight_status === 'delayed' && (
        <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }}>
          <Plane className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div className="min-w-0">
            <div className="font-semibold text-[14px]" style={{ color: 'var(--ds-t1)' }}>{t('flight.delayed')}</div>
            <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>{mission.flight_delay_note || t('flight.delayedSub')}</div>
          </div>
        </div>
      )}

      {/* Optional "Ich bin gelandet" signal (self-hides outside the pre-meeting window) */}
      <TalentArrivalSignal mission={mission} greeter={greeter} user={user} />

      {/* Post-mission greeter rating (self-hides when nothing to rate) */}
      <GreeterReviewCard candidateId={cid} createdBy={user?.email} />

      {/* Services we're arranging */}
      {(() => {
        const visible = services.filter((s) => s.status !== 'skipped');
        if (visible.length === 0) return null;
        return (
          <section>
            <SectionHeader title={t('services.title')} count={visible.length} />
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
              {visible.map((svc, i) => {
                const cat = SERVICE_BY_KEY[svc.category] || { label: svc.category, iconName: 'PackageOpen' };
                const Icon = SERVICE_ICONS[cat.iconName] || PackageOpen;
                const loc = localizeService(cat, lang);
                const st = SERVICE_STATUS[svc.status] || { tone: 'neutral' };
                return (
                  <div key={svc.id} className="px-4 py-3 flex items-center gap-3" style={i > 0 ? { borderTop: '1px solid var(--ds-card-border)' } : {}}>
                    <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.10)' }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: '#c49228' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[13px] truncate" style={{ color: 'var(--ds-t1)' }}>{loc.label}</div>
                      {svc.provider
                        ? <div className="text-[11px] truncate" style={{ color: 'var(--ds-t2)' }}>{lang === 'en' ? 'via' : 'über'} {svc.provider}</div>
                        : svc.notes
                          ? <div className="text-[11px] truncate" style={{ color: 'var(--ds-t2)' }}>{svc.notes}</div>
                          : loc.blurb && <div className="text-[11px] truncate" style={{ color: 'var(--ds-t3)' }}>{loc.blurb}</div>}
                    </div>
                    <Pill tone={st.tone} size="xs" dot>{serviceStatusLabel(svc.status, lang)}</Pill>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Documents */}
      <section>
        <SectionHeader
          title={t('dash.docsTitle')}
          count={documents.length || undefined}
          action={
            <Link to="/talent/documents" className="text-[12px] text-gold font-medium hover:underline">
              {t('dash.viewAll')}
            </Link>
          }
        />
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          {documents.length === 0 && (
            <div className="px-4 py-6 text-center">
              <Sparkles className="w-5 h-5 mx-auto mb-2" style={{ color: '#c49228' }} />
              <div className="text-[13px]" style={{ color: 'var(--ds-t2)' }}>{t('dash.noDocs')}</div>
              <Link to="/talent/documents">
                <Button variant="outline" size="sm" className="mt-3">{t('dash.uploadDocs')}</Button>
              </Link>
            </div>
          )}
          {documents.slice(0, 4).map((d, i) => (
            <div key={d.id} className="px-4 py-3 flex items-center gap-3" style={i > 0 ? { borderTop: '1px solid var(--ds-card-border)' } : {}}>
              <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.10)' }}>
                <FileText className="w-3.5 h-3.5" style={{ color: '#c49228' }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[13px] truncate" style={{ color: 'var(--ds-t1)' }}>{d.name || d.title}</div>
                <div className="text-[11px]" style={{ color: 'var(--ds-t2)' }}>{d.type || 'Dokument'}</div>
              </div>
              {d.verified ? (
                <Pill tone="green" size="xs" icon={CheckCircle2}>{t('doc.verified')}</Pill>
              ) : (
                <Pill tone="amber" size="xs">{t('doc.inReview')}</Pill>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function LiveGreeterTracker({ mission, greeter }) {
  const { t, lang } = useLang();
  const stage = mission.greeter_stage;
  const STAGES = ['accepted', 'eta_sent', 'on_the_way', 'arrived', 'in_progress'];
  const idx = STAGES.indexOf(stage);
  const pct = idx >= 0 ? ((idx + 1) / STAGES.length) * 100 : 0;

  return (
    <Card variant="default" className="overflow-hidden border-gold/30">
      <div className="px-5 pt-4 pb-3 bg-gradient-to-br from-gold/[0.08] to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
          </span>
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-[#8a6818] font-bold">{t('tracker.live')}</span>
        </div>
        <div className="flex items-start gap-3">
          <Avatar name={greeter.full_name} size="md" ringed />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[14px] leading-tight" style={{ color: 'var(--ds-t1)' }}>
              {t(`tracker.${stage}`)}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>
              {greeter.full_name}
              {mission.eta_at && stage === 'eta_sent' && (
                <> · <span className="font-medium" style={{ color: 'var(--ds-t1)' }}>{t('tracker.eta', { time: formatTime(mission.eta_at) })}</span></>
              )}
              {mission.checked_in_at && stage === 'arrived' && (
                <> · {t('tracker.arrivedAt', { time: relativeTime(mission.checked_in_at, lang) })}</>
              )}
            </div>
          </div>
        </div>

        {mission.eta_note && stage === 'eta_sent' && (
          <div className="mt-3 px-3 py-2 rounded-lg text-[12px]" style={{ background: 'rgba(196,146,40,0.10)', color: 'var(--ds-t1)' }}>
            <Timer className="w-3 h-3 inline mr-1" style={{ color: '#c49228' }} />
            {mission.eta_note}
          </div>
        )}

        <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: 'var(--ds-card-border)' }}>
          <div className="h-full bg-gradient-to-r from-gold to-[#e8c875] transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[9.5px] uppercase tracking-wider">
          {STAGES.map((s, i) => (
            <span key={s} style={{ color: i <= idx ? 'var(--ds-t1)' : 'var(--ds-t3)', fontWeight: i <= idx ? 600 : 400 }}>
              {t(`stageShort.${s}`)}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
        <Link to="/talent/messages" className="flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition" style={{ color: 'var(--ds-t1)' }}>
          <MessageCircle className="w-4 h-4" style={{ color: '#c49228' }} /> {t('tracker.message')}
        </Link>
        {greeter.phone && (
          <a href={`tel:${greeter.phone}`} className="flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition" style={{ color: 'var(--ds-t1)', borderLeft: '1px solid var(--ds-card-border)' }}>
            <Phone className="w-4 h-4" style={{ color: '#c49228' }} /> {t('tracker.call')}
          </a>
        )}
      </div>
    </Card>
  );
}

function formatTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—';
}
