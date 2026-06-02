import { useEffect, useState } from 'react';
import { LifeBuoy, Phone, PhoneCall, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/LangContext';
import { BottomSheet } from '@/components/ui';

const ACTIVE = ['assigned', 'accepted', 'on_the_way', 'arrived', 'met_talent', 'in_progress'];

/**
 * TalentSOS — always-available emergency action for talents (mounted in the talent shell).
 * Floating button → sheet with one-tap "call your greeter" (when assigned) + emergency 112.
 * Founder/support numbers are intentionally NOT shown here.
 */
export default function TalentSOS() {
  const { user } = useAuth();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [greeter, setGreeter] = useState(null);

  // Best-effort: resolve the active mission's greeter phone when the sheet opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const cid = user?.candidate_id;
        if (!cid) return;
        const ms = await base44.entities.Mission.filter({ candidate_id: cid });
        const m = ms.find((x) => ACTIVE.includes(x.status)) || ms[0];
        if (!m?.greeter_id) return;
        const g = await base44.entities.GreeterProfile.get(m.greeter_id);
        if (!cancelled) setGreeter(g);
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [open, user]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('sos.button')}
        className="fixed z-40 right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] sm:bottom-6 inline-flex items-center gap-2 px-4 h-12 rounded-full shadow-lg transition active:scale-95"
        style={{ background: '#dc2626', color: '#fff', boxShadow: '0 8px 24px rgba(220,38,38,.40)' }}
      >
        <LifeBuoy className="w-5 h-5" />
        <span className="text-[13.5px] font-semibold">{t('sos.button')}</span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={t('sos.title')} description={t('sos.sub')}>
        <div className="space-y-3">
          {greeter?.phone ? (
            <a
              href={`tel:${greeter.phone}`}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 transition active:scale-[0.99]"
              style={{ background: 'rgba(196,146,40,0.12)', border: '1px solid rgba(196,146,40,0.30)' }}
            >
              <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.18)', color: '#c49228' }}>
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold" style={{ color: 'var(--ds-t1)' }}>{t('sos.callGreeter')}</div>
                <div className="text-[12.5px] tabular-nums" style={{ color: 'var(--ds-t2)' }}>{greeter.full_name} · {greeter.phone}</div>
              </div>
            </a>
          ) : (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3.5" style={{ background: 'var(--ds-card-border)' }}>
              <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'var(--ds-card)', color: 'var(--ds-t3)' }}>
                <Phone className="w-5 h-5" />
              </div>
              <div className="text-[13px]" style={{ color: 'var(--ds-t2)' }}>{t('sos.noGreeter')}</div>
            </div>
          )}

          <a
            href="tel:112"
            className="flex items-center gap-3 rounded-xl px-4 py-3.5 transition active:scale-[0.99]"
            style={{ background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.35)' }}
          >
            <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: '#dc2626', color: '#fff' }}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-red-600 dark:text-red-400">{t('sos.emergency')}</div>
              <div className="text-[12px]" style={{ color: 'var(--ds-t3)' }}>{t('sos.emergencyHint')}</div>
            </div>
          </a>
        </div>
      </BottomSheet>
    </>
  );
}
