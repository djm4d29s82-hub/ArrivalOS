import { UserCheck, LayoutGrid, LineChart, ArrowRight } from 'lucide-react';

/**
 * "Was Unternehmen kaufen" — Risiko-Reduktion. Das Arrival-Package-Framing:
 * ein Ansprechpartner · eine Plattform · ein Reporting. Bewusst OHNE Preise.
 */

const PILLARS = [
  { i: UserCheck, t: 'Ein Ansprechpartner', s: 'Statt zehn Dienstleister zu koordinieren, gibt es eine Stelle, die verantwortlich ist.' },
  { i: LayoutGrid, t: 'Eine Plattform', s: 'Jeder Schritt, jedes Dokument, jeder Status — an einem Ort, in Echtzeit sichtbar.' },
  { i: LineChart, t: 'Ein Reporting', s: 'Onboarding-Zeit, Pünktlichkeit, offene Risiken — als Zahlen, nicht als Bauchgefühl.' },
];

const PACKAGE = [
  'Visa & Immigration', 'Versicherung', 'Airport Welcome', 'Temporäre Wohnung',
  'Bankkonto', 'Mobilfunk', 'Behördenbegleitung', 'Integration & Sprache',
];

export default function ValuePropSection() {
  return (
    <section id="unternehmen" className="border-t border-[var(--border)] scroll-mt-24" style={{ background: 'var(--navy3)' }}>
      <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-28 md:py-36">
        <div className="reveal-on-scroll max-w-[44ch]">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold mb-8">Für Unternehmen</p>
          <h2 className="font-serif text-cream text-[clamp(28px,4vw,52px)] leading-[1.1]">
            Unternehmen kaufen keinen Transfer.<br />
            <span className="text-gold italic">Sie kaufen Risiko-Reduktion.</span>
          </h2>
          <p className="mt-8 text-cream/60 leading-relaxed">
            Eine Fachkraft, die nicht ankommt, ist teurer als jeder Service. Wir nehmen Unternehmen die
            menschliche und operative Seite der Relocation ab — orchestriert über eine Plattform.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-4">
          {PILLARS.map((p) => {
            const Icon = p.i;
            return (
              <div key={p.t} className="rounded-2xl p-7" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-10 h-10 rounded-lg grid place-items-center mb-5" style={{ background: 'rgba(196,146,40,0.14)' }}>
                  <Icon className="w-4 h-4 text-gold" />
                </div>
                <div className="font-serif text-[19px] font-bold text-cream">{p.t}</div>
                <div className="text-[13px] text-cream/55 mt-2 leading-relaxed">{p.s}</div>
              </div>
            );
          })}
        </div>

        {/* Package scope — no prices */}
        <div className="mt-12 rounded-3xl p-8 md:p-10" style={{ background: 'rgba(196,146,40,0.07)', border: '1px solid rgba(196,146,40,0.2)' }}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold mb-2">Arrival Package</p>
          <p className="font-serif text-cream text-[clamp(20px,2.6vw,30px)] leading-tight max-w-[24ch]">
            Der komplette Ankunftsprozess — in einem Paket.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {PACKAGE.map((item) => (
              <span key={item} className="text-[12.5px] text-cream/80 px-3.5 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {item}
              </span>
            ))}
          </div>
          <a href="#kontakt" className="group mt-9 inline-flex items-center gap-3 text-sm text-cream">
            <span className="border-b border-cream/40 pb-1 transition-colors group-hover:border-gold group-hover:text-gold">
              Paket auf euren Bedarf zuschneiden
            </span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
