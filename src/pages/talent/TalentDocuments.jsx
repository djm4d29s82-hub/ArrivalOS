import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/LangContext';
import { uploadDocument, getDocumentUrl, deleteDocument } from '@/lib/storage';
import { FileText, CheckCircle2, Clock, AlertCircle, Upload, Download, Trash2, Loader2 } from 'lucide-react';

const STATUS_META = {
  signed:   { i: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  verified: { i: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  pending:  { i: Clock,        color: 'text-gold bg-gold/15' },
  missing:  { i: AlertCircle,  color: 'bg-red-500/15 text-red-700 dark:text-red-400' },
};

export default function TalentDocuments() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const cid = user?.candidate_id || 'ca1';

  const reload = () => base44.entities.Document.filter({ candidate_id: cid }, '-uploaded_at').then(setDocs);
  useEffect(() => { reload(); }, [cid]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(null);
    try {
      await uploadDocument({ file, candidateId: cid, type: 'upload' });
      await reload();
    } catch (err) {
      setError(err.message || t('docs.uploadFailed'));
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const onDownload = async (doc) => {
    try {
      const url = await getDocumentUrl(doc);
      if (!url) { setError(t('docs.notAvailable')); return; }
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setError(err.message);
    }
  };

  const onDelete = async (doc) => {
    if (!confirm(t('docs.confirmDelete', { title: doc.title }))) return;
    try {
      await deleteDocument(doc);
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-2 text-[11px] uppercase tracking-widest text-gold font-bold">{t('docs.eyebrow')}</div>
      <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ds-t1)' }}>{t('docs.title')}</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--ds-t2)' }}>
        {t('docs.sub')}
      </p>

      <div className="mt-8 space-y-2">
        {docs.length === 0 && (
          <div className="rounded-xl p-8 text-center" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)', color: 'var(--ds-t2)' }}>
            {t('docs.empty')}
          </div>
        )}
        {docs.map((d) => {
          const statusKey = STATUS_META[d.status] ? d.status : 'missing';
          const s = STATUS_META[statusKey];
          const StatusIcon = s.i;
          return (
            <div
              key={d.id}
              className="rounded-xl p-4 flex items-center gap-4 transition"
              style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(196,146,40,0.30)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ds-card-border)'; }}
            >
              <div className="w-10 h-10 rounded-lg grid place-items-center" style={{ background: 'rgba(196,146,40,0.10)' }}>
                <FileText className="w-4 h-4" style={{ color: '#c49228' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[14px] truncate" style={{ color: 'var(--ds-t1)' }}>{d.title}</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ds-t3)' }}>
                  {d.uploaded_at ? t('docs.uploaded', { date: new Date(d.uploaded_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE') }) : t('docs.notUploaded')}
                  {d.size ? ` · ${(d.size / 1024).toFixed(0)} KB` : ''}
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${s.color}`}>
                <StatusIcon className="w-3 h-3" /> {t(`docs.status.${statusKey}`)}
              </span>
              {d.storage_path && (
                <button onClick={() => onDownload(d)} aria-label="Download" className="p-2 rounded-lg transition" style={{ color: 'var(--ds-t2)' }}>
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => onDelete(d)} aria-label="Delete" className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 space-y-2">
        <label className={`btn-primary inline-flex items-center gap-2 cursor-pointer ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {busy ? t('docs.uploading') : t('docs.upload')}
          <input type="file" className="sr-only" onChange={onUpload} disabled={busy} />
        </label>
        {error && <div className="text-[12px] text-red-700 mt-2">{error}</div>}
      </div>
    </div>
  );
}
