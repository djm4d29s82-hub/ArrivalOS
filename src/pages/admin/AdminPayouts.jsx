import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toaster';

const STATUS = {
  pending:   'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  paid:      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  cancelled: 'bg-red-500/15 text-red-700 dark:text-red-400',
};
const LABEL = { pending: 'Offen', paid: 'Ausgezahlt', cancelled: 'Storniert' };

/**
 * AdminPayouts — mission-based greeter payouts. Ops marks them as paid once the bank transfer ran.
 * (Records are created server-side on mission completion; this is the manual "ausgezahlt" step v1.)
 */
export default function AdminPayouts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: payouts = [] } = useQuery({ queryKey: ['payouts'], queryFn: () => base44.entities.Payout.list('-created_at').catch(() => []) });
  const { data: greeters = [] } = useQuery({ queryKey: ['greeters'], queryFn: () => base44.entities.GreeterProfile.list() });

  const greeterName = (id) => greeters.find((g) => g.id === id)?.full_name || '—';

  const markPaid = async (po) => {
    await base44.entities.Payout.update(po.id, { status: 'paid', paid_at: new Date().toISOString() });
    toast({ title: 'Honorar ausgezahlt markiert', description: `${po.amount} €` });
    qc.invalidateQueries({ queryKey: ['payouts'] });
  };

  const pending = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const paid = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold" style={{ color: 'var(--ds-t1)' }}>Greeter-Auszahlungen</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--ds-t2)' }}>
          Offen: <span className="font-semibold" style={{ color: 'var(--ds-t1)' }}>{pending.toLocaleString('de-DE')} €</span>
          {' '}· Ausgezahlt: <span className="font-semibold text-emerald-500">{paid.toLocaleString('de-DE')} €</span>
        </p>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <table className="w-full">
          <thead className="text-left text-[10px] uppercase tracking-widest font-semibold" style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t3)' }}>
            <tr>
              <th className="px-5 py-3">Greeter</th>
              <th className="px-5 py-3">Erstellt</th>
              <th className="px-5 py-3">Betrag</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((po) => (
              <tr key={po.id} style={{ borderTop: '1px solid var(--ds-card-border)' }}>
                <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--ds-t1)' }}>{greeterName(po.greeter_id)}</td>
                <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--ds-t2)' }}>{formatDate(po.created_at)}</td>
                <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: 'var(--ds-t1)' }}>{Number(po.amount || 0).toLocaleString('de-DE')} €</td>
                <td className="px-5 py-3.5"><span className={`badge ${STATUS[po.status]}`}>{LABEL[po.status]}</span></td>
                <td className="px-5 py-3.5 text-right">
                  {po.status === 'pending' && <button onClick={() => markPaid(po)} className="btn-ghost text-xs">Als ausgezahlt markieren</button>}
                </td>
              </tr>
            ))}
            {payouts.length === 0 && <tr><td colSpan="5" className="px-5 py-16 text-center text-sm" style={{ color: 'var(--ds-t2)' }}>Keine Auszahlungen</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
