import { useState } from 'react';
import { ArrowRight, Star, Check } from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const CANDIDATES = {
  amara: {
    name: 'Amara Okafor', company: 'Lumen Robotics', role: 'Senior ML Engineer',
    origin: 'Nigeria → München', arrival: '2. Juni 2026', status: 'In Vorbereitung',
    badge: 'gold', progress: 40,
    steps: [
      { t: 'Vertrag unterschrieben',  s: 'done', tm: 'vor 14 Tagen' },
      { t: 'Visum-Anfrage gestellt',   s: 'done', tm: 'vor 10 Tagen' },
      { t: 'Wohnung vorgeschlagen',    s: 'done', tm: 'vor 6 Tagen' },
      { t: 'Flugdaten bestätigt',      s: 'run',  tm: 'läuft seit 2 Tagen' },
      { t: 'Greeter zugewiesen',       s: 'open' },
      { t: 'Anmeldung Bürgeramt',      s: 'open' },
      { t: 'Bankkonto eröffnen',       s: 'open' },
      { t: 'Welcome Day & Sign-off',   s: 'open' },
    ],
    notes: [
      { au: 'Jonas Steiner', tm: 'vor 2 Std.', tx: 'Flug bestätigt für 2. Juni, 14:30 MUC T2. Bitte Greeter so platzieren.' },
      { au: 'Ops-Team',  tm: 'vor 1 Std.', tx: 'Sophie B. ist vor Ort — übernimmt die Abholung mit Schild.' },
    ],
  },
  rafael: {
    name: 'Rafael Méndez', company: 'Helix Biotech', role: 'Lab Manager',
    origin: 'Mexiko → Berlin', arrival: '28. Mai 2026', status: 'Greeter zugewiesen',
    badge: 'gold', progress: 70,
    steps: [
      { t: 'Vertrag unterschrieben',   s: 'done', tm: 'vor 21 Tagen' },
      { t: 'Visum erteilt',            s: 'done', tm: 'vor 16 Tagen' },
      { t: 'Wohnung in Berlin-Mitte',  s: 'done', tm: 'vor 11 Tagen' },
      { t: 'Flugdaten bestätigt',      s: 'done', tm: 'vor 7 Tagen' },
      { t: 'Greeter zugewiesen',       s: 'done', tm: 'vor 3 Tagen' },
      { t: 'Anmeldung Bürgeramt',      s: 'run',  tm: 'morgen 09:00' },
      { t: 'Bankkonto eröffnen',       s: 'open' },
      { t: 'Welcome Day & Sign-off',   s: 'open' },
    ],
    notes: [
      { au: 'Lena (Greeter)', tm: 'vor 30 Min.', tx: 'Termin im Bürgeramt Mitte morgen 09:00 — Unterlagen komplett.' },
    ],
  },
  linh: {
    name: 'Linh Tran', company: 'Northwind Studios', role: 'Art Director',
    origin: 'Vietnam → Hamburg', arrival: '10. Juni 2026', status: 'Matching läuft',
    badge: 'gold', progress: 15,
    steps: [
      { t: 'Vertrag unterschrieben',  s: 'done', tm: 'vor 5 Tagen' },
      { t: 'Visum-Anfrage',           s: 'run',  tm: 'läuft' },
      { t: 'Wohnung vorgeschlagen',   s: 'open' },
      { t: 'Flugdaten bestätigt',     s: 'open' },
      { t: 'Greeter zugewiesen',      s: 'open' },
      { t: 'Anmeldung Bürgeramt',     s: 'open' },
      { t: 'Bankkonto eröffnen',      s: 'open' },
      { t: 'Welcome Day & Sign-off',  s: 'open' },
    ],
    notes: [],
  },
  joana: {
    name: 'Joana Pereira', company: 'Lumen Robotics', role: 'Product Designer',
    origin: 'Portugal → Köln', arrival: '25. Mai 2026', status: 'Abgeschlossen',
    badge: 'grn', progress: 100,
    steps: [
      { t: 'Vertrag unterschrieben',       s: 'done', tm: 'vor 35 Tagen' },
      { t: 'Visum / EU-Pass geprüft',      s: 'done', tm: 'vor 30 Tagen' },
      { t: 'Wohnung in Köln-Innenstadt',   s: 'done', tm: 'vor 22 Tagen' },
      { t: 'Flugdaten bestätigt',          s: 'done', tm: 'vor 18 Tagen' },
      { t: 'Greeter (Marco) abgeholt',     s: 'done', tm: 'vor 10 Tagen' },
      { t: 'Anmeldung Bürgeramt',          s: 'done', tm: 'vor 8 Tagen' },
      { t: 'Bankkonto eröffnet',           s: 'done', tm: 'vor 5 Tagen' },
      { t: 'Welcome Day & Sign-off',       s: 'done', tm: 'vor 2 Tagen' },
    ],
    notes: [
      { au: 'Joana', tm: 'vor 2 Tagen', tx: 'Vielen Dank! Marco war fantastisch — fühle mich wirklich angekommen.' },
    ],
  },
};

const DOCS = [
  { n: 'Arbeitsvertrag.pdf',   sz: '184 KB' },
  { n: 'Wohnung-Exposé.pdf',  sz: '2,1 MB' },
  { n: 'Welcome-Guide.pdf',   sz: '512 KB' },
];

// ─── Section ──────────────────────────────────────────────────────────────────

export default function ProductDemoSection() {
  const [curId,    setCurId]    = useState(null);
  const [steps,    setSteps]    = useState(null);
  const [notes,    setNotes]    = useState([]);
  const [noteText, setNoteText] = useState('');

  const openCandidate = (id) => {
    const c = CANDIDATES[id];
    setCurId(id);
    setSteps(c.steps.map((s) => ({ ...s })));
    setNotes([...c.notes]);
  };
  const closeCandidate = () => { setCurId(null); setSteps(null); setNotes([]); };
  const cycleStep = (i) => {
    setSteps((arr) => arr.map((s, idx) => idx !== i ? s : {
      ...s,
      s: s.s === 'done' ? 'open' : s.s === 'run' ? 'done' : 'run',
      tm: s.s === 'run' ? 'gerade eben' : s.tm,
    }));
  };
  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes((n) => [{ au: 'Du', tm: 'gerade eben', tx: noteText.trim() }, ...n]);
    setNoteText('');
  };

  const cur       = curId ? CANDIDATES[curId] : null;
  const doneCount = steps?.filter((s) => s.s === 'done').length || 0;
  const progress  = steps?.length ? Math.round((doneCount / steps.length) * 100) : 0;

  return (
    <section id="demo" className="py-24" style={{ background: 'var(--ds-bg)' }}>
      <div className="max-w-7xl mx-auto px-6">

        <div className="rounded-2xl p-6 mb-8 flex items-center gap-4 flex-wrap" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <div className="flex items-center gap-3 text-[12.5px] text-[var(--mid)]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold bg-gold/10 px-2.5 py-1 rounded-full">✦ Live-Demo</span>
            <span className="hidden sm:inline">Interaktive Vorschau · Keine echten Daten · Kein Login nötig</span>
          </div>
        </div>

        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-0.5 bg-gold" />
              <span className="text-[11px] tracking-widest uppercase text-gold font-bold">Live-Portal · Demo</span>
            </div>
            <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight" style={{ color: 'var(--ds-t1)' }}>
              Ihre Kandidat:innen —<br />in Echtzeit.
            </h2>
            <p className="text-[var(--mid)] text-[14px] mt-4 max-w-lg leading-relaxed">
              Jede Aktion von Greeter oder Admin erscheint sofort — ohne Anrufe, ohne Status-E-Mails.
            </p>
          </div>
          <div className="rounded-full px-4 py-2 text-[12px] font-medium shrink-0 self-start md:self-auto" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)', color: 'var(--ds-t2)' }}>
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Realtime aktiv
            </span>
          </div>
        </div>

        {/* Interactive area */}
        {!cur ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Object.entries(CANDIDATES).map(([id, c]) => (
              <CandCard key={id} c={c} onClick={() => openCandidate(id)} />
            ))}
          </div>
        ) : (
          <DetailView
            cur={cur} steps={steps} notes={notes} noteText={noteText}
            doneCount={doneCount} progress={progress}
            onClose={closeCandidate} onCycleStep={cycleStep}
            onAddNote={addNote} onNoteChange={setNoteText}
          />
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <a
            href="#kontakt"
            className="btn-gold inline-flex items-center gap-2"
          >
            Kurz austauschen <ArrowRight className="w-4 h-4" />
          </a>
          <div className="text-[11.5px] text-[var(--light)] mt-3">
            Kein Account nötig · Kostenlose Plattform-Demo
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Candidate card (light theme) ────────────────────────────────────────────

function CandCard({ c, onClick }) {
  const isGreen = c.badge === 'grn';
  const herkunft = c.origin.split('→')[0].trim();
  const stadt = c.origin.split('→')[1]?.trim() || '—';
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-5 cursor-pointer hover:shadow-s2 transition-all group"
      style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="font-serif text-[20px] font-bold leading-tight" style={{ color: 'var(--ds-t1)' }}>{c.name}</div>
        <div className="w-8 h-8 rounded-full border border-black/[0.08] flex items-center justify-center shrink-0 ml-3 group-hover:border-gold/40 transition-colors">
          <ArrowRight className="w-3.5 h-3.5 text-[var(--light)] group-hover:text-gold transition-colors" />
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--light)] font-bold mb-3">{c.company}</div>

      <div className="mb-4">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
          style={{ background: isGreen ? 'rgba(22,163,74,0.10)' : 'rgba(196,146,40,0.12)', color: isGreen ? '#15803d' : '#92700e' }}
        >
          {isGreen ? <Check className="w-3 h-3" /> : <Star className="w-3 h-3" />}
          {c.status}
        </span>
      </div>

      <div>
        {[['Rolle', c.role], ['Herkunft', herkunft], ['Stadt', stadt], ['Ankunft', c.arrival]].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-1.5 last:border-0" style={{ borderBottom: '1px solid var(--ds-card-border)' }}>
            <span className="text-[11.5px]" style={{ color: 'var(--ds-t3)' }}>{label}</span>
            <span className="text-[12px] font-semibold" style={{ color: 'var(--ds-t1)' }}>{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-[11px] mb-1.5">
          <span className="text-[var(--light)]">Fortschritt</span>
          <span className="font-semibold" style={{ color: isGreen ? '#15803d' : 'var(--gold)' }}>{c.progress}%</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--ds-card-border)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${c.progress}%`, background: isGreen ? '#16a34a' : 'var(--gold)' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Detail view (light theme) ───────────────────────────────────────────────

function DetailView({ cur, steps, notes, noteText, doneCount, progress, onClose, onCycleStep, onAddNote, onNoteChange }) {
  return (
    <div>
      <button
        onClick={onClose}
        className="inline-flex items-center gap-1.5 text-[13px] hover:opacity-80 transition-colors mb-5"
        style={{ color: 'var(--ds-t2)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Zurück zur Übersicht
      </button>

      {/* Detail header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h3 className="font-serif text-[clamp(22px,3vw,32px)] font-bold leading-tight" style={{ color: 'var(--ds-t1)' }}>{cur.name}</h3>
          <div className="text-[13px] text-[var(--mid)] mt-0.5">{cur.role} · {cur.company} · {cur.origin}</div>
        </div>
        <div className="rounded-full px-3.5 py-1.5 text-[12.5px]" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)', color: 'var(--ds-t2)' }}>
          {cur.status}
        </div>
      </div>

      <div className="rounded-3xl p-5 mb-4" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <div className="flex justify-between items-center mb-2.5">
          <div className="font-semibold text-[13.5px]" style={{ color: 'var(--ds-t1)' }}>Onboarding-Fortschritt</div>
          <div className="text-[12px] text-[var(--light)]">{doneCount} / {steps.length} Schritte · Ankunft {cur.arrival}</div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--ds-card-border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #c49228, #d4a83a)' }}
          />
        </div>
      </div>

      <div className="grid gap-4 detail-cols">
        {/* Steps */}
        <div className="rounded-3xl p-5" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          <div className="font-semibold text-[13.5px] mb-0.5" style={{ color: 'var(--ds-t1)' }}>Journey-Schritte</div>
          <div className="text-[11px] text-[var(--light)] flex items-center gap-1.5 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Live · Klick zum Wechseln
          </div>
          <div className="flex flex-col gap-2">
            {steps.map((s, i) => <StepRow key={i} s={s} onClick={() => onCycleStep(i)} />)}
          </div>
        </div>

        {/* Docs + Notes */}
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl p-5" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-[13.5px]" style={{ color: 'var(--ds-t1)' }}>Dokumente</div>
              <span className="text-[11px] text-[var(--light)]">{DOCS.length} Dateien</span>
            </div>
            {DOCS.map((d) => (
              <div key={d.n} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-1.5 last:mb-0" style={{ background: 'var(--ds-input)' }}>
                <div className="w-7 h-7 bg-gold/10 rounded-lg flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c49228" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate" style={{ color: 'var(--ds-t1)' }}>{d.n}</div>
                  <div className="text-[10.5px] text-[var(--light)]">{d.sz}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl p-5" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            <div className="font-semibold text-[13.5px] mb-3" style={{ color: 'var(--ds-t1)' }}>Notizen & Updates</div>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3" style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)' }}>
              <input
                value={noteText}
                onChange={(e) => onNoteChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAddNote()}
                placeholder="Notiz hinzufügen…"
                className="flex-1 bg-transparent border-none outline-none text-[12px] placeholder:text-[var(--ds-t3)]"
                style={{ color: 'var(--ds-t1)' }}
              />
              <button
                onClick={onAddNote}
                className="w-7 h-7 bg-navy rounded-full flex items-center justify-center shrink-0 hover:bg-navy-2 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f0ebe0" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            {notes.length === 0 && (
              <div className="text-[11.5px] text-[var(--light)] py-3 text-center">Noch keine Notizen.</div>
            )}
            {notes.map((n, i) => (
              <div key={i} className="px-3 py-2.5 rounded-xl mb-1.5 last:mb-0" style={{ background: 'var(--ds-input)' }}>
                <div className="flex justify-between mb-1">
                  <span className="text-[10.5px] font-semibold" style={{ color: 'var(--ds-t1)' }}>{n.au}</span>
                  <span className="text-[10px] text-[var(--light)]">{n.tm}</span>
                </div>
                <div className="text-[12px] text-[var(--mid)] leading-relaxed">{n.tx}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .detail-cols { grid-template-columns: 1fr 300px; }
        @media (max-width: 768px) { .detail-cols { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

// ─── Step row (light theme) ───────────────────────────────────────────────────

function StepRow({ s, onClick }) {
  const cfg = {
    done: { dot: '#16a34a', dotBg: 'rgba(22,163,74,0.12)', tag: 'Erledigt', tagBg: 'rgba(22,163,74,0.10)', tagColor: '#15803d' },
    run:  { dot: '#c49228', dotBg: 'rgba(196,146,40,0.12)', tag: 'Läuft',    tagBg: 'rgba(196,146,40,0.10)', tagColor: '#92700e' },
    open: { dot: '#cbd5e1', dotBg: 'rgba(0,0,0,0.04)',      tag: 'Offen',    tagBg: 'rgba(0,0,0,0.04)',      tagColor: '#94a3b8' },
  }[s.s];
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:border-gold/35 hover:bg-gold/[0.03] transition-all"
      style={{ border: '1px solid var(--ds-card-border)' }}
    >
      <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center" style={{ background: cfg.dotBg }}>
        <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px]" style={{ color: s.s === 'done' ? '#94a3b8' : 'var(--ds-t1)', textDecoration: s.s === 'done' ? 'line-through' : 'none' }}>
          {s.t}
        </div>
        {s.tm && <div className="text-[10px] text-[var(--light)] mt-0.5">{s.tm}</div>}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: cfg.tagBg, color: cfg.tagColor }}>
        {cfg.tag}
      </span>
    </div>
  );
}
