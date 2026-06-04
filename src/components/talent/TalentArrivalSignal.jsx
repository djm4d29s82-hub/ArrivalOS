import { useState } from 'react';
import { PlaneLanding, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/LangContext';

// Stages where "I've landed" is still meaningful (greeter not yet physically with the talent).
const PRE_MEETING = ['assigned', 'accepted', 'eta_sent', 'on_the_way'];

/**
 * TalentArrivalSignal — the optional "Ich bin gelandet" action (P1.6).
 * Greeter-driven model: the talent only *signals* (posts a real message + best-effort notification);
 * the greeter's "Talent ist da" stays the authoritative state. Safe under RLS (a talent may insert
 * their own messages). Self-hides once the greeter has met the talent, or after the signal is sent.
 */
export default function TalentArrivalSignal({ mission, greeter, user }) {
  const { t } = useLang();
  const flagKey = mission ? `arrived-signal-${mission.id}` : null;
  const [sent, setSent] = useState(() => (flagKey ? localStorage.getItem(flagKey) === '1' : false));
  const [busy, setBusy] = useState(false);

  if (!mission || !greeter) return null;
  if (!PRE_MEETING.includes(mission.status)) return null;

  const send = async () => {
    setBusy(true);
    try {
      await base44.entities.Message.create({
        sender_id: user?.id || 'talent',
        sender_name: user?.full_name || 'Talent',
        receiver_id: greeter.user_id || 'all',
        mission_id: mission.id,
        content: '✈️ ' + t('arrival.message'),
        read: false,
        timestamp: new Date().toISOString(),
      });
      try {
        if (greeter.email) {
          await base44.entities.Notification.create({
            user_email: greeter.email,
            title: t('arrival.signal'),
            message: `${user?.full_name || 'Talent'}: ${t('arrival.message')}`,
            type: 'action',
            link: `/greeter-dashboard/missions/${mission.id}`,
            read: false,
          });
        }
      } catch { /* notification best-effort (RLS may block) */ }
      if (flagKey) localStorage.setItem(flagKey, '1');
      setSent(true);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)' }}>
        <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#15803d' }} />
        <div className="text-[13px]" style={{ color: 'var(--ds-t1)' }}>{t('arrival.sent')}</div>
      </div>
    );
  }

  return (
    <button
      onClick={send}
      disabled={busy}
      className="w-full rounded-2xl px-5 py-4 flex items-center gap-3 text-left transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
      style={{ background: 'var(--navy)', color: 'var(--cream, #F4EFE6)' }}
    >
      <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
        {busy ? <Loader2 className="w-5 h-5 animate-spin text-gold" /> : <PlaneLanding className="w-5 h-5 text-gold" />}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-[15px] text-cream">{t('arrival.signal')}</div>
        <div className="text-[12px] text-cream/70">{t('arrival.signalSub')}</div>
      </div>
    </button>
  );
}
