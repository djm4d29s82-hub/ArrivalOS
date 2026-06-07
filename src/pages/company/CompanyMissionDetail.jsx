import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, CheckCircle2, Circle, Phone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { cancelMission as cancelMissionSafe } from '@/api';
import { useToast } from '@/components/ui/toaster';
import { formatDateTime, relativeTime } from '@/lib/utils';
import { SectionHeader, Avatar, Button, Input, SkeletonCard } from '@/components/ui';
import MissionKernel from '@/components/mission/MissionKernel';
import MissionServices from '@/components/mission/MissionServices';
import { companyKernel, missionProgress } from '@/lib/missionKernel';

export default function CompanyMissionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [mission, setMission] = useState(null);
  const [steps, setSteps] = useState([]);
  const [messages, setMessages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [greeter, setGreeter] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  const reload = async () => {
    const m = await base44.entities.Mission.get(id);
    setMission(m);
    const s = await base44.entities.JourneyStep.filter({ mission_id: id });
    setSteps(s.sort((a, b) => a.order - b.order));
    const msgs = await base44.entities.Message.filter({ mission_id: id }, 'timestamp');
    setMessages(msgs);
    setLogs(await base44.entities.ActivityLog.filter({ entity_id: id }, '-timestamp'));
    setGreeter(m?.greeter_id ? await base44.entities.GreeterProfile.get(m.greeter_id) : null);
    setCandidate(m?.candidate_id ? await base44.entities.Candidate.get(m.candidate_id) : null);
    setLoading(false);
  };

  useEffect(() => { setLoading(true); reload(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  if (loading) return <div className="space-y-3 max-w-3xl"><SkeletonCard /><SkeletonCard /></div>;
  if (!mission) return <div className="max-w-3xl text-sm" style={{ color: 'var(--ds-t2)' }}>Mission nicht gefunden.</div>;

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    await base44.entities.Message.create({
      sender_id: user?.id || 'company',
      sender_name: user?.full_name || 'Unternehmen',
      receiver_id: mission.greeter_id || 'all',
      mission_id: id,
      content: text.trim(),
      read: false,
      timestamp: new Date().toISOString(),
    });
    setText('');
    reload();
    qc.invalidateQueries({ queryKey: ['messages'] });
  };

  const onCancel = async () => {
    if (!confirm('Mission wirklich stornieren?')) return;
    await cancelMissionSafe({ mission, role: user?.role || 'company', actor: user?.email || 'company', base44 });
    toast({ title: 'Mission storniert' });
    qc.invalidateQueries();
    reload();
  };

  const done = steps.filter((s) => s.status === 'completed').length;
  const k = companyKernel(mission, { greeter, candidate, steps });
  const prog = missionProgress(mission, steps);

  return (
    <div className="max-w-3xl space-y-5 pb-12">
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1.5 text-[12.5px] transition hover:opacity-70" style={{ color: 'var(--ds-t2)' }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Zurück
      </button>

      {/* STATE · NEXT · BLOCKERS · Dringlichkeit auf einen Blick */}
      <MissionKernel
        eyebrow={mission.title}
        statement={k.statement}
        next={k.next}
        progress={prog.total ? { index: prog.index, total: prog.total } : undefined}
        blockers={k.blockers}
        priority={k.priority}
      />

      {logs[0] && (
        <div className="flex items-center gap-2 text-[12px] px-1" style={{ color: 'var(--ds-t3)' }}>
          <span className="text-[10px] uppercase tracking-[0.12em] font-semibold shrink-0">Zuletzt</span>
          <span className="truncate" style={{ color: 'var(--ds-t2)' }}>{logs[0].description} · {relativeTime(logs[0].timestamp)}</span>
        </div>
      )}

      {/* Keine Greeter-Vergütung (mission.pay) für den Kunden — das ist unsere Kostenseite.
          Der Kunde sieht seine Kosten als Paketpreis unter „Rechnungen". */}
      <div className="grid md:grid-cols-2 gap-3 text-[12.5px]">
        <Info label="Ort" value={`${mission.location || '—'}, ${mission.city}`} />
        <Info label="Termin" value={formatDateTime(mission.datetime)} />
      </div>

      {greeter && (
        <div className="p-4 flex items-center gap-3 rounded-xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <Avatar name={greeter.full_name} size="md" ringed />
          <div className="flex-1 min-w-0">
            <div className="text-[10.5px] uppercase tracking-widest font-bold mb-0.5" style={{ color: '#c49228' }}>Greeter</div>
            <div className="font-semibold" style={{ color: 'var(--ds-t1)' }}>{greeter.full_name}</div>
            <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>{greeter.city} · ★ {greeter.rating?.toFixed(1) || '—'}</div>
          </div>
          {greeter.phone && (
            <a href={`tel:${greeter.phone}`} className="grid place-items-center w-9 h-9 rounded-lg transition" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)', color: 'var(--ds-t1)' }}>
              <Phone className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {candidate && (
        <div className="p-4 flex items-center gap-3 rounded-xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <Avatar name={candidate.full_name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="text-[10.5px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: 'var(--ds-t3)' }}>Talent</div>
            <div className="font-semibold" style={{ color: 'var(--ds-t1)' }}>{candidate.full_name}</div>
            <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>{candidate.country_of_origin} · {candidate.languages?.join(', ')}</div>
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <div>
          <SectionHeader title="Onboarding-Fortschritt" count={`${done}/${steps.length}`} />
          <ul className="space-y-1.5">
            {steps.map((s) => (
              <li key={s.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
                {s.status === 'completed'
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  : <Circle className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--ds-t3)' }} />}
                <span className="text-[12.5px]" style={{ color: s.status === 'completed' ? 'var(--ds-t3)' : 'var(--ds-t1)', textDecoration: s.status === 'completed' ? 'line-through' : 'none' }}>{s.title}</span>
                {s.completed_at && <span className="ml-auto text-[10.5px] tabular-nums" style={{ color: 'var(--ds-t3)' }}>{relativeTime(s.completed_at)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <SectionHeader title="Services" />
        <div className="mt-1">
          <MissionServices missionId={mission.id} />
        </div>
      </div>

      <div>
        <SectionHeader title="Nachrichten" count={messages.length || undefined} />
        <div className="p-3 space-y-2 max-h-64 overflow-y-auto rounded-xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          {messages.length === 0 && <div className="text-[12px] text-center py-6" style={{ color: 'var(--ds-t2)' }}>Noch keine Nachrichten</div>}
          {messages.map((m) => (
            <div key={m.id} className="rounded-lg px-3 py-2" style={{ background: 'rgba(196,146,40,0.06)', border: '1px solid var(--ds-card-border)' }}>
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--ds-t1)' }}>{m.sender_name}</span>
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--ds-t3)' }}>{relativeTime(m.timestamp)}</span>
              </div>
              <div className="text-[12.5px]" style={{ color: 'var(--ds-t1)' }}>{m.content}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 mt-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nachricht schreiben…" className="flex-1" />
          <Button type="submit" variant="primary" icon={Send}>Senden</Button>
        </form>
      </div>

      {!['completed', 'cancelled'].includes(mission.status) && (
        <div className="flex justify-end pt-2">
          <Button variant="ghost" className="!text-red-700 hover:!bg-red-500/10" onClick={onCancel}>Mission stornieren</Button>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
      <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ds-t3)' }}>{label}</div>
      <div className="text-[13px] font-medium mt-0.5" style={{ color: 'var(--ds-t1)' }}>{value}</div>
    </div>
  );
}
