import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useRealtimeMessages } from '@/lib/useRealtimeMessages';
import { relativeTime } from '@/lib/utils';
import { Phone, Mail, MapPin, Star, MessageSquare, Languages, Send, CheckCheck } from 'lucide-react';

export default function TalentGreeter() {
  const { user } = useAuth();
  const [greeter, setGreeter] = useState(null);
  const [mission, setMission] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const cid = user?.candidate_id || 'ca1';
    base44.entities.Mission.filter({ candidate_id: cid }).then(async (ms) => {
      const m = ms[0];
      if (!m?.greeter_id) return;
      setMission(m);
      const g = await base44.entities.GreeterProfile.get(m.greeter_id);
      setGreeter(g);
    });
  }, [user]);

  const { thread, markRead, send } = useRealtimeMessages({ missionId: mission?.id });
  useEffect(() => { if (mission?.id) markRead(mission.id); }, [mission?.id, thread.length, markRead]);

  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread.length]);

  if (!greeter) {
    return (
      <div className="max-w-2xl">
        <div className="mb-2 text-[11px] uppercase tracking-widest text-gold font-bold">Mein Greeter</div>
        <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ds-t1)' }}>Greeter wird gematcht…</h1>
        <p className="mt-2 text-[14px]" style={{ color: 'var(--ds-t2)' }}>
          Wir suchen die passende Person für dich. Du wirst informiert, sobald der Match steht.
        </p>
      </div>
    );
  }

  const onSend = async () => {
    if (!msg.trim() || !mission) return;
    await send({ content: msg, missionId: mission.id, receiverId: greeter?.user_id });
    setMsg('');
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-2 text-[11px] uppercase tracking-widest text-gold font-bold">Mein Greeter</div>
      <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ds-t1)' }}>Dein Greeter in {greeter.city}.</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--ds-t2)' }}>
        Das ist deine feste Bezugsperson für die ersten Wochen.
      </p>

      <div className="mt-8 rounded-2xl p-7" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full grid place-items-center flex-shrink-0" style={{ background: 'rgba(196,146,40,0.15)' }}>
            <span className="font-serif text-3xl font-bold" style={{ color: '#c49228' }}>{greeter.full_name?.[0]}</span>
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--ds-t1)' }}>{greeter.full_name}</h2>
            <div className="flex items-center gap-3 mt-2 text-[12.5px]" style={{ color: 'var(--ds-t2)' }}>
              <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {greeter.city}</span>
              <span className="inline-flex items-center gap-1"><Star className="w-3 h-3" style={{ color: '#c49228' }} /> {greeter.rating}</span>
              <span>· {greeter.completed_missions} Einsätze</span>
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--ds-t1)' }}>
              <Languages className="w-3.5 h-3.5" style={{ color: '#c49228' }} />
              {greeter.languages?.join(' · ')}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 grid sm:grid-cols-2 gap-3" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
          <a href={`mailto:${greeter.email}`} className="rounded-xl p-4 flex items-center gap-3 transition" style={{ background: 'var(--ds-card-border)' }}>
            <Mail className="w-4 h-4" style={{ color: '#c49228' }} />
            <div>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--ds-t3)' }}>E-Mail</div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--ds-t1)' }}>{greeter.email}</div>
            </div>
          </a>
          <a href="tel:+498912345" className="rounded-xl p-4 flex items-center gap-3 transition" style={{ background: 'var(--ds-card-border)' }}>
            <Phone className="w-4 h-4" style={{ color: '#c49228' }} />
            <div>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--ds-t3)' }}>Telefon</div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--ds-t1)' }}>In-App-Chat bevorzugt</div>
            </div>
          </a>
        </div>

        {/* Live-Chat-Thread */}
        <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
          <div className="text-[11px] uppercase tracking-widest font-bold mb-3 inline-flex items-center gap-1.5" style={{ color: 'var(--ds-t2)' }}>
            <MessageSquare className="w-3 h-3" /> Konversation
          </div>
          <div className="rounded-xl p-4 max-h-72 overflow-y-auto space-y-3 bg-black/[0.05] dark:bg-white/[0.04]">
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
                      : { background: 'var(--ds-card)', color: 'var(--ds-t1)', border: '1px solid var(--ds-card-border)' }
                    }
                  >
                    {m.content}
                  </div>
                  {mine && m.read && <div className="text-[10px] mt-0.5 inline-flex items-center gap-1" style={{ color: 'var(--ds-t3)' }}><CheckCheck className="w-2.5 h-2.5" /> gelesen</div>}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <div className="mt-3 flex gap-2">
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder="Schreib deinem Greeter…"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                      className="flex-1 px-3 py-2 rounded-lg text-[13px] focus:outline-none transition"
                      style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }} />
            <button onClick={onSend} disabled={!msg.trim()}
                    className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
              <Send className="w-3.5 h-3.5" /> Senden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
