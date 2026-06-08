import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/toaster';
import { uploadReceipt, getReceiptUrl } from '@/lib/storage';
import { Receipt, Plus, Check, X, Trash2, Paperclip } from 'lucide-react';

/**
 * Greeter pass-through expenses (Spesen/Tickets) per mission.
 * - Greeter mode (default): submit own out-of-pocket costs (ticket, transport, fee…), edit/delete
 *   while still "submitted". This is NOT the greeter's Honorar (mission.pay) — it's money the greeter
 *   fronted that we forward onto the company's invoice.
 * - Admin mode (managed): approve/reject. Approved expenses flow onto the company invoice for the
 *   mission via a DB trigger (recompute_invoice_expenses). Honorar stays company-hidden.
 *
 * Reuses the same base44 entity idiom as MissionServices; styled with --ds-* tokens so it renders in
 * both the greeter (mobile) and admin shells.
 */

const CATEGORIES = [
  { k: 'ticket', label: 'Ticket / Fahrkarte' },
  { k: 'transport', label: 'Transport / Taxi' },
  { k: 'fee', label: 'Amtsgebühr' },
  { k: 'material', label: 'Material' },
  { k: 'other', label: 'Sonstiges' },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.k, c.label]));
const STATUS = {
  submitted: { label: 'Eingereicht', bg: 'rgba(245,158,11,0.14)', color: '#b45309' },
  approved: { label: 'Freigegeben', bg: 'rgba(34,197,94,0.14)', color: '#16a34a' },
  rejected: { label: 'Abgelehnt', bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
};
const eur = (n) => `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default function MissionExpenses({ missionId, greeterId, managed = false }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [adding, setAdding] = useState(false);
  const [cat, setCat] = useState('ticket');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    base44.entities.MissionExpense.filter({ mission_id: missionId }, '-created_at')
      .then(setRows)
      .catch(() => setRows([]));
  useEffect(() => { if (missionId) load(); }, [missionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    const val = parseFloat(String(amount).replace(',', '.'));
    if (!val || val <= 0) { toast({ title: 'Betrag fehlt', description: 'Bitte einen gültigen Betrag eingeben.', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      // Best-effort receipt upload — never block the expense if the upload fails (e.g. storage policy
      // not deployed yet); the greeter can still submit amount + note.
      let receipt_url = null;
      if (file) {
        try { receipt_url = await uploadReceipt({ file, missionId }); }
        catch { toast({ title: 'Beleg nicht hochgeladen', description: 'Auslage wird ohne Beleg gespeichert.', variant: 'destructive' }); }
      }
      await base44.entities.MissionExpense.create({
        mission_id: missionId,
        greeter_id: greeterId || null,
        category: cat,
        amount: val,
        note: note.trim() || null,
        receipt_url,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        created_by: user?.email || null,
      });
      setAmount(''); setNote(''); setCat('ticket'); setFile(null); setAdding(false);
      toast({ title: '✓ Auslage eingereicht' });
      load();
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const openReceipt = async (row) => {
    try { const url = await getReceiptUrl(row.receipt_url); if (url) window.open(url, '_blank', 'noopener'); }
    catch (e) { toast({ title: 'Beleg nicht verfügbar', description: e?.message || String(e), variant: 'destructive' }); }
  };

  const decide = async (row, status) => {
    try {
      await base44.entities.MissionExpense.update(row.id, {
        status, decided_at: new Date().toISOString(), decided_by: user?.email || null,
      });
      toast({ title: status === 'approved' ? '✓ Freigegeben, auf der Rechnung' : 'Abgelehnt' });
      load();
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const remove = async (row) => {
    try { await base44.entities.MissionExpense.delete(row.id); load(); }
    catch (e) { toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' }); }
  };

  const approved = rows.filter((r) => r.status === 'approved').reduce((s, r) => s + Number(r.amount || 0), 0);
  const pending = rows.filter((r) => r.status === 'submitted').reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[9px] uppercase tracking-[0.12em] font-semibold inline-flex items-center gap-1.5" style={{ color: 'var(--ds-t3)' }}>
          <Receipt className="w-3 h-3" /> Auslagen / Spesen
        </div>
        {approved > 0 && (
          <span className="text-[11px] tabular-nums font-semibold" style={{ color: '#16a34a' }}>{eur(approved)} freigegeben</span>
        )}
      </div>

      {rows.length === 0 && !adding && (
        <div className="text-[12px] py-2" style={{ color: 'var(--ds-t3)' }}>
          {managed ? 'Noch keine Auslagen eingereicht.' : 'Tickets oder Auslagen, die du vorgestreckt hast, wir reichen sie an das Unternehmen weiter.'}
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-1.5">
          {rows.map((r) => {
            const st = STATUS[r.status] || STATUS.submitted;
            return (
              <div key={r.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium truncate" style={{ color: 'var(--ds-t1)' }}>
                    {CAT_LABEL[r.category] || r.category}
                    {r.note && <span className="font-normal" style={{ color: 'var(--ds-t3)' }}> · {r.note}</span>}
                  </div>
                  <span className="inline-block mt-0.5 text-[9.5px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
                <div className="text-[12.5px] font-semibold tabular-nums shrink-0" style={{ color: 'var(--ds-t1)' }}>{eur(r.amount)}</div>
                {r.receipt_url && (
                  <button onClick={() => openReceipt(r)} title="Beleg ansehen" className="w-7 h-7 grid place-items-center rounded-md shrink-0" style={{ background: 'rgba(196,146,40,0.10)', color: '#c49228' }}><Paperclip className="w-3.5 h-3.5" /></button>
                )}
                {managed && r.status === 'submitted' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => decide(r, 'approved')} title="Freigeben" className="w-7 h-7 grid place-items-center rounded-md" style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => decide(r, 'rejected')} title="Ablehnen" className="w-7 h-7 grid place-items-center rounded-md" style={{ background: 'rgba(239,68,68,0.10)', color: '#dc2626' }}><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                {!managed && r.status === 'submitted' && (
                  <button onClick={() => remove(r)} title="Entfernen" className="w-7 h-7 grid place-items-center rounded-md shrink-0" style={{ color: 'var(--ds-t3)' }}><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Greeter: add form. Admin doesn't create expenses (only the greeter who fronted the cost does). */}
      {!managed && (
        adding ? (
          <div className="mt-2 rounded-lg p-3 space-y-2" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <div className="flex gap-2">
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="flex-1 px-2.5 py-2 rounded-lg text-[13px]" style={{ background: 'var(--ds-input, var(--ds-card))', border: '1px solid var(--ds-input-border, var(--ds-card-border))', color: 'var(--ds-t1)' }}>
                {CATEGORIES.map((c) => <option key={c.k} value={c.k}>{c.label}</option>)}
              </select>
              <div className="relative w-28">
                <input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00"
                  className="w-full pl-2.5 pr-6 py-2 rounded-lg text-[13px] tabular-nums" style={{ background: 'var(--ds-input, var(--ds-card))', border: '1px solid var(--ds-input-border, var(--ds-card-border))', color: 'var(--ds-t1)' }} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: 'var(--ds-t3)' }}>€</span>
              </div>
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz (optional), z. B. Bahnticket DUS→Stadt"
              className="w-full px-2.5 py-2 rounded-lg text-[13px]" style={{ background: 'var(--ds-input, var(--ds-card))', border: '1px solid var(--ds-input-border, var(--ds-card-border))', color: 'var(--ds-t1)' }} />
            <label className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] cursor-pointer" style={{ background: 'var(--ds-input, var(--ds-card))', border: '1px solid var(--ds-input-border, var(--ds-card-border))', color: 'var(--ds-t2)' }}>
              <Paperclip className="w-3.5 h-3.5 shrink-0" style={{ color: '#c49228' }} />
              <span className="truncate">{file ? file.name : 'Beleg / Foto anhängen (optional)'}</span>
              <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <div className="flex gap-2">
              <button onClick={add} disabled={busy} className="flex-1 h-10 rounded-lg text-[13px] font-semibold" style={{ background: 'rgba(196,146,40,0.15)', color: '#c49228' }}>Einreichen</button>
              <button onClick={() => { setAdding(false); setAmount(''); setNote(''); setFile(null); }} className="px-4 h-10 rounded-lg text-[13px]" style={{ color: 'var(--ds-t3)' }}>Abbrechen</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: '#c49228' }}>
            <Plus className="w-3.5 h-3.5" /> Auslage hinzufügen
          </button>
        )
      )}

      {managed && pending > 0 && (
        <div className="mt-2 text-[11px]" style={{ color: 'var(--ds-t3)' }}>{eur(pending)} warten auf Freigabe, freigegebene Auslagen erscheinen auf der Unternehmens-Rechnung.</div>
      )}
    </div>
  );
}
