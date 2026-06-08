import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getDocumentUrl } from '@/lib/storage';
import { useAuth } from '@/lib/AuthContext';
import { FileText, CheckCircle2, Clock, AlertCircle, Download } from 'lucide-react';

const STATUS_META = {
  signed:   { i: CheckCircle2, label: 'Unterzeichnet', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  verified: { i: CheckCircle2, label: 'Verifiziert',   color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  pending:  { i: Clock,        label: 'Ausstehend',    color: 'text-gold bg-gold/15' },
  missing:  { i: AlertCircle,  label: 'Fehlt',         color: 'bg-red-500/15 text-red-700 dark:text-red-400' },
};

export default function CompanyDocuments() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [candidates, setCandidates] = useState({});

  useEffect(() => {
    (async () => {
      // Company-Isolation: nur Kandidaten der eigenen Company
      const myCandidates = user?.company_id
        ? await base44.entities.Candidate.filter({ company_id: user.company_id })
        : await base44.entities.Candidate.list();
      const cmap = {};
      myCandidates.forEach((c) => (cmap[c.id] = c));
      setCandidates(cmap);

      const allDocs = await base44.entities.Document.list('-uploaded_at');
      const visible = allDocs.filter((d) => cmap[d.candidate_id]);
      setDocs(visible);
    })();
  }, [user?.company_id]);

  const onDownload = async (d) => {
    try {
      const url = await getDocumentUrl(d);
      if (url) window.open(url, '_blank', 'noopener');
      else alert('Datei nicht verfügbar.');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="mb-2 text-[11px] uppercase tracking-widest text-gold font-bold">Unternehmen · Dokumente</div>
      <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ds-t1)' }}>Dokumenten-Vault</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--ds-t2)' }}>Verträge, Visa, Anmeldungen, verschlüsselt gespeichert, DSGVO-konform.</p>

      <div className="mt-8 rounded-2xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <table className="w-full text-[13px]">
          <thead className="text-[11px] uppercase tracking-widest" style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t3)' }}>
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Talent</th>
              <th className="text-left px-5 py-3 font-semibold">Dokument</th>
              <th className="text-left px-5 py-3 font-semibold">Typ</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="text-left px-5 py-3 font-semibold">Datum</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const s = STATUS_META[d.status] || STATUS_META.missing;
              const SI = s.i;
              return (
                <tr key={d.id} className="transition" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
                  <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--ds-t1)' }}>{candidates[d.candidate_id]?.full_name || d.candidate_id}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2" style={{ color: 'var(--ds-t1)' }}><FileText className="w-3.5 h-3.5" style={{ color: 'var(--ds-t2)' }} />{d.title}</div>
                  </td>
                  <td className="px-5 py-3.5 capitalize" style={{ color: 'var(--ds-t2)' }}>{d.type}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${s.color}`}>
                      <SI className="w-3 h-3" /> {s.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5" style={{ color: 'var(--ds-t3)' }}>
                    {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('de-DE') : '–'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => onDownload(d)} disabled={!d.storage_path} className="transition disabled:opacity-30 disabled:cursor-not-allowed" style={{ color: '#c49228' }} title={d.storage_path ? 'Download' : 'Keine Datei hinterlegt'}>
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {docs.length === 0 && <div className="p-10 text-center text-[13px]" style={{ color: 'var(--ds-t2)' }}>Keine Dokumente vorhanden.</div>}
      </div>
    </div>
  );
}
