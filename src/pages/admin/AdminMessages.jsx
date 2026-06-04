import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRealtimeMessages } from '@/lib/useRealtimeMessages';
import { relativeTime, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';
import { Send, MessageSquare, CheckCheck } from 'lucide-react';

export default function AdminMessages() {
  const { user } = useAuth();
  const { data: allMissions = [] } = useQuery({
    queryKey: ['missions'],
    queryFn: () => base44.entities.Mission.list('-created_at'),
  });

  // Data isolation: also mounted on /company/messages — a company only sees its own missions' threads.
  const isCompany = user?.role === 'company';
  const missions = isCompany
    ? (user?.company_id ? allMissions.filter((m) => m.company_id === user.company_id) : [])
    : allMissions;

  const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (selected && !missions.some((m) => m.id === selected)) { setSelected(null); return; }
    if (!selected && missions[0]) setSelected(missions[0].id);
  }, [missions, selected]);

  const { thread, unreadByMission, totalUnread, markRead, send } = useRealtimeMessages({ missionId: selected });

  // Auto-Mark-Read sobald Thread sichtbar
  useEffect(() => { if (selected) markRead(selected); }, [selected, thread.length, markRead]);

  const [text, setText] = useState('');
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread.length]);

  const onSend = async (e) => {
    e?.preventDefault();
    if (!text.trim() || !selected) return;
    await send({ content: text, missionId: selected, receiverId: 'all' });
    setText('');
  };

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold" style={{ color: 'var(--ds-t1)' }}>Nachrichten</h1>
          <p className="text-sm text-[var(--mid)] mt-1.5">Mission-bezogene Konversationen — live</p>
        </div>
        {totalUnread > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(196,146,40,0.15)', color: '#c49228' }}>
            {totalUnread} ungelesen
          </span>
        )}
      </div>

      <div className="flex-1 grid md:grid-cols-[300px_1fr] gap-4 min-h-0">
        <div className="rounded-xl overflow-y-auto" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          {missions.map((m) => {
            const unread = unreadByMission[m.id] || 0;
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className="w-full text-left px-4 py-3 transition"
                style={{
                  borderBottom: '1px solid var(--ds-card-border)',
                  background: selected === m.id ? 'rgba(196,146,40,0.06)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (selected !== m.id) e.currentTarget.style.background = 'rgba(196,146,40,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = selected === m.id ? 'rgba(196,146,40,0.06)' : 'transparent'; }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--ds-t1)' }}>{m.title}</div>
                  {unread > 0 && <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-navy text-cream text-[10px] font-bold grid place-items-center">{unread}</span>}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`badge ${STATUS_COLORS[m.status]}`}>{STATUS_LABELS[m.status]}</span>
                  <span className="text-[11px] text-[var(--light)]">{m.city}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl flex flex-col min-h-0" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          {selected ? (
            <>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--ds-card-border)' }}>
                <div className="text-xs" style={{ color: 'var(--ds-t2)' }}>Konversation zu</div>
                <div className="font-semibold text-sm" style={{ color: 'var(--ds-t1)' }}>{missions.find((m) => m.id === selected)?.title}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {thread.length === 0 && <div className="text-center text-sm text-[var(--mid)] py-12">Noch keine Nachrichten</div>}
                {thread.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`max-w-md ${mine ? 'ml-auto text-right' : ''}`}>
                      <div className={`flex items-baseline gap-2 mb-1 ${mine ? 'justify-end' : ''}`}>
                        <span className="text-xs font-semibold" style={{ color: 'var(--ds-t1)' }}>{m.sender_name}</span>
                        <span className="text-[11px] text-[var(--light)]">{relativeTime(m.timestamp)}</span>
                      </div>
                      <div className={`inline-block rounded-lg px-3.5 py-2.5 text-sm ${mine ? 'bg-navy text-cream' : ''}`}
                        style={!mine ? { background: 'var(--ds-card-border)', color: 'var(--ds-t1)' } : {}}>
                        {m.content}
                      </div>
                      {mine && m.read && <div className="text-[10px] text-[var(--light)] mt-0.5 inline-flex items-center gap-1"><CheckCheck className="w-3 h-3" /> gelesen</div>}
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              <form onSubmit={onSend} className="p-3 flex gap-2" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nachricht schreiben…" className="flex-1 px-3.5 py-2 rounded-md text-sm focus:outline-none"
                  style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }} />
                <button type="submit" className="btn-primary inline-flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> Senden</button>
              </form>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-[var(--mid)]">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-cream-3" />
                <div className="text-sm">Wähle eine Mission</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
