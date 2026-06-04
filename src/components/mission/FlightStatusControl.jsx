import { useState } from 'react';
import { Plane, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * FlightStatusControl — manual flight-delay flag (P2.1). Greeter/ops drives it (RLS lets a greeter
 * update their own mission); surfaced to the talent so nobody waits at the gate blind. Self-contained:
 * optimistic local state + Mission.update. The flight-tracker cron can also set flight_status='delayed'.
 */
export default function FlightStatusControl({ mission, canEdit = false }) {
  const [status, setStatus] = useState(mission.flight_status || null);
  const [note, setNote] = useState(mission.flight_delay_note || '');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const delayed = status === 'delayed';

  const save = async (next, nextNote = note) => {
    setBusy(true);
    const prev = status;
    setStatus(next); // optimistic
    try {
      await base44.entities.Mission.update(mission.id, { flight_status: next, flight_delay_note: next === 'delayed' ? (nextNote || null) : null });
      setEditing(false);
      if (next !== 'delayed') setNote('');
    } catch (e) {
      console.error(e);
      setStatus(prev); // revert
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-2 mt-1" style={{ borderTop: '1px dashed var(--ds-card-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--ds-t2)' }}>
          <Plane className="w-3.5 h-3.5" style={{ color: delayed ? '#dc2626' : '#c49228' }} />
          <span>Flugstatus:</span>
          <span className={`font-semibold ${delayed ? 'text-red-600 dark:text-red-400' : ''}`} style={delayed ? undefined : { color: 'var(--ds-t1)' }}>
            {delayed ? 'Verspätet' : status === 'landed' ? 'Gelandet' : 'Planmäßig'}
          </span>
        </div>
        {canEdit && !editing && (
          delayed
            ? <button onClick={() => save('on_time')} disabled={busy} className="text-[11.5px] font-medium px-2 py-1 rounded-md transition" style={{ color: 'var(--ds-t1)', background: 'var(--ds-card-border)' }}>Planmäßig</button>
            : <button onClick={() => setEditing(true)} className="text-[11.5px] font-medium px-2 py-1 rounded-md text-red-600 dark:text-red-400" style={{ background: 'rgba(220,38,38,0.10)' }}>Verspätung melden</button>
        )}
      </div>

      {delayed && note && !editing && (
        <div className="mt-1.5 text-[11.5px] flex items-start gap-1.5" style={{ color: 'var(--ds-t2)' }}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" /> {note}
        </div>
      )}

      {canEdit && editing && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z. B. +2 Std, neue Ankunft 16:30"
            className="flex-1 px-2.5 py-1.5 text-[12px] rounded-md"
            style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
          />
          <button onClick={() => save('delayed')} disabled={busy} className="w-8 h-8 grid place-items-center rounded-md bg-red-600 text-white disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
