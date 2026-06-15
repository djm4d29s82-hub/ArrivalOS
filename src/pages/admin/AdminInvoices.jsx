import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/utils';
import { printInvoice } from '@/lib/invoicePdf';
import { useToast } from '@/components/ui/toaster';
import { useAuth } from '@/lib/AuthContext';

const STATUS = {
  draft:   'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  paid:    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  overdue: 'bg-red-500/15 text-red-700 dark:text-red-400',
};
const LABEL = { draft: 'Entwurf', paid: 'Bezahlt', pending: 'Offen', overdue: 'Überfällig' };

export default function AdminInvoices() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: allInvoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-issued_at') });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });

  // Data isolation: this component is also mounted on /company/invoices. A company only ever
  // sees its own invoices (and never "all" when company_id is missing); admins see everything.
  // Drafts are admin-internal (pre-review) — the company never sees them.
  const isCompany = user?.role === 'company';
  const invoices = isCompany
    ? (user?.company_id ? allInvoices.filter((i) => i.company_id === user.company_id && i.status !== 'draft') : [])
    : allInvoices;

  const markPaid = async (inv) => {
    await base44.entities.Invoice.update(inv.id, { status: 'paid' });
    toast({ title: 'Rechnung markiert', description: `Als bezahlt markiert (${inv.amount} €)` });
    qc.invalidateQueries({ queryKey: ['invoices'] });
  };

  // Admin review gate: a draft becomes visible to the company only when explicitly sent.
  // The 14-day due window starts at send time.
  const sendInvoice = async (inv) => {
    const now = new Date();
    await base44.entities.Invoice.update(inv.id, {
      status: 'pending',
      issued_at: now.toISOString(),
      due_at: new Date(now.getTime() + 14 * 86400000).toISOString(),
    });
    toast({ title: 'An Unternehmen gesendet', description: `Rechnung ${inv.amount} € ist jetzt für das Unternehmen sichtbar.` });
    qc.invalidateQueries({ queryKey: ['invoices'] });
  };

  // Drafts don't count toward revenue until sent.
  const sent = invoices.filter((i) => i.status !== 'draft');
  const draftCount = invoices.filter((i) => i.status === 'draft').length;
  const total = sent.reduce((s, i) => s + (i.amount || 0), 0);
  const paid = sent.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold" style={{ color: 'var(--ds-t1)' }}>Rechnungen</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--ds-t2)' }}>
          Gesamt: <span className="font-semibold" style={{ color: 'var(--ds-t1)' }}>{total.toLocaleString('de-DE')} €</span>
          {' '}· Bezahlt: <span className="font-semibold text-emerald-500">{paid.toLocaleString('de-DE')} €</span>
          {!isCompany && draftCount > 0 && (
            <>{' '}· <span className="font-semibold text-slate-500">{draftCount} {draftCount === 1 ? 'Entwurf' : 'Entwürfe'} zu prüfen</span></>
          )}
        </p>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <table className="w-full">
          <thead className="text-left text-[10px] uppercase tracking-widest font-semibold"
            style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t3)' }}>
            <tr>
              <th className="px-5 py-3">Rechnungs-ID</th>
              <th className="px-5 py-3">Kunde</th>
              <th className="px-5 py-3">Ausgestellt</th>
              <th className="px-5 py-3">Fällig</th>
              <th className="px-5 py-3">Betrag</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const co = companies.find((c) => c.id === inv.company_id);
              return (
                <tr key={inv.id} className="transition" style={{ borderTop: '1px solid var(--ds-card-border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,146,40,0.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <td className="px-5 py-3.5 font-mono text-xs" style={{ color: 'var(--ds-t1)' }}>{inv.invoice_number || (inv.status === 'draft' ? 'Entwurf' : String(inv.id).slice(0, 8))}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--ds-t1)' }}>{co?.name || '—'}</td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--ds-t2)' }}>{formatDate(inv.issued_at)}</td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--ds-t2)' }}>{formatDate(inv.due_at)}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: 'var(--ds-t1)' }}>
                    {inv.amount} {inv.currency || 'EUR'}
                    {inv.expenses_amount > 0 && (
                      <div className="text-[10.5px] font-normal mt-0.5" style={{ color: 'var(--ds-t3)' }}>
                        Paket {inv.base_amount ?? (inv.amount - inv.expenses_amount)} € + Auslagen {inv.expenses_amount} €
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5"><span className={`badge ${STATUS[inv.status]}`}>{LABEL[inv.status]}</span></td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button onClick={() => printInvoice({ invoice: inv, company: co })} className="btn-ghost text-xs">
                        {inv.status === 'draft' ? 'Vorschau' : 'PDF'}
                      </button>
                      {inv.status === 'draft' ? (
                        !isCompany && (
                          <>
                            {inv.mission_id && (
                              <Link to={`/admin/missions/${inv.mission_id}`} className="btn-ghost text-xs">Spesen prüfen</Link>
                            )}
                            <button onClick={() => sendInvoice(inv)} className="btn-ghost text-xs font-semibold" style={{ color: '#c49228' }}>An Unternehmen senden</button>
                          </>
                        )
                      ) : (
                        !isCompany && inv.status !== 'paid' && <button onClick={() => markPaid(inv)} className="btn-ghost text-xs">Als bezahlt markieren</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && <tr><td colSpan="7" className="px-5 py-16 text-center text-sm" style={{ color: 'var(--ds-t2)' }}>Keine Rechnungen</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
