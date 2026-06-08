/**
 * Operations Center Dashboard — ARRIVAL OS
 * Phase A+B+C — Data layer, Mission Control, SLA Intelligence
 *
 * Phase C adds:
 * - Central SLA logic via @/lib/missionSLA (calculateMissionSLA, getSLADashboardStatus)
 * - Alert Strip at top (At Risk / Breach / Critical counters with quick-jump)
 * - SLA badges in header (At Risk / SLA Breach counts)
 * - Color escalation in Mission Cards driven by SLA level
 * - Idle Greeter detection
 * - getMissionPriority now SLA-aware (breached → priority queue)
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44, BACKEND_MODE } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { getMultiMissionManager } from '@/lib/missionRealtimeSync';
import {
  missionEventEmitter,
  MissionStatus,
  IssueServerity,
  transitionMissionState,
  reportMissionIssue,
  getValidNextStates,
} from '@/lib/missionStateMachine';
import { transitionMission, assignGreeter, reportIssue } from '@/api';
import {
  calculateMissionSLA,
  getSLADashboardStatus,
  getSLAMessage,
  SLA_BORDER_CLASSES,
  SLA_BADGE_CLASSES,
} from '@/lib/missionSLA';
import { useAuth } from '@/lib/AuthContext';
import { missionProgress } from '@/lib/missionKernel';
import { STAGE_LABELS_DE } from '@/lib/missionEngine';
import { Card, Pill } from '@/components/ui';
import {
  AlertCircle, CheckCircle2, Users, Radio,
  RefreshCw, Activity, MapPin, Zap, X,
  Flag, FileText, UserCheck, ChevronRight,
  ArrowRight, Clock, ShieldAlert,
} from 'lucide-react';

// ─── constants ───────────────────────────────────────────────────────────────

const STATUS_TONE = {
  open: 'amber', matched: 'blue', assigned: 'violet', accepted: 'blue',
  on_the_way: 'gold', arrived: 'green', met_talent: 'green',
  in_progress: 'gold', completed: 'green', issue_reported: 'red', cancelled: 'neutral',
  // Phase E
  created: 'violet', issue_open: 'red',
};

const STATUS_LABEL = {
  open: 'Offen', matched: 'Matched', assigned: 'Zugewiesen', accepted: 'Angenommen',
  on_the_way: 'Unterwegs', arrived: 'Vor Ort', met_talent: 'Talent getroffen',
  in_progress: 'Läuft', completed: 'Abgeschlossen', issue_reported: 'Problem', cancelled: 'Abgesagt',
  // Phase E
  created: 'Neu', issue_open: 'Problem offen',
};

const TRANSITION_LABELS = {
  [MissionStatus.ACCEPTED]: 'Annehmen',
  [MissionStatus.ON_THE_WAY]: 'Unterwegs markieren',
  [MissionStatus.ARRIVED]: 'Vor Ort markieren',
  [MissionStatus.MET_TALENT]: 'Talent getroffen',
  [MissionStatus.COMPLETED]: 'Abschließen',
  [MissionStatus.CANCELLED]: 'Stornieren',
};

const LEGACY_TRANSITIONS = {
  open: [MissionStatus.ASSIGNED],
  matched: [MissionStatus.ASSIGNED],
  in_progress: [MissionStatus.ARRIVED, MissionStatus.MET_TALENT, MissionStatus.COMPLETED],
};

const TIMELINE_STEPS = [
  { status: MissionStatus.ASSIGNED, label: 'Zu.' },
  { status: MissionStatus.ACCEPTED, label: 'Akt.' },
  { status: MissionStatus.ON_THE_WAY, label: 'Weg' },
  { status: MissionStatus.ARRIVED, label: 'Dort' },
  { status: MissionStatus.MET_TALENT, label: 'Tref.' },
  { status: MissionStatus.COMPLETED, label: 'Fertig' },
];

// ─── helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Gerade eben';
  if (mins < 60) return `vor ${mins} Min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `vor ${h} Std`;
  return `vor ${Math.floor(h / 24)} Tagen`;
}

function isTerminalStatus(status) {
  return status === MissionStatus.COMPLETED || status === MissionStatus.CANCELLED ||
    status === 'completed' || status === 'cancelled';
}

function hasIssue(m) {
  return m.has_issue || m.status === MissionStatus.ISSUE_REPORTED || m.status === 'issue_reported';
}

function getMissionPriority(m) {
  if (hasIssue(m)) return 'critical';
  const sla = calculateMissionSLA(m);
  if (sla.level === 'critical' || sla.level === 'breached') return 'critical';
  if (sla.level === 'at_risk') return 'high';
  return 'normal';
}

function getAdminTransitions(status) {
  if (LEGACY_TRANSITIONS[status]) return LEGACY_TRANSITIONS[status];
  return getValidNextStates(status);
}

function canReportIssue(status) {
  return !isTerminalStatus(status) &&
    status !== MissionStatus.ISSUE_REPORTED &&
    status !== 'issue_reported';
}

// ─── CountdownBadge ──────────────────────────────────────────────────────────

function CountdownBadge({ iso }) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  const absDiff = Math.abs(diff);
  const h = Math.floor(absDiff / 3_600_000);
  const m = Math.floor((absDiff % 3_600_000) / 60_000);
  let text, tone;
  if (diff > 0) {
    text = h > 0 ? `in ${h}h ${m}m` : `in ${m} Min`;
    tone = diff < 30 * 60_000 ? 'amber' : diff < 2 * 3_600_000 ? 'blue' : 'neutral';
  } else {
    text = h > 0 ? `−${h}h ${m}m` : m > 0 ? `−${m} Min` : 'Jetzt';
    tone = 'red';
  }
  return <Pill tone={tone} size="xs">{text}</Pill>;
}

// ─── MissionTimeline ─────────────────────────────────────────────────────────

function MissionTimeline({ status }) {
  const currentIdx = TIMELINE_STEPS.findIndex(s => s.status === status);
  const isIssue = status === MissionStatus.ISSUE_REPORTED || status === 'issue_reported';
  return (
    <div className="flex items-start gap-0 w-full">
      {TIMELINE_STEPS.map((step, i) => {
        const reached = currentIdx >= 0 && i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <React.Fragment key={step.status}>
            {i > 0 && (
              <div className="flex-1 h-px mt-2.5"
                style={{ background: i <= currentIdx ? 'rgba(11,17,32,0.50)' : 'var(--ds-card-border)' }} />
            )}
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                isCurrent ? (isIssue ? 'bg-red-500 ring-2 ring-red-200' : 'bg-navy ring-2 ring-navy/20')
                : reached ? 'bg-navy/60' : ''
              }`}
              style={!isCurrent && !reached ? { background: 'var(--ds-card-border)' } : {}}>
                <div className="rounded-full"
                  style={{ width: reached ? '6px' : '4px', height: reached ? '6px' : '4px', background: reached ? 'white' : 'var(--ds-t3)' }} />
              </div>
              <div className="text-[8px] font-medium leading-none text-center"
                style={{ color: isCurrent ? (isIssue ? '#ef4444' : 'var(--ds-t1)') : reached ? 'var(--ds-t2)' : 'var(--ds-t3)' }}>
                {step.label}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── MissionCard ─────────────────────────────────────────────────────────────

function MissionCard({ mission, greetersMap, candidatesMap, onClick, onHover, onLeave }) {
  const priority = getMissionPriority(mission);
  const sla = calculateMissionSLA(mission);
  const greeter = greetersMap.get(mission.greeter_id);
  const candidate = candidatesMap.get(mission.candidate_id);
  const greeterName = greeter
    ? greeter.full_name.split(' ')[0]
    : mission.greeter_id ? 'Unbekannt' : 'Nicht zugewiesen';
  const candidateName = candidate ? candidate.full_name.split(' ')[0] : 'Talent';
  const slaMessage = getSLAMessage(sla);

  // Border: SLA level takes precedence over priority color
  const borderClass = hasIssue(mission)
    ? 'border-l-4 border-l-red-500'
    : SLA_BORDER_CLASSES[sla.level];

  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(196,146,40,0.45)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.10)'; onHover?.(mission, e.currentTarget.getBoundingClientRect()); }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ds-card-border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; onLeave?.(); }}
      className={`rounded-xl p-4 transition-all cursor-pointer ${borderClass}`}
      style={{ background: 'var(--ds-card)', border: `1px solid var(--ds-card-border)` }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="font-serif text-[13px] font-bold truncate" style={{ color: 'var(--ds-t1)' }}>{mission.title}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>{greeterName} → {candidateName}</div>
        </div>
        <Pill tone={STATUS_TONE[mission.status] || 'neutral'} size="xs" dot>
          {STATUS_LABEL[mission.status] || mission.status}
        </Pill>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--ds-t3)' }}>
          <MapPin className="w-3 h-3" />{mission.city || '—'}
        </div>
        <div className="flex items-center gap-1.5">
          {mission.datetime && <CountdownBadge iso={mission.datetime} />}
          <span className="text-[11px]" style={{ color: 'var(--ds-t3)' }}>
            {timeAgo(mission.last_status_change || mission.created_at)}
          </span>
        </div>
      </div>
      {hasIssue(mission) && mission.issue_message && (
        <div className="mt-2 text-[11px] bg-red-500/15 border border-red-500/25 text-red-400 rounded-lg px-2 py-1.5 truncate">
          {mission.issue_message}
        </div>
      )}
      {slaMessage && !hasIssue(mission) && (
        <div className={`mt-2 text-[11px] rounded-lg px-2 py-1 ${SLA_BADGE_CLASSES[sla.level]}`}>
          {sla.level === 'critical' ? '🔴' : sla.level === 'breached' ? '🟠' : '⚠'} {slaMessage}
        </div>
      )}
    </div>
  );
}

// ─── ActivityItem ─────────────────────────────────────────────────────────────

function ActivityItem({ event }) {
  const actorName = (event.actor || event.created_by || 'System')?.split('@')[0] || 'System';
  const isIssue = event.type === 'MISSION_ISSUE_REPORTED' || event.action?.includes('issue');
  return (
    <div className={`flex items-start gap-2.5 py-2 last:border-0 animate-slide-in-top ${isIssue ? '-mx-3 px-3' : ''}`}
      style={{ borderBottom: '1px solid var(--ds-card-border)', background: isIssue ? 'rgba(239,68,68,0.06)' : 'transparent' }}>
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isIssue ? 'bg-red-500' : 'bg-blue-400'}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] leading-snug" style={{ color: 'var(--ds-t1)' }}>
          <span className="font-medium">{actorName}</span>
          {(event.newStatus || event.new_value) && (
            <> → <span className="font-medium">{STATUS_LABEL[event.newStatus || event.new_value] || event.newStatus || event.new_value}</span></>
          )}
          {event.description && !event.newStatus && (
            <span style={{ color: 'var(--ds-t2)' }}> · {event.description}</span>
          )}
          {isIssue && (event.issueMessage || event.description) && (
            <span className="text-red-500"> · {event.issueMessage || event.description}</span>
          )}
        </div>
        <div className="text-[10.5px] mt-0.5 tabular-nums" style={{ color: 'var(--ds-t3)' }}>
          {timeAgo(event.timestamp || event.created_at)}
        </div>
      </div>
    </div>
  );
}

// ─── ConnectionDot ───────────────────────────────────────────────────────────

function ConnectionDot({ status }) {
  const colors = { live: 'bg-green-500', polling: 'bg-amber-400', disconnected: 'bg-red-500' };
  return (
    <span className="relative flex h-2 w-2">
      {status === 'live' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colors[status] || 'bg-slate-400'}`} />
    </span>
  );
}

// ─── AlertStrip ──────────────────────────────────────────────────────────────

function AlertStrip({ slaStatus, onMissionClick }) {
  if (!slaStatus.hasAlerts && slaStatus.idleGreeterCount === 0) return null;

  const isCritical = slaStatus.criticalCount > 0;
  const isBreached = slaStatus.breachedCount > 0;
  const alertMissions = [...slaStatus.breachedMissions, ...slaStatus.atRiskMissions].slice(0, 4);

  return (
    <div className="rounded-xl px-4 py-3 flex items-start gap-3"
      style={{
        background: isCritical ? 'rgba(239,68,68,0.12)' : isBreached ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.10)',
        border: `1px solid ${isCritical ? 'rgba(239,68,68,0.35)' : isBreached ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.30)'}`,
      }}>
      <ShieldAlert className={`w-4 h-4 mt-0.5 shrink-0 ${isCritical || isBreached ? 'text-red-500' : 'text-amber-500'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          {slaStatus.criticalCount > 0 && (
            <span className="text-[12px] font-bold text-red-500">
              {slaStatus.criticalCount} Kritisch
            </span>
          )}
          {slaStatus.breachedCount > 0 && (
            <span className="text-[12px] font-semibold text-red-500">
              {slaStatus.breachedCount} SLA-Breach{slaStatus.breachedCount !== 1 ? 'es' : ''}
            </span>
          )}
          {slaStatus.atRiskCount > 0 && (
            <span className="text-[12px] font-semibold text-amber-500">
              {slaStatus.atRiskCount} At Risk
            </span>
          )}
          {slaStatus.idleGreeterCount > 0 && (
            <span className="text-[12px]" style={{ color: 'var(--ds-t2)' }}>
              {slaStatus.idleGreeterCount} Greeter untätig
            </span>
          )}
        </div>
        {alertMissions.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {alertMissions.map(m => (
              <button
                key={m.id}
                onClick={() => onMissionClick(m.id)}
                className={`text-[10.5px] px-2.5 py-1 rounded-lg font-medium border transition ${
                  m._sla?.level === 'critical'
                    ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                    : m._sla?.level === 'breached'
                    ? 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25 hover:bg-red-500/25'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/25'
                }`}
              >
                {m.title.split(' ').slice(0, 3).join(' ')}
                {m._sla && (
                  <span className="ml-1 opacity-70">· {getSLAMessage(m._sla)}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── GermanyHeatmap ──────────────────────────────────────────────────────────

const CITY_COORDS = {
  Hamburg:    { x: 90,  y: 49  },
  Berlin:     { x: 164, y: 82  },
  Köln:       { x: 24,  y: 133 },
  Frankfurt:  { x: 61,  y: 159 },
  München:    { x: 125, y: 222 },
  Düsseldorf: { x: 20,  y: 123 },
  Stuttgart:  { x: 72,  y: 202 },
  Leipzig:    { x: 142, y: 119 },
  Nürnberg:   { x: 114, y: 180 },
  Dresden:    { x: 172, y: 130 },
  Hannover:   { x: 84,  y: 87  },
  Bremen:     { x: 64,  y: 64  },
  Dortmund:   { x: 35,  y: 114 },
};

// Simplified Germany border — equirectangular projection into 200×250 viewport
const GERMANY_PATH = 'M 57,2 L 90,9 L 134,21 L 182,36 L 192,105 L 199,146 L 156,210 L 134,241 L 101,246 L 40,243 L 38,233 L 22,188 L 14,156 L 7,137 L 5,127 L 5,104 L 24,57 Z';

const SLA_DOT_COLOR = {
  ok:       '#3b82f6',
  at_risk:  '#f59e0b',
  breached: '#ef4444',
  critical: '#dc2626',
};

function GermanyHeatmap({ missions, selectedCity, onCitySelect }) {
  const [hoveredCity, setHoveredCity] = useState(null);

  const cityStats = useMemo(() => {
    const stats = {};
    const levels = ['ok', 'at_risk', 'breached', 'critical'];
    for (const m of missions.values()) {
      if (!m.city || isTerminalStatus(m.status)) continue;
      if (!stats[m.city]) stats[m.city] = { count: 0, worstLevel: 'ok' };
      const sla = calculateMissionSLA(m);
      stats[m.city].count++;
      if (levels.indexOf(sla.level) > levels.indexOf(stats[m.city].worstLevel)) {
        stats[m.city].worstLevel = sla.level;
      }
    }
    return stats;
  }, [missions]);

  return (
    <div className="px-5 py-4 rounded-2xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--ds-t3)' }} />
          <span className="text-[10.5px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--ds-t3)' }}>
            Deutschland, Aktive Operationen
          </span>
        </div>
        {selectedCity && (
          <button onClick={() => onCitySelect(null)}
            className="text-[10.5px] font-medium text-blue-500 hover:text-blue-400 flex items-center gap-1">
            <X className="w-3 h-3" /> Filter: {selectedCity}
          </button>
        )}
      </div>
      <div className="flex gap-5 items-start">

        {/* SVG Map */}
        <div className="shrink-0">
          <svg viewBox="-4 -4 212 260" width={155} height={190} className="overflow-visible">
            <path d={GERMANY_PATH} fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" strokeLinejoin="round" />
            {Object.entries(CITY_COORDS).map(([city, { x, y }]) => {
              const stat = cityStats[city];
              const count = stat?.count ?? 0;
              const level = stat?.worstLevel ?? 'ok';
              const r = count > 0 ? Math.min(4 + count * 2.5, 14) : 2.5;
              const fill = count > 0 ? SLA_DOT_COLOR[level] : '#cbd5e1';
              const isHov = hoveredCity === city;
              const isSel = selectedCity === city;

              return (
                <g key={city}
                  onMouseEnter={() => setHoveredCity(city)}
                  onMouseLeave={() => setHoveredCity(null)}
                  onClick={() => count > 0 && onCitySelect(isSel ? null : city)}
                  style={{ cursor: count > 0 ? 'pointer' : 'default' }}
                >
                  {(level === 'critical' || level === 'breached') && count > 0 && (
                    <circle cx={x} cy={y} r={r + 5} fill={fill} opacity="0.15" />
                  )}
                  <circle cx={x} cy={y} r={r}
                    fill={fill}
                    opacity={isSel ? 1 : isHov ? 0.95 : 0.82}
                    stroke={isSel ? '#1e293b' : 'white'}
                    strokeWidth={count > 0 ? 1.5 : 0.8}
                  />
                  {count > 0 && r >= 6 && (
                    <text x={x} y={y + 0.4} textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize="6.5" fontWeight="700" style={{ pointerEvents: 'none' }}>
                      {count}
                    </text>
                  )}
                  {isHov && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x={x - 28} y={y - 24} width={56} height={16} rx={3} fill="#0f172a" opacity="0.9" />
                      <text x={x} y={y - 13} textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize="7.5" fontWeight="600">
                        {city}{count > 0 ? ` · ${count}` : ''}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* City list */}
        <div className="flex-1 min-w-0">
          <div className="space-y-1">
            {Object.entries(cityStats)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([city, stat]) => (
                <button key={city}
                  onClick={() => onCitySelect(selectedCity === city ? null : city)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition"
                  style={{ background: selectedCity === city ? 'rgba(196,146,40,0.10)' : 'transparent' }}
                  onMouseEnter={(e) => { if (selectedCity !== city) e.currentTarget.style.background = 'rgba(196,146,40,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = selectedCity === city ? 'rgba(196,146,40,0.10)' : 'transparent'; }}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    stat.worstLevel === 'critical' ? 'bg-red-600' :
                    stat.worstLevel === 'breached' ? 'bg-red-500' :
                    stat.worstLevel === 'at_risk' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-[12px] font-medium flex-1 truncate" style={{ color: 'var(--ds-t1)' }}>{city}</span>
                  <span className={`text-[12px] font-bold tabular-nums ${
                    stat.worstLevel === 'critical' || stat.worstLevel === 'breached' ? 'text-red-500' :
                    stat.worstLevel === 'at_risk' ? 'text-amber-500' : 'text-blue-500'
                  }`}>{stat.count}</span>
                </button>
              ))}
          </div>
          <div className="mt-3 pt-2 flex flex-wrap gap-x-3 gap-y-1" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
            {[
              { cls: 'bg-red-600',  label: 'Kritisch' },
              { cls: 'bg-amber-500', label: 'At Risk' },
              { cls: 'bg-blue-500', label: 'Aktiv' },
              { cls: 'bg-slate-300', label: 'Keine' },
            ].map(({ cls, label }) => (
              <div key={label} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${cls}`} />
                <span className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--ds-t3)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── MissionDetailDrawer ─────────────────────────────────────────────────────

function MissionDetailDrawer({ missionId, missions, greetersMap, candidatesMap, currentUserEmail, onClose, onMissionUpdated }) {
  const mission = missions.get(missionId);
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [issueSeverity, setIssueSeverity] = useState(IssueServerity.WARNING);
  const [noteText, setNoteText] = useState('');
  const [selectedGreeterId, setSelectedGreeterId] = useState('');

  useEffect(() => {
    setView('overview');
    setIssueText('');
    setNoteText('');
    setSelectedGreeterId(mission?.greeter_id || '');
    if (missionId) {
      base44.entities.ActivityLog.filter({ entity_id: missionId }, '-timestamp')
        .then(setLogs).catch(() => setLogs([]));
    }
  }, [missionId]);

  if (!mission) return null;

  const sla = calculateMissionSLA(mission);
  const slaMsg = getSLAMessage(sla);
  const greeter = greetersMap.get(mission.greeter_id);
  const candidate = candidatesMap.get(mission.candidate_id);
  const availableTransitions = getAdminTransitions(mission.status);
  const isEnumStatus = Object.values(MissionStatus).includes(mission.status);
  const availableGreeters = Array.from(greetersMap.values()).filter(g => g.status === 'available' || g.id === mission.greeter_id);

  const handleTransition = async (nextStatus) => {
    setActionLoading(true);
    try {
      const event = await transitionMission({ mission, nextStatus, role: 'admin', actor: currentUserEmail, base44 });
      const log = await base44.entities.ActivityLog.create({
        entity_type: 'Mission', entity_id: mission.id,
        action: 'mission.status_changed',
        old_value: mission.status, new_value: nextStatus,
        created_by: currentUserEmail,
        description: `${STATUS_LABEL[mission.status] || mission.status} → ${STATUS_LABEL[nextStatus] || nextStatus}`,
        timestamp: event.timestamp,
      });
      setLogs(prev => [log, ...prev]);
      onMissionUpdated(mission.id, { status: nextStatus, last_status_change: event.timestamp, last_updated_by: currentUserEmail });
    } catch (err) {
      console.error('[Drawer] transition failed:', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssue = async () => {
    if (!issueText.trim()) return;
    setActionLoading(true);
    try {
      const event = await reportIssue({
        mission, severity: issueSeverity, message: issueText,
        role: 'admin', actor: currentUserEmail, base44,
      });
      const log = await base44.entities.ActivityLog.create({
        entity_type: 'Mission', entity_id: mission.id,
        action: 'mission.issue_reported',
        old_value: mission.status, new_value: MissionStatus.ISSUE_OPEN,
        created_by: currentUserEmail,
        description: `[${issueSeverity.toUpperCase()}] ${issueText}`,
        timestamp: event.timestamp,
      });
      setLogs(prev => [log, ...prev]);
      onMissionUpdated(mission.id, {
        status: MissionStatus.ISSUE_OPEN, has_issue: true,
        issue_severity: issueSeverity, issue_message: issueText,
        last_status_change: event.timestamp,
      });
      setView('overview');
    } catch (err) {
      console.error('[Drawer] issue report failed:', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleNote = async () => {
    if (!noteText.trim()) return;
    setActionLoading(true);
    try {
      const log = await base44.entities.ActivityLog.create({
        entity_type: 'Mission', entity_id: mission.id,
        action: 'mission.note_added',
        created_by: currentUserEmail,
        description: noteText,
        timestamp: new Date().toISOString(),
      });
      setLogs(prev => [log, ...prev]);
      setNoteText('');
      setView('overview');
    } catch (err) {
      console.error('[Drawer] note failed:', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedGreeterId) return;
    setActionLoading(true);
    try {
      const event = await assignGreeter({ mission, greeterId: selectedGreeterId, role: 'admin', actor: currentUserEmail, base44 });
      const assignedGreeter = greetersMap.get(selectedGreeterId);
      const log = await base44.entities.ActivityLog.create({
        entity_type: 'Mission', entity_id: mission.id,
        action: 'mission.greeter_assigned',
        created_by: currentUserEmail,
        description: `Greeter "${assignedGreeter?.full_name || selectedGreeterId}" zugewiesen`,
        timestamp: event.timestamp,
      });
      setLogs(prev => [log, ...prev]);
      onMissionUpdated(mission.id, { greeter_id: selectedGreeterId, status: MissionStatus.ASSIGNED, last_status_change: event.timestamp });
      setView('overview');
    } catch (err) {
      console.error('[Drawer] assign failed:', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--ds-card)' }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: '1px solid var(--ds-card-border)' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Pill tone={STATUS_TONE[mission.status] || 'neutral'} size="xs" dot>
                {STATUS_LABEL[mission.status] || mission.status}
              </Pill>
              {mission.datetime && <CountdownBadge iso={mission.datetime} />}
              {sla.level !== 'ok' && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SLA_BADGE_CLASSES[sla.level]}`}>
                  {sla.level === 'critical' ? '🔴' : sla.level === 'breached' ? '🟠' : '⚠'} {slaMsg}
                </span>
              )}
            </div>
            <h2 className="font-bold text-[15px] leading-snug" style={{ color: 'var(--ds-t1)' }}>{mission.title}</h2>
            <div className="flex items-center gap-1 text-[11px] mt-1" style={{ color: 'var(--ds-t3)' }}>
              <MapPin className="w-3 h-3" />
              {mission.location || mission.city || '—'}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors shrink-0 mt-0.5"
            style={{ color: 'var(--ds-t3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-card-border)'; e.currentTarget.style.color = 'var(--ds-t1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ds-t3)'; }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-3" style={{ color: 'var(--ds-t3)' }}>Fortschritt</div>
            <MissionTimeline status={mission.status} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'var(--ds-card-border)' }}>
              <div className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-1.5" style={{ color: 'var(--ds-t3)' }}>Greeter</div>
              {greeter ? (
                <>
                  <div className="font-semibold text-[13px]" style={{ color: 'var(--ds-t1)' }}>{greeter.full_name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>{greeter.city}</div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {(greeter.languages || []).slice(0, 2).map(l => <Pill key={l} tone="navy" size="xs">{l}</Pill>)}
                  </div>
                </>
              ) : (
                <div className="text-[12px] italic" style={{ color: 'var(--ds-t3)' }}>Nicht zugewiesen</div>
              )}
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--ds-card-border)' }}>
              <div className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-1.5" style={{ color: 'var(--ds-t3)' }}>Talent</div>
              {candidate ? (
                <>
                  <div className="font-semibold text-[13px]" style={{ color: 'var(--ds-t1)' }}>{candidate.full_name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>{candidate.role}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--ds-t3)' }}>{candidate.origin}</div>
                </>
              ) : (
                <div className="text-[12px] italic" style={{ color: 'var(--ds-t3)' }}>Kein Profil</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {mission.datetime && (
              <div className="flex items-center gap-2 text-[12px]">
                <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--ds-t3)' }} />
                <span style={{ color: 'var(--ds-t2)' }}>
                  {new Date(mission.datetime).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            {mission.pay && (
              <div className="flex items-center gap-2 text-[12px]">
                <span className="w-3.5 text-center text-[10px]" style={{ color: 'var(--ds-t3)' }}>€</span>
                <span style={{ color: 'var(--ds-t2)' }}>{mission.pay} €</span>
              </div>
            )}
          </div>

          {hasIssue(mission) && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <div className="text-[10px] uppercase tracking-[0.12em] text-red-500 font-semibold mb-1">
                Aktives Problem, {mission.issue_severity?.toUpperCase()}
              </div>
              <div className="text-[12px] text-red-400">{mission.issue_message || 'Kein Detail'}</div>
            </div>
          )}

          {view === 'issue' && (
            <div className="space-y-3 rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
              <div className="text-[11px] font-semibold text-red-500 uppercase tracking-wide">Problem melden</div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { v: IssueServerity.INFO, l: 'Info', cls: 'border-blue-400/40 text-blue-400 bg-blue-500/10' },
                  { v: IssueServerity.WARNING, l: 'Warnung', cls: 'border-amber-400/40 text-amber-400 bg-amber-500/10' },
                  { v: IssueServerity.CRITICAL, l: 'Kritisch', cls: 'border-red-400/40 text-red-400 bg-red-500/10' },
                ].map(o => (
                  <button key={o.v} onClick={() => setIssueSeverity(o.v)}
                    className={`py-1.5 rounded-lg text-[11px] font-medium border transition ${issueSeverity === o.v ? o.cls : ''}`}
                    style={issueSeverity !== o.v ? { background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)', color: 'var(--ds-t2)' } : {}}>
                    {o.l}
                  </button>
                ))}
              </div>
              <textarea
                className="w-full text-[12px] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-red-400/50"
                style={{ background: 'var(--ds-card)', border: '1px solid rgba(239,68,68,0.30)', color: 'var(--ds-t1)' }}
                rows={3} placeholder="Was ist passiert?"
                value={issueText} onChange={e => setIssueText(e.target.value)} autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setView('overview')} className="flex-1 py-2 text-[12px] font-medium rounded-lg transition"
                  style={{ color: 'var(--ds-t2)', background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>Abbrechen</button>
                <button onClick={handleIssue} disabled={!issueText.trim() || actionLoading} className="flex-1 py-2 text-[12px] font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-40 transition">
                  {actionLoading ? '…' : 'Melden'}
                </button>
              </div>
            </div>
          )}

          {view === 'note' && (
            <div className="space-y-3 rounded-xl p-4" style={{ background: 'var(--ds-card-border)', border: '1px solid var(--ds-card-border)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ds-t1)' }}>Notiz hinzufügen</div>
              <textarea
                className="w-full text-[12px] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-navy/30"
                style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)', color: 'var(--ds-t1)' }}
                rows={3} placeholder="Notiz für das Audit-Log…"
                value={noteText} onChange={e => setNoteText(e.target.value)} autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setView('overview')} className="flex-1 py-2 text-[12px] font-medium rounded-lg transition"
                  style={{ color: 'var(--ds-t2)', background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>Abbrechen</button>
                <button onClick={handleNote} disabled={!noteText.trim() || actionLoading} className="flex-1 py-2 text-[12px] font-medium text-white bg-navy rounded-lg hover:bg-navy/90 disabled:opacity-40 transition">
                  {actionLoading ? '…' : 'Speichern'}
                </button>
              </div>
            </div>
          )}

          {view === 'assign' && (
            <div className="space-y-3 rounded-xl p-4" style={{ background: 'var(--ds-card-border)', border: '1px solid var(--ds-card-border)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ds-t1)' }}>Greeter zuweisen</div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {availableGreeters.map(g => (
                  <button key={g.id} onClick={() => setSelectedGreeterId(g.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition"
                    style={selectedGreeterId === g.id
                      ? { background: 'rgba(196,146,40,0.10)', borderColor: 'rgba(196,146,40,0.30)', color: 'var(--ds-t1)' }
                      : { background: 'var(--ds-card)', borderColor: 'var(--ds-card-border)', color: 'var(--ds-t1)' }}>
                    <div className="w-7 h-7 rounded-full bg-navy/10 text-navy dark:bg-white/[0.10] dark:text-white/75 text-[11px] font-bold grid place-items-center shrink-0">
                      {g.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium truncate">{g.full_name}</div>
                      <div className="text-[10px]" style={{ color: 'var(--ds-t3)' }}>{g.city} · ⭐ {g.rating}</div>
                    </div>
                    {g.id === mission.greeter_id && <Pill tone="violet" size="xs" className="ml-auto shrink-0">Aktuell</Pill>}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setView('overview')} className="flex-1 py-2 text-[12px] font-medium rounded-lg transition"
                  style={{ color: 'var(--ds-t2)', background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>Abbrechen</button>
                <button onClick={handleAssign} disabled={!selectedGreeterId || actionLoading} className="flex-1 py-2 text-[12px] font-medium text-white bg-navy rounded-lg hover:bg-navy/90 disabled:opacity-40 transition">
                  {actionLoading ? '…' : 'Zuweisen'}
                </button>
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-2" style={{ color: 'var(--ds-t3)' }}>Ereignisprotokoll</div>
              <div>
                {logs.slice(0, 15).map((log, i) => <ActivityItem key={log.id || i} event={log} />)}
              </div>
            </div>
          )}
        </div>

        {/* Sticky action footer */}
        {view === 'overview' && !isTerminalStatus(mission.status) && (
          <div className="shrink-0 px-5 py-4 space-y-3" style={{ borderTop: '1px solid var(--ds-card-border)', background: 'var(--ds-card)' }}>
            {availableTransitions.filter(s => s !== MissionStatus.CANCELLED).length > 0 && (
              <div className="space-y-1.5">
                {availableTransitions.filter(s => s !== MissionStatus.CANCELLED).map(nextStatus => (
                  <button key={nextStatus} onClick={() => handleTransition(nextStatus)} disabled={actionLoading}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-navy text-white text-[12px] font-medium hover:bg-navy/90 disabled:opacity-40 transition">
                    <span className="flex items-center gap-2">
                      <ArrowRight className="w-3.5 h-3.5" />
                      {TRANSITION_LABELS[nextStatus] || STATUS_LABEL[nextStatus] || nextStatus}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setView('assign')} className="flex flex-col items-center gap-1 py-2 rounded-xl transition"
                style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t2)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,146,40,0.10)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-card-border)'; }}>
                <UserCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium">Greeter</span>
              </button>
              {canReportIssue(mission.status) && (
                <button onClick={() => setView('issue')} className="flex flex-col items-center gap-1 py-2 rounded-xl text-red-500 transition"
                  style={{ background: 'rgba(239,68,68,0.08)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}>
                  <Flag className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">Problem</span>
                </button>
              )}
              <button onClick={() => setView('note')} className="flex flex-col items-center gap-1 py-2 rounded-xl transition"
                style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t2)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,146,40,0.10)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-card-border)'; }}>
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium">Notiz</span>
              </button>
            </div>
            {availableTransitions.includes(MissionStatus.CANCELLED) && (
              <button onClick={() => handleTransition(MissionStatus.CANCELLED)} disabled={actionLoading}
                className="w-full py-2 text-[11.5px] font-medium text-red-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition">
                Mission stornieren
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── MissionHoverPreview — Schnellblick beim Hover: Fortschritt + tiefere Infos (nicht das Karten-Duplikat) ──
function opsStatement(mission, gname, cand) {
  if (mission.has_issue) return mission.issue_message || 'Problem gemeldet.';
  return ({
    created:     'Geplant, Greeter wird zugewiesen.',
    open:        'Matching läuft.',
    matched:     'Matching läuft.',
    assigned:    gname ? `${gname} zugewiesen, wartet auf Bestätigung.` : 'Greeter zugewiesen.',
    accepted:    gname ? `${gname} hat angenommen.` : 'Angenommen.',
    on_the_way:  gname ? `${gname} ist unterwegs zu ${cand}.` : `Unterwegs zu ${cand}.`,
    arrived:     gname ? `${gname} ist am Treffpunkt.` : 'Am Treffpunkt.',
    in_progress: `Ankunft läuft mit ${cand}.`,
    met_talent:  `Ankunft läuft mit ${cand}.`,
    completed:   `${cand} ist erfolgreich angekommen.`,
    cancelled:   'Mission storniert.',
  }[mission.status]) || (STAGE_LABELS_DE[mission.greeter_stage] || STATUS_LABEL[mission.status] || mission.status);
}

function MissionHoverPreview({ data, greetersMap, candidatesMap, activityFeed }) {
  if (!data) return null;
  const { mission, rect } = data;
  const greeter = greetersMap.get(mission.greeter_id);
  const candidate = candidatesMap.get(mission.candidate_id);
  const gname = greeter ? greeter.full_name.split(' ')[0] : null;
  const cand = candidate ? candidate.full_name.split(' ')[0] : 'Talent';
  const stageLabel = STAGE_LABELS_DE[mission.greeter_stage] || STATUS_LABEL[mission.status] || mission.status;
  const pct = missionProgress(mission).pct;
  const statement = opsStatement(mission, gname, cand);
  const lastEvent = (activityFeed || []).find(e => e.missionId === mission.id);
  const etaStr = mission.eta_at ? new Date(mission.eta_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : null;

  const W = 272;
  let left = rect.right + 10;
  if (left + W > window.innerWidth - 8) left = rect.left - W - 10;
  if (left < 8) left = 8;
  let top = rect.top;
  if (top + 210 > window.innerHeight - 8) top = Math.max(8, window.innerHeight - 210 - 8);

  return createPortal(
    <div className="fixed z-[60] rounded-xl p-3.5 pointer-events-none animate-fade-in"
      style={{ left, top, width: W, background: 'var(--ds-popup, var(--ds-card))', border: '1px solid var(--ds-card-border)', boxShadow: '0 18px 48px rgba(0,0,0,0.28)' }}>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="font-serif text-[13px] font-bold truncate" style={{ color: 'var(--ds-t1)' }}>{mission.title}</div>
        <span className="text-[9.5px] font-bold uppercase tracking-wide shrink-0" style={{ color: '#c49228' }}>{stageLabel}</span>
      </div>

      {/* Fortschritt */}
      <div className="flex items-center justify-between text-[9.5px] uppercase tracking-[0.12em] font-semibold mb-1" style={{ color: 'var(--ds-t3)' }}>
        <span>Fortschritt</span><span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-2.5" style={{ background: 'var(--ds-card-border)' }}>
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: mission.has_issue ? '#ef4444' : 'linear-gradient(90deg,#c49228,#d4a83a)' }} />
      </div>

      {/* Aktueller Schritt */}
      <div className="text-[12px] leading-snug mb-2" style={{ color: mission.has_issue ? '#f87171' : 'var(--ds-t1)' }}>
        {statement}
      </div>

      {/* Extras */}
      {etaStr && <div className="text-[11px] mb-1" style={{ color: 'var(--ds-t2)' }}>ETA {etaStr}</div>}
      {mission.flight_status === 'delayed' && (
        <div className="text-[11px] mb-1 text-amber-500">✈ Flug verspätet{mission.flight_delay_note ? ` · ${mission.flight_delay_note}` : ''}</div>
      )}

      {/* Letzte Aktivität (echt, aus dem Feed) */}
      <div className="text-[10.5px] pt-1.5" style={{ color: 'var(--ds-t3)', borderTop: '1px solid var(--ds-card-border)' }}>
        {lastEvent
          ? <>Zuletzt: {lastEvent.description || STATUS_LABEL[lastEvent.newStatus || lastEvent.new_value] || 'Update'} · {timeAgo(lastEvent.timestamp)}</>
          : <>Zuletzt aktualisiert {timeAgo(mission.last_status_change || mission.created_at)}</>}
      </div>
      <div className="text-[10px] mt-1 font-semibold" style={{ color: '#c49228' }}>Klick → volle Mission</div>
    </div>,
    document.body
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function OperationsCenterDashboard() {
  const { user } = useAuth();
  const currentUserEmail = user?.email || 'admin@neuland.de';

  const [missions, setMissions] = useState(new Map());
  const [greetersMap, setGreetersMap] = useState(new Map());
  const [candidatesMap, setCandidatesMap] = useState(new Map());
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [hoverData, setHoverData] = useState(null);
  const hoverTimerRef = useRef(null);
  const navigate = useNavigate();
  const openMission = (id) => navigate(`/admin/missions/${id}`);
  const onCardHover = (mission, rect) => { clearTimeout(hoverTimerRef.current); setHoverData({ mission, rect }); };
  const onCardLeave = () => { hoverTimerRef.current = setTimeout(() => setHoverData(null), 80); };
  const [cityFilter, setCityFilter] = useState(null);
  const pollIntervalRef = useRef(null);
  const queryClient = useQueryClient();
  const multiManager = getMultiMissionManager();

  // ── derived stats ──
  const stats = useMemo(() => {
    const all = Array.from(missions.values());
    const greeters = Array.from(greetersMap.values());
    return {
      total: all.length,
      active: all.filter(m => !isTerminalStatus(m.status)).length,
      issues: all.filter(m => hasIssue(m)).length,
      completed: all.filter(m => m.status === MissionStatus.COMPLETED || m.status === 'completed').length,
      greetersAvailable: greeters.filter(g => g.status === 'available').length,
      greetersBusy: greeters.filter(g => g.status === 'on_mission').length,
      greetersBreak: greeters.filter(g => g.status === 'break').length,
    };
  }, [missions, greetersMap]);

  // ── SLA intelligence — central risk picture ──
  const slaStatus = useMemo(() =>
    getSLADashboardStatus(missions, greetersMap),
    [missions, greetersMap]
  );

  // ── mission buckets — city-filtered when a city is selected ──
  const { incomingMissions, priorityMissions, activeMissions, completedMissions } = useMemo(() => {
    let all = Array.from(missions.values());
    if (cityFilter) all = all.filter(m => m.city === cityFilter);
    const isCreated = (m) => m.status === 'created' || m.status === MissionStatus.CREATED;
    return {
      incomingMissions: all.filter(m => isCreated(m)),
      priorityMissions: all.filter(m => !isCreated(m) && getMissionPriority(m) !== 'normal'),
      activeMissions: all.filter(m => !isCreated(m) && !isTerminalStatus(m.status) && getMissionPriority(m) === 'normal'),
      completedMissions: all.filter(m => isTerminalStatus(m.status)),
    };
  }, [missions, cityFilter]);

  // ── load data ──
  const loadMissions = useCallback(async () => {
    try {
      const [allMissions, allGreeters, allCandidates] = await Promise.all([
        base44.entities.Mission.list(),
        base44.entities.GreeterProfile.list(),
        base44.entities.Candidate.list(),
      ]);
      const mMap = new Map();
      allMissions.forEach(m => {
        mMap.set(m.id, m);
        if (BACKEND_MODE === 'supabase' && !multiManager.isConnected(m.id)) {
          multiManager.addMission(m.id, (updated) => {
            setMissions(prev => { const n = new Map(prev); n.set(m.id, updated); return n; });
          });
        }
      });
      const gMap = new Map();
      allGreeters.forEach(g => gMap.set(g.id, g));
      const cMap = new Map();
      allCandidates.forEach(c => cMap.set(c.id, c));
      setMissions(mMap);
      setGreetersMap(gMap);
      setCandidatesMap(cMap);
      setLastRefreshed(new Date());
      setLoading(false);
    } catch (err) {
      console.error('[OpsCenter] loadMissions failed:', err);
      setLoading(false);
    }
  }, [multiManager]);

  const handleMissionUpdated = useCallback((missionId, patch) => {
    setMissions(prev => {
      const next = new Map(prev);
      const m = next.get(missionId);
      if (m) next.set(missionId, { ...m, ...patch });
      return next;
    });
    queryClient.invalidateQueries({ queryKey: ['missions'] });
  }, [queryClient]);

  // ── realtime or polling ──
  useEffect(() => {
    let active = true;
    const setup = async () => {
      setConnectionStatus('connecting');
      await loadMissions();
      if (!active) return;
      if (BACKEND_MODE === 'supabase') {
        try { await multiManager.subscribe(); if (active) setConnectionStatus('connected'); }
        catch { if (active) setConnectionStatus('disconnected'); }
      } else {
        if (active) setConnectionStatus('connected');
        pollIntervalRef.current = setInterval(loadMissions, 4000);
      }
    };
    setup();
    return () => {
      active = false;
      multiManager.unsubscribeAll();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── event emitter → feed + map ──
  useEffect(() => {
    const addToFeed = (event) => {
      setActivityFeed(prev => [
        { id: `${event.missionId}-${event.timestamp}-${Math.random()}`, ...event },
        ...prev,
      ].slice(0, 30));
      if (event.newStatus) {
        setMissions(prev => {
          const next = new Map(prev);
          const m = next.get(event.missionId);
          if (m) next.set(event.missionId, {
            ...m, status: event.newStatus, last_status_change: event.timestamp, last_updated_by: event.actor,
            has_issue: event.type === 'MISSION_ISSUE_REPORTED' ? true : m.has_issue,
            issue_message: event.issueMessage || m.issue_message,
          });
          return next;
        });
      }
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    };
    const addCreatedToFeed = (event) => {
      addToFeed(event);
      // Also insert the new mission into the map so it appears in the Incoming Queue immediately
      if (event.missionId) {
        base44.entities.Mission.get(event.missionId).then(m => {
          if (m) setMissions(prev => { const n = new Map(prev); n.set(m.id, m); return n; });
        }).catch(() => {});
      }
    };

    const unsubs = [
      missionEventEmitter.on('MISSION_CREATED', addCreatedToFeed),
      missionEventEmitter.on('MISSION_STATUS_CHANGED', addToFeed),
      missionEventEmitter.on('MISSION_ASSIGNED', addToFeed),
      missionEventEmitter.on('MISSION_ISSUE_REPORTED', addToFeed),
      missionEventEmitter.on('MISSION_OPTIMISTIC_UPDATE', addToFeed),
    ];
    const history = missionEventEmitter.getHistory(20);
    if (history.length > 0) {
      setActivityFeed([...history].reverse().map((e, i) => ({ id: `hist-${i}-${e.timestamp}`, ...e })));
    }
    return () => unsubs.forEach(u => u());
  }, [queryClient]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMissions();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-7 h-7 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--ds-card-border)', borderTopColor: 'var(--ds-t2)' }} />
          <div className="text-[13px]" style={{ color: 'var(--ds-t2)' }}>Lade Operations Center…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full p-5 space-y-4" style={{ background: 'var(--ds-bg)' }}>

      {/* DARK HERO */}
      <div className="rounded-2xl overflow-hidden -mx-1">
        <div className="px-7 pt-7 pb-6 bg-gradient-to-br from-navy via-navy to-navy-2 text-cream">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] uppercase tracking-[0.16em] text-gold font-bold">
              Operations Center · Echtzeit-Dispatch
            </span>
            <ConnectionDot status={
              connectionStatus === 'connected' ? (BACKEND_MODE === 'supabase' ? 'live' : 'polling') :
              connectionStatus === 'connecting' ? 'polling' : 'disconnected'
            } />
            <button onClick={handleRefresh} disabled={refreshing} title="Aktualisieren" aria-label="Aktualisieren" className="ml-auto p-1 rounded hover:bg-white/10 disabled:opacity-40 transition">
              <RefreshCw className={`w-3 h-3 text-cream/50 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <h1 className="font-serif text-[32px] md:text-[38px] leading-[1.1] font-bold">
            {stats.active > 0
              ? `${stats.active} ${stats.active === 1 ? 'Mission läuft' : 'Missionen laufen'} gerade.`
              : 'Bereit für den nächsten Einsatz.'}
          </h1>
          <div className="grid grid-cols-4 gap-5 mt-5">
            {[
              { n: stats.total,        l: 'Gesamt' },
              { n: stats.active,       l: 'Aktiv' },
              { n: slaStatus.breachedCount + slaStatus.criticalCount, l: 'SLA-Verletzungen' },
              { n: stats.greetersAvailable, l: 'Greeter frei' },
            ].map(s => (
              <div key={s.l}>
                <div className="font-serif text-3xl font-bold text-gold tabular-nums">{s.n}</div>
                <div className="text-[10px] uppercase tracking-widest text-cream/40 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
          {lastRefreshed && (
            <div className="mt-4 text-[11px] text-cream/30 tabular-nums">
              Aktualisiert {timeAgo(lastRefreshed.toISOString())}
            </div>
          )}
        </div>
      </div>

      {/* ALERT STRIP */}
      <AlertStrip slaStatus={slaStatus} onMissionClick={openMission} />

      {/* MISSION COLUMNS + ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ds-t2)' }}>Priorität</span>
            {priorityMissions.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center ml-0.5">
                {priorityMissions.length}
              </span>
            )}
            {cityFilter && <span className="text-[9.5px] text-blue-500 font-medium ml-auto">· {cityFilter}</span>}
          </div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto">
            {incomingMissions.length > 0 && (
              <>
                <div className="text-[9.5px] text-violet-500 font-semibold uppercase tracking-[0.13em] px-0.5">
                  Eingehend ({incomingMissions.length})
                </div>
                {incomingMissions.map(m => (
                  <MissionCard key={m.id} mission={m} greetersMap={greetersMap} candidatesMap={candidatesMap}
                    onClick={() => openMission(m.id)} onHover={onCardHover} onLeave={onCardLeave} />
                ))}
                {priorityMissions.length > 0 && (
                  <div className="pt-1" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
                    <div className="text-[9.5px] text-red-500 font-semibold uppercase tracking-[0.13em] px-0.5 mb-1">
                      Priorität
                    </div>
                  </div>
                )}
              </>
            )}
            {priorityMissions.length === 0 && incomingMissions.length === 0 ? (
              <div className="text-center py-10 text-[12px]" style={{ color: 'var(--ds-t3)' }}>
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                Keine kritischen Missionen
              </div>
            ) : (
              priorityMissions.map(m => (
                <MissionCard key={m.id} mission={m} greetersMap={greetersMap} candidatesMap={candidatesMap}
                  onClick={() => openMission(m.id)} onHover={onCardHover} onLeave={onCardLeave} />
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Radio className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ds-t2)' }}>Aktiv</span>
            <span className="text-[10px]" style={{ color: 'var(--ds-t3)' }}>({activeMissions.length})</span>
          </div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto">
            {activeMissions.length === 0 ? (
              <div className="text-center py-10 text-[12px]" style={{ color: 'var(--ds-t3)' }}>Keine aktiven Missionen</div>
            ) : (
              activeMissions.map(m => (
                <MissionCard key={m.id} mission={m} greetersMap={greetersMap} candidatesMap={candidatesMap}
                  onClick={() => openMission(m.id)} onHover={onCardHover} onLeave={onCardLeave} />
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ds-t2)' }}>Abgeschlossen</span>
              <span className="text-[10px]" style={{ color: 'var(--ds-t3)' }}>({completedMissions.length})</span>
            </div>
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {completedMissions.length === 0 ? (
                <div className="text-center py-4 text-[12px]" style={{ color: 'var(--ds-t3)' }}>Noch keine</div>
              ) : (
                completedMissions.slice(0, 5).map(m => (
                  <MissionCard key={m.id} mission={m} greetersMap={greetersMap} candidatesMap={candidatesMap}
                    onClick={() => openMission(m.id)} onHover={onCardHover} onLeave={onCardLeave} />
                ))
              )}
            </div>
          </div>

          <div className="px-4 py-4 rounded-2xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-3.5 h-3.5" style={{ color: 'var(--ds-t3)' }} />
              <span className="text-[10.5px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--ds-t3)' }}>Greeter Status</span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Verfügbar', count: stats.greetersAvailable, dot: 'bg-green-500' },
                { label: 'Im Einsatz', count: stats.greetersBusy, dot: 'bg-blue-500' },
                { label: 'Pause', count: stats.greetersBreak, dot: 'bg-amber-400' },
              ].map(({ label, count, dot }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <span className="text-[12px]" style={{ color: 'var(--ds-t2)' }}>{label}</span>
                  </div>
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--ds-t1)' }}>{count}</span>
                </div>
              ))}
              {slaStatus.idleGreeterCount > 0 && (
                <div className="pt-2 flex items-center justify-between" style={{ borderTop: '1px solid rgba(245,158,11,0.25)' }}>
                  <span className="text-[11px] text-amber-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Untätig
                  </span>
                  <span className="text-[12px] font-semibold text-amber-500">{slaStatus.idleGreeterCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Zap className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ds-t2)' }}>Live Feed</span>
            {connectionStatus === 'connected' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse ml-0.5" />}
          </div>
          <div className="px-3 py-1 max-h-[560px] overflow-y-auto rounded-2xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            {activityFeed.length === 0 ? (
              <div className="text-center py-10 text-[12px]" style={{ color: 'var(--ds-t3)' }}>
                <Activity className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                Warte auf Events…
              </div>
            ) : (
              activityFeed.map(event => <ActivityItem key={event.id} event={event} />)
            )}
          </div>
        </div>

      </div>

      {/* GERMANY HEATMAP */}
      <section>
        <GermanyHeatmap missions={missions} selectedCity={cityFilter} onCitySelect={setCityFilter} />
      </section>

      {/* QUICK HOVER PREVIEW — kurzer Status-Blick; Klick auf die Karte öffnet die Mission */}
      <MissionHoverPreview data={hoverData} greetersMap={greetersMap} candidatesMap={candidatesMap} activityFeed={activityFeed} />

    </div>
  );
}
