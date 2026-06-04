import { Sparkles, AlertTriangle, ListChecks, ArrowRight } from 'lucide-react';

/**
 * "KI, die fürs Unternehmen arbeitet" — bewirbt das echte KI-Ankunfts-Briefing
 * im Unternehmensportal (Part B). Ehrlich: beschreibt genau, was das Feature tut.
 * KI für HR — nicht für die Kandidat:innen.
 */

const CAPS = [
  { i: Sparkles, t: 'Status in Sekunden', s: 'Alle aktiven Ankünfte als ein verständliches Briefing — ohne sich durch Listen zu klicken.' },
  { i: AlertTriangle, t: 'Risiken zuerst', s: 'Die KI hebt hervor, welche Ankunft Aufmerksamkeit braucht — bevor eine Frist reißt.' },
  { i: ListChecks, t: 'Nächste Schritte', s: 'Konkrete Handlungsempfehlungen statt Rohdaten. Was jetzt zu tun ist, klar benannt.' },
];

export default function AiCompanySection() {
  return (
    <section id="ki" className="border-t border-[var(--border)] scroll-mt-24">
      <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-28 md:py-36">
        <div className="grid md:grid-cols-[1fr_1fr] gap-16 md:gap-20 items-center">
          <div className="reveal-on-scroll">
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold mb-8">KI fürs Unternehmen</p>
            <h2 className="font-serif text-navy text-[clamp(28px,4vw,52px)] leading-[1.1]">
              Ein Klick. <span className="text-gold italic">Das ganze Bild.</span>
            </h2>
            <p className="mt-8 text-[var(--mid)] leading-relaxed max-w-xl">
              HR öffnet die Plattform selten — und denkt in Zahlen, nicht in Schritt-Listen. Unser
              KI-Ankunfts-Briefing fasst alle laufenden Ankünfte zusammen, markiert Risiken und nennt die
              nächsten Schritte. In Sekunden, auf Deutsch, direkt im Portal.
            </p>
            <a href="/login" className="group mt-9 inline-flex items-center gap-3 text-sm text-navy">
              <span className="border-b border-navy pb-1 transition-colors group-hover:border-gold group-hover:text-gold">
                Im Portal ansehen
              </span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          <div className="space-y-3">
            {CAPS.map((c) => {
              const Icon = c.i;
              return (
                <div key={c.t} className="rounded-2xl p-6 flex gap-4" style={{ background: 'var(--ds-card)', border: '1px solid var(--border)' }}>
                  <div className="w-10 h-10 rounded-lg bg-navy text-cream grid place-items-center shrink-0">
                    <Icon className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <div className="font-semibold text-[15px] text-navy">{c.t}</div>
                    <div className="text-[13px] text-[var(--mid)] mt-1 leading-relaxed">{c.s}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
