import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, ChevronRight, Calendar, Languages, Navigation, Banknote } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, Avatar, Pill, StatusPill, EmptyState, SkeletonCard } from '@/components/ui';
import { getStatusLabel } from '@/lib/missionStateMachine';

const TABS = [
  { key: 'new', label: 'Anfragen' },
  { key: 'active', label: 'Aktiv' },
  { key: 'done', label: 'Erledigt' },
];

export default function GreeterMissions() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('active');

  useEffect(() => {
    if (user?.email) base44.entities.GreeterProfile.filter({ email: user.email }).then((p) => setProfile(p[0]));
  }, [user?.email]);

  const { data: missions = [], isLoading } = useQuery({ queryKey: ['missions'], queryFn: () => base44.entities.Mission.list('-datetime') });
  const { data: candidates = [] } = useQuery({ queryKey: ['candidates'], queryFn: () => base44.entities.Candidate.list() });

  if (!profile) return <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>;

  // Phase E: 'assigned' is the new entry point (replaces 'matched'); keep 'matched' for legacy seed data
  const newRequests = missions.filter((m) =>
    (m.status === 'assigned' && m.greeter_id === profile.id) ||
    (m.status === 'matched' && m.matched_greeters?.includes(profile.id))
  );
  const mine = missions.filter((m) => m.greeter_id === profile.id);
  const active = mine.filter((m) => ['accepted', 'on_the_way', 'arrived', 'met_talent', 'in_progress'].includes(m.status));
  const done = mine.filter((m) => ['completed', 'cancelled'].includes(m.status));

  const lists = { new: newRequests, active, done };
  const list = lists[tab];

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-gold font-bold mb-1.5">Greeter · Workflow</div>
        <h1 className="font-serif text-[24px] leading-tight font-bold" style={{ color: 'var(--ds-t1)' }}>Meine Einsätze</h1>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        {TABS.map((t) => {
          const count = lists[t.key].length;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-2 rounded-lg text-[12.5px] font-medium transition flex items-center justify-center gap-1.5 ${isActive ? 'bg-navy text-cream' : ''}`}
              style={!isActive ? { color: 'var(--ds-t2)' } : undefined}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={`tabular-nums text-[10.5px] px-1.5 rounded-full ${isActive ? 'bg-cream/20 text-cream' : ''}`}
                  style={!isActive ? { background: 'var(--ds-card-border)', color: 'var(--ds-t3)' } : undefined}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
      ) : list.length === 0 ? (
        <Card variant="flat">
          <EmptyState
            icon={tab === 'new' ? Briefcase : tab === 'active' ? Calendar : Briefcase}
            title={
              tab === 'new' ? 'Keine offenen Anfragen' :
              tab === 'active' ? 'Keine aktiven Einsätze' :
              'Noch keine abgeschlossenen Einsätze'
            }
            description={tab === 'new' ? 'Wir benachrichtigen dich, sobald eine neue Mission zu deinem Profil passt.' : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((m) => <MissionRow key={m.id} mission={m} candidates={candidates} profile={profile} isOffer={tab === 'new'} />)}
        </div>
      )}
    </div>
  );
}

const PROGRESS_CFG = {
  assigned:    10,
  accepted:    20,
  on_the_way:  40,
  arrived:     60,
  met_talent:  75,
  in_progress: 85,
  completed:   100,
  cancelled:   0,
};

function MissionRow({ mission, candidates, profile, isOffer }) {
  const candidate = candidates.find((c) => c.id === mission.candidate_id);
  const stage = mission.greeter_stage;
  const isDone = ['completed', 'cancelled'].includes(mission.status);
  // Offer-decision factors: pay · required language (does the greeter speak it?) · distance.
  const reqLangs = mission.requirements?.languages || [];
  const speaksAll = reqLangs.length > 0 && reqLangs.every((l) => (profile?.languages || []).includes(l));
  const dist = distanceLabel(profile?.city, mission.city);
  return (
    <Link
      to={`/greeter-dashboard/missions/${mission.id}`}
      className="block rounded-xl overflow-hidden transition-all"
      style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(196,146,40,0.28)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ds-card-border)'; }}
    >
      <div className="flex">
        <div
          className="w-16 flex flex-col items-center justify-center py-3.5 shrink-0 border-r"
          style={{ background: 'rgba(196,146,40,0.08)', borderColor: 'var(--ds-card-border)' }}
        >
          <div className="text-[9.5px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ds-t3)' }}>{dayShort(mission.datetime)}</div>
          <div className="font-serif text-xl font-bold tabular-nums leading-none mt-0.5" style={{ color: '#c49228' }}>{dayOf(mission.datetime)}</div>
          <div className="text-[10.5px] tabular-nums mt-0.5" style={{ color: 'var(--ds-t2)' }}>{timeOf(mission.datetime)}</div>
        </div>
        <div className="flex-1 p-3.5 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-semibold text-[14px] leading-tight truncate" style={{ color: 'var(--ds-t1)' }}>{mission.title}</div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isDone && mission.pay && (
                <span className="text-[11px] font-bold tabular-nums" style={{ color: '#c49228' }}>{mission.pay} €</span>
              )}
              <StatusPill status={mission.status} size="xs" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] mb-1.5" style={{ color: 'var(--ds-t3)' }}>
            <MapPin className="w-3 h-3" style={{ color: '#c49228' }} />
            <span className="truncate">{mission.location || mission.city}</span>
          </div>
          <div className="flex items-center gap-2">
            {candidate && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Avatar name={candidate.full_name} size="xs" />
                <span className="text-[12px] font-medium truncate" style={{ color: 'var(--ds-t1)' }}>{candidate.full_name}</span>
              </div>
            )}
            {stage && stage !== 'completed' && (
              <Pill tone="gold" size="xs">{getStatusLabel(stage) || stage}</Pill>
            )}
          </div>

          {/* Offer-decision factors — Pay · Sprache · Distanz */}
          {isOffer && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 pt-2.5 text-[11.5px]" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
              {mission.pay != null && (
                <span className="inline-flex items-center gap-1 font-bold" style={{ color: '#c49228' }}>
                  <Banknote className="w-3.5 h-3.5" /> {mission.pay} €
                </span>
              )}
              {reqLangs.length > 0 && (
                <span className="inline-flex items-center gap-1" style={{ color: speaksAll ? '#16a34a' : 'var(--ds-t2)' }}>
                  <Languages className="w-3.5 h-3.5" /> {reqLangs.join(', ')}{speaksAll ? ' ✓' : ''}
                </span>
              )}
              {dist && (
                <span className="inline-flex items-center gap-1" style={{ color: 'var(--ds-t2)' }}>
                  <Navigation className="w-3.5 h-3.5" /> {dist}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="grid place-items-center pr-3 shrink-0">
          <ChevronRight className="w-4 h-4" style={{ color: 'var(--ds-t3)' }} />
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-[3px]" style={{ background: 'var(--ds-card-border)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${PROGRESS_CFG[mission.status] ?? 0}%`,
            background: mission.status === 'cancelled' ? 'transparent' : 'linear-gradient(90deg, #c49228, #d4a83a)',
          }}
        />
      </div>
    </Link>
  );
}

// helpers
// Grobe Distanz zwischen Greeter-Stadt und Missions-Stadt (Haversine, gerundet).
// Gleiche Stadt → "in deiner Stadt"; unbekannte Stadt → null (dann nur Stadtname auf der Karte).
const DE_CITY_LATLNG = {
  'Berlin': [52.52, 13.405], 'München': [48.137, 11.575], 'Hamburg': [53.551, 9.993],
  'Köln': [50.937, 6.96], 'Frankfurt': [50.11, 8.682], 'Stuttgart': [48.775, 9.182],
  'Düsseldorf': [51.227, 6.773], 'Leipzig': [51.34, 12.375], 'Ingolstadt': [48.766, 11.425],
  'Wuppertal': [51.256, 7.15], 'Dortmund': [51.514, 7.466], 'Hannover': [52.376, 9.718],
  'Nürnberg': [49.452, 11.077], 'Bremen': [53.079, 8.802], 'Dresden': [51.05, 13.737],
};
function distanceLabel(fromCity, toCity) {
  if (!toCity) return null;
  if (fromCity && fromCity === toCity) return 'in deiner Stadt';
  const a = DE_CITY_LATLNG[fromCity]; const b = DE_CITY_LATLNG[toCity];
  if (!a || !b) return null;
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  const km = Math.round((2 * R * Math.asin(Math.sqrt(h))) / 10) * 10;
  return `~${km} km`;
}
function timeOf(iso) { return iso ? new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—'; }
function dayOf(iso) { return iso ? String(new Date(iso).getDate()).padStart(2, '0') : '—'; }
function dayShort(iso) { return iso ? new Date(iso).toLocaleDateString('de-DE', { weekday: 'short' }) : ''; }
