/**
 * Company bulk-arrival CSV import.
 *
 * Per CSV row, creates a Candidate + a candidate-linked Mission (status `created`)
 * under the logged-in company — so admin then plans steps + assigns a greeter and the
 * arrival reaches the talent screen (unlike the single-arrival wizard, which skips the
 * Candidate). Three phases in one Dialog: upload → preview/validate → commit + result.
 *
 * CSV columns (header row, case-insensitive):
 *   name, email, phone, language_level, city, arrival_date, arrival_time, flight_number, notes
 * Required: name + arrival_date. Defaults: city=Berlin, arrival_time=14:00.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createMission } from '@/api';
import { parseCsv, CSV_TEMPLATE } from '@/lib/csv';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Button, Textarea,
} from '@/components/ui';
import { Upload, FileDown, Check, AlertCircle, ChevronLeft, CheckCircle2, XCircle } from 'lucide-react';

/** Accepts YYYY-MM-DD or DD.MM.YYYY → returns YYYY-MM-DD, or null if unparseable. */
function normalizeDate(str) {
  const v = (str || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const de = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (de) {
    const [, d, m, y] = de;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

/** Normalize HH:MM (accepts H:MM); default 14:00. */
function normalizeTime(str) {
  const v = (str || '').trim();
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '14:00';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/** Validate + normalize one parsed row → { ok, errors, norm }. */
function validateRow(r) {
  const name = (r.name || '').trim();
  const date = normalizeDate(r.arrival_date);
  const errors = [];
  if (!name) errors.push('Name fehlt');
  if (!(r.arrival_date || '').trim()) errors.push('Ankunftsdatum fehlt');
  else if (!date) errors.push('Datum ungültig (TT.MM.JJJJ oder JJJJ-MM-TT)');
  return {
    ok: errors.length === 0,
    errors,
    norm: {
      name,
      email: (r.email || '').trim(),
      phone: (r.phone || '').trim(),
      language_level: (r.language_level || '').trim(),
      city: (r.city || '').trim() || 'Berlin',
      date,
      time: normalizeTime(r.arrival_time),
      flight_number: (r.flight_number || '').trim(),
      notes: (r.notes || '').trim(),
    },
  };
}

export default function CompanyCsvImport({ open, onOpenChange }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [phase, setPhase] = useState('upload'); // upload | preview | done
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState([]); // [{ ...validateRow result, include }]
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { created, failed: [{name, reason}] }

  const reset = () => {
    setPhase('upload'); setRaw(''); setParsed([]); setBusy(false); setError(null); setResult(null);
  };
  const close = () => { reset(); onOpenChange(false); };

  const ingest = (text) => {
    setError(null);
    const { rows } = parseCsv(text);
    if (!rows.length) { setError('Keine Datenzeilen gefunden. Stimmt die Kopfzeile?'); return; }
    setParsed(rows.map((r) => { const v = validateRow(r); return { ...v, include: v.ok }; }));
    setPhase('preview');
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRaw(text);
    ingest(text);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'arrival-os-import-vorlage.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = (i) => setParsed((p) => p.map((row, j) => (j === i ? { ...row, include: !row.include } : row)));

  const included = parsed.filter((r) => r.include && r.ok);
  const skipped = parsed.length - included.length;

  const commit = async () => {
    if (!user?.company_id) { setError('Kein Unternehmen mit deinem Konto verknüpft, Import nicht möglich.'); return; }
    setBusy(true);
    setError(null);
    const created = [];
    const failed = [];
    for (const row of included) {
      const n = row.norm;
      try {
        const candidate = await base44.entities.Candidate.create({
          full_name: n.name,
          company_id: user.company_id,
          phone: n.phone || null,
          languages: n.language_level ? [n.language_level] : [],
          arrival_date: n.date,
          arrival_time: `${n.date}T${n.time}:00Z`,
          flight_no: n.flight_number || null,
          notes: n.notes || null,
          status: 'preparation',
        });
        await createMission({
          companyId: user.company_id,
          candidateId: candidate.id,
          title: `${n.name} → ${n.city}`,
          city: n.city,
          datetime: `${n.date}T${n.time}:00Z`,
          location: `${n.city} Airport`,
          flightNumber: n.flight_number || undefined,
          role: user?.role || 'company',
          actor: user?.email || 'company@neuland.de',
          base44,
        });
        created.push(n.name);
      } catch (err) {
        failed.push({ name: n.name, reason: err?.message || String(err) });
      }
    }
    qc.invalidateQueries({ queryKey: ['missions'] });
    qc.invalidateQueries({ queryKey: ['candidates'] });
    setResult({ created: created.length, failed });
    setPhase('done');
    setBusy(false);
  };

  /* ── result ─────────────────────────────────────────────────── */
  if (phase === 'done' && result) {
    return (
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" /> Import abgeschlossen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 dark:bg-green-500/[0.08] dark:border-green-500/20 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                {result.created} {result.created === 1 ? 'Ankunft' : 'Ankünfte'} erstellt
              </p>
            </div>
            {result.failed.length > 0 && (
              <div className="bg-red-50 border border-red-200 dark:bg-red-500/[0.08] dark:border-red-500/20 rounded-lg p-3 text-sm space-y-1">
                <p className="text-red-700 dark:text-red-400 font-medium flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> {result.failed.length} fehlgeschlagen
                </p>
                <ul className="text-red-700/90 dark:text-red-400/80 text-[12.5px] space-y-0.5">
                  {result.failed.map((f, i) => <li key={i}>{f.name || '—'}: {f.reason}</li>)}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={close}>Fertig</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  /* ── preview ────────────────────────────────────────────────── */
  if (phase === 'preview') {
    return (
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>CSV-Import, Überprüfung</DialogTitle>
            <DialogDescription>
              {included.length} gültig · {skipped} übersprungen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
            <div className="max-h-80 overflow-y-auto rounded-lg" style={{ border: '1px solid var(--ds-card-border)' }}>
              <table className="w-full text-[12.5px]">
                <thead className="text-[11px] uppercase tracking-wider sticky top-0" style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t3)' }}>
                  <tr>
                    <th className="px-2 py-2 text-left w-8"></th>
                    <th className="px-2 py-2 text-left">Name</th>
                    <th className="px-2 py-2 text-left">Stadt</th>
                    <th className="px-2 py-2 text-left">Datum</th>
                    <th className="px-2 py-2 text-left">Flug</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--ds-card-border)', background: row.ok ? 'transparent' : 'rgba(239,68,68,0.06)' }}>
                      <td className="px-2 py-1.5">
                        <input type="checkbox" checked={row.include && row.ok} disabled={!row.ok} onChange={() => toggle(i)} />
                      </td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--ds-t1)' }}>
                        {row.norm.name || '—'}
                        {!row.ok && <div className="text-[11px] text-red-600">{row.errors.join(', ')}</div>}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--ds-t2)' }}>{row.norm.city}</td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--ds-t2)' }}>{row.norm.date || '—'} {row.norm.time}</td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--ds-t2)' }}>{row.norm.flight_number || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setError(null); setPhase('upload'); }} disabled={busy} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" /> Zurück
              </Button>
              <Button onClick={commit} loading={busy} disabled={busy || included.length === 0} className="flex-1">
                <Check className="w-4 h-4 mr-1" /> {included.length} importieren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  /* ── upload ─────────────────────────────────────────────────── */
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ankünfte per CSV importieren</DialogTitle>
          <DialogDescription>Lade eine CSV-Datei hoch oder füge den Inhalt ein.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}

          <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-lg cursor-pointer text-sm transition"
            style={{ border: '1.5px dashed var(--ds-card-border)', color: 'var(--ds-t2)' }}>
            <Upload className="w-4 h-4" /> CSV-Datei auswählen
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          </label>

          <div className="text-[12px] text-center" style={{ color: 'var(--ds-t3)' }}>oder Inhalt einfügen</div>
          <Textarea
            rows={5}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={'name,email,phone,language_level,city,arrival_date,arrival_time,flight_number,notes\nMaria Santos,...,Berlin,2026-06-15,14:30,LH456,'}
          />

          <div className="flex items-center justify-between">
            <button onClick={downloadTemplate} className="text-[12.5px] inline-flex items-center gap-1.5 text-gold hover:underline">
              <FileDown className="w-3.5 h-3.5" /> Vorlage herunterladen
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={close}>Abbrechen</Button>
              <Button onClick={() => ingest(raw)} disabled={!raw.trim()}>Weiter</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
