import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/toaster';
import { formatDate } from '@/lib/utils';
import { Wallet, CheckCircle2, Clock, FileSignature, Loader2 } from 'lucide-react';

const PO_STATUS = {
  pending: { label: 'Offen', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  paid:    { label: 'Ausgezahlt', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  cancelled: { label: 'Storniert', cls: 'bg-red-500/15 text-red-700 dark:text-red-400' },
};

/**
 * GreeterEarnings — freelancer payout + contract (P1.4, mission-based).
 * Per completed mission a payout row is created server-side (amount = mission.pay). The greeter
 * sees their earnings, enters bank/tax details, and accepts the freelancer agreement.
 */
export default function GreeterEarnings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [missionTitles, setMissionTitles] = useState({});
  const [form, setForm] = useState({ iban: '', tax_id: '', payout_address: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      try {
        const ps = await base44.entities.GreeterProfile.filter({ email: user.email });
        const pr = ps?.[0] || null;
        setProfile(pr);
        if (pr) {
          setForm({ iban: pr.iban || '', tax_id: pr.tax_id || '', payout_address: pr.payout_address || '' });
          try {
            const po = await base44.entities.Payout.filter({ greeter_id: pr.id });
            setPayouts(Array.isArray(po) ? po : []);
          } catch { /* migration optional */ }
          try {
            const ms = await base44.entities.Mission.filter({ greeter_id: pr.id });
            setMissionTitles(Object.fromEntries((ms || []).map((m) => [m.id, m.title])));
          } catch { /* best-effort */ }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.email]);

  const sum = (st) => payouts.filter((p) => p.status === st).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const pendingTotal = sum('pending');
  const paidTotal = sum('paid');

  const saveBank = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await base44.entities.GreeterProfile.update(profile.id, { ...form });
      setProfile((p) => ({ ...p, ...form }));
      toast({ title: 'Bankdaten gespeichert' });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const acceptContract = async () => {
    if (!profile) return;
    try {
      await base44.entities.GreeterProfile.update(profile.id, { contract_status: 'accepted' });
      setProfile((p) => ({ ...p, contract_status: 'accepted' }));
      toast({ title: 'Vertrag akzeptiert' });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-8 text-sm" style={{ color: 'var(--ds-t2)' }}>Laden…</div>;
  if (!profile) return <div className="p-8 text-sm" style={{ color: 'var(--ds-t2)' }}>Kein Greeter-Profil gefunden.</div>;

  const accepted = profile.contract_status === 'accepted';
  const fld = 'w-full px-3 py-2.5 text-[13px] rounded-lg';
  const fldStyle = { background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold" style={{ color: 'var(--ds-t1)' }}>Verdienst</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--ds-t2)' }}>Deine Honorare pro abgeschlossenem Einsatz, Bankdaten und Vertrag.</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ds-t3)' }}><Clock className="w-3.5 h-3.5" /> Offen</div>
          <div className="font-serif text-2xl font-bold mt-1" style={{ color: 'var(--ds-t1)' }}>{pendingTotal.toLocaleString('de-DE')} €</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-semibold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Ausgezahlt</div>
          <div className="font-serif text-2xl font-bold mt-1" style={{ color: 'var(--ds-t1)' }}>{paidTotal.toLocaleString('de-DE')} €</div>
        </div>
      </div>

      {/* Contract */}
      {!accepted && (
        <div className="rounded-xl p-5 flex items-start gap-3" style={{ background: 'rgba(196,146,40,0.07)', border: '1px solid rgba(196,146,40,0.25)' }}>
          <FileSignature className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-sm" style={{ color: 'var(--ds-t1)' }}>Freelancer-Vereinbarung</div>
            <p className="text-xs mt-1" style={{ color: 'var(--ds-t2)' }}>
              Greeter sind selbstständig tätig (Honorarbasis). Bitte bestätige die Zusammenarbeit als Freelancer,
              bevor Auszahlungen erfolgen.
            </p>
            <button onClick={acceptContract} className="mt-3 px-4 py-2 bg-navy text-cream rounded-md text-xs font-semibold hover:bg-navy/90 transition">
              Als Freelancer bestätigen
            </button>
          </div>
        </div>
      )}
      {accepted && (
        <div className="rounded-lg px-4 py-2.5 text-[12.5px] inline-flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.10)', color: '#15803d' }}>
          <CheckCircle2 className="w-4 h-4" /> Freelancer-Vereinbarung akzeptiert
        </div>
      )}

      {/* Bank / tax */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <div className="font-semibold text-sm" style={{ color: 'var(--ds-t1)' }}>Bank- & Steuerdaten</div>
        <div>
          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--ds-t2)' }}>IBAN</label>
          <input className={fld} style={fldStyle} value={form.iban} onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))} placeholder="DE.." />
        </div>
        <div>
          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--ds-t2)' }}>Steuernummer / USt-IdNr</label>
          <input className={fld} style={fldStyle} value={form.tax_id} onChange={(e) => setForm((f) => ({ ...f, tax_id: e.target.value }))} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--ds-t2)' }}>Anschrift</label>
          <input className={fld} style={fldStyle} value={form.payout_address} onChange={(e) => setForm((f) => ({ ...f, payout_address: e.target.value }))} />
        </div>
        <button onClick={saveBank} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-cream rounded-md text-xs font-semibold hover:bg-navy/90 transition disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Speichern
        </button>
      </div>

      {/* Payout list */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <div className="px-5 py-3 font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--ds-t1)', borderBottom: '1px solid var(--ds-card-border)' }}>
          <Wallet className="w-4 h-4 text-gold" /> Honorare
        </div>
        {payouts.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--ds-t2)' }}>Noch keine Honorare — sie entstehen, sobald ein Einsatz abgeschlossen ist.</div>
        ) : (
          <ul>
            {payouts.map((p) => {
              const st = PO_STATUS[p.status] || PO_STATUS.pending;
              return (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium truncate" style={{ color: 'var(--ds-t1)' }}>{missionTitles[p.mission_id] || 'Einsatz'}</div>
                    <div className="text-[11.5px]" style={{ color: 'var(--ds-t3)' }}>{formatDate(p.created_at)}</div>
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--ds-t1)' }}>{Number(p.amount || 0).toLocaleString('de-DE')} €</span>
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
