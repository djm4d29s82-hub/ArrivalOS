import { useState } from 'react';
import { Sparkles, AlertTriangle, ListChecks, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui';

/**
 * AiBriefing — KI-Ankunfts-Briefing fürs Unternehmensportal.
 * Schickt die bereits geladenen Ankunftsdaten an die Edge-Function `ai-arrival-briefing`
 * (echter Claude-Aufruf) und zeigt Zusammenfassung · Risiken · nächste Schritte.
 *
 * `getPayload()` liefert die kompakte Datenstruktur, die die Seite ohnehin schon berechnet
 * — kein zusätzlicher DB-Zugriff.
 */
export default function AiBriefing({ getPayload, disabled }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function run() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payload = getPayload();
      if (!payload?.missions?.length) {
        setError('Noch keine aktiven Ankünfte zum Auswerten.');
        return;
      }
      if (!base44.raw?.functions?.invoke) {
        setError('KI ist nur mit Live-Backend verfügbar.');
        return;
      }
      const { data, error: fnError } = await base44.raw.functions.invoke('ai-arrival-briefing', { body: payload });
      if (fnError) throw fnError;
      if (data?.configured === false) { setError(data.error || 'KI ist nicht konfiguriert.'); return; }
      if (data?.empty) { setError(data.error || 'Noch keine aktiven Ankünfte zum Auswerten.'); return; }
      if (data?.error) { setError(data.error); return; }
      setResult({
        summary: data?.summary || '',
        risks: Array.isArray(data?.risks) ? data.risks : [],
        actions: Array.isArray(data?.actions) ? data.actions : [],
      });
    } catch (e) {
      setError('KI-Briefing konnte nicht erstellt werden. Bitte später erneut versuchen.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy text-cream grid place-items-center shrink-0">
            <Sparkles className="w-4 h-4 text-gold" />
          </div>
          <div>
            <div className="font-semibold text-[14.5px]" style={{ color: 'var(--ds-t1)' }}>KI-Ankunfts-Briefing</div>
            <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>
              Status, Risiken und nächste Schritte deiner laufenden Ankünfte — in Sekunden.
            </div>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={run} loading={loading} disabled={disabled || loading} icon={loading ? undefined : Sparkles}>
          {loading ? 'Erstelle…' : result ? 'Aktualisieren' : 'KI-Briefing erstellen'}
        </Button>
      </div>

      {error && (
        <div className="mt-4 text-[12.5px] rounded-lg px-3 py-2.5" style={{ background: 'var(--ds-input)', color: 'var(--ds-t2)' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-4">
          {result.summary && (
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ds-t1)' }}>{result.summary}</p>
          )}

          {result.risks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#b45309' }}>
                <AlertTriangle className="w-3.5 h-3.5" /> Risiken
              </div>
              <ul className="space-y-1.5">
                {result.risks.map((r, i) => (
                  <li key={i} className="flex gap-2 text-[13px]" style={{ color: 'var(--ds-t2)' }}>
                    <span className="text-amber-500 mt-0.5">•</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.actions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-2 text-gold">
                <ListChecks className="w-3.5 h-3.5" /> Nächste Schritte
              </div>
              <ul className="space-y-1.5">
                {result.actions.map((a, i) => (
                  <li key={i} className="flex gap-2 text-[13px]" style={{ color: 'var(--ds-t2)' }}>
                    <span className="text-gold mt-0.5">→</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-[10.5px] pt-1" style={{ color: 'var(--ds-t3)' }}>
            KI-generiert aus deinen aktuellen Ankunftsdaten · zur Orientierung, keine Rechtsberatung.
          </div>
        </div>
      )}
    </div>
  );
}
