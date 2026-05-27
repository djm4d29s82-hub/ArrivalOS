import { FileSpreadsheet, MessageCircle, AlertTriangle } from 'lucide-react';

const PAINS = [
  {
    i: FileSpreadsheet,
    title: 'Excel-Tabellen für 12 Talente',
    body: 'HR jongliert Visa-Daten, Flugzeiten, Wohnungen und Behördentermine in fünf Sheets — niemand weiß, was aktuell ist.',
  },
  {
    i: MessageCircle,
    title: 'WhatsApp-Chaos',
    body: 'Updates kommen in zehn Chats. Wer übernimmt die Abholung? Wer prüft die Anmeldung? Verantwortung verläuft im Sand.',
  },
  {
    i: AlertTriangle,
    title: 'Keine Transparenz',
    body: 'Das Unternehmen erfährt erst aus dem Mitarbeitergespräch, dass schon vier Wochen kein Bankkonto eröffnet wurde.',
  },
];

export default function ProblemSection() {
  return (
    <section className="py-28" style={{ background: 'var(--navy3)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="glass-dark rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-0.5 bg-white/25" />
          <span className="text-[11px] tracking-widest uppercase text-white/40 font-bold">Status Quo</span>
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-bold text-white leading-tight max-w-3xl reveal-on-scroll">
          Internationales Onboarding läuft heute mit Excel, WhatsApp und Bauchgefühl.
        </h2>
        <p className="text-white/50 mt-5 max-w-2xl leading-relaxed text-[15px]">
          Unternehmen rekrutieren weltweit — aber wenn das Talent landet, ist niemand wirklich zuständig.
          Das kostet Vertrauen. Genau dann, wenn es am verletzlichsten ist.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mt-14">
          {PAINS.map((p) => (
            <div key={p.title}
                 className="rounded-2xl p-7 transition"
                 style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
              <div className="w-10 h-10 rounded-xl grid place-items-center mb-5"
                   style={{ background: 'rgba(220,38,38,.15)' }}>
                <p.i className="w-4.5 h-4.5 text-red-400" style={{ width: '18px', height: '18px' }} />
              </div>
              <h3 className="font-serif text-[18px] font-semibold text-white mb-2">{p.title}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,.45)' }}>{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 inline-flex items-center gap-3 rounded-xl px-5 py-3 text-[13px]"
             style={{ background: 'rgba(196,146,40,.10)', border: '1px solid rgba(196,146,40,.20)' }}>
          <span style={{ color: 'rgba(196,146,40,.6)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Das Ergebnis</span>
          <span className="text-white/70">Frustration · Retention-Verlust · überlastete HR-Abteilungen</span>
        </div>
        </div>
      </div>
    </section>
  );
}
