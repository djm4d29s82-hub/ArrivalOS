import { Plane, MapPin, Home, HandshakeIcon, Smartphone, FileText, Landmark, CheckCircle2 } from 'lucide-react';

const STEPS = [
  { n: 1, i: Plane, t: 'Flug & Visa', s: 'Reise gebucht, Visa-Status getrackt, Ankunft kommuniziert.' },
  { n: 2, i: MapPin, t: 'Ankunft', s: 'Greeter holt am Flughafen / Bahnhof ab — mit Namensschild und Plan.' },
  { n: 3, i: Home, t: 'Unterkunft', s: 'Übergabe der Wohnung / des Apartments, Schlüssel, erste Einkäufe.' },
  { n: 4, i: HandshakeIcon, t: 'Greeter-Match', s: 'Persönlicher Greeter für die ersten 4 Wochen — als feste Bezugsperson.' },
  { n: 5, i: Smartphone, t: 'SIM-Karte', s: 'Deutsche Telefonnummer eingerichtet — Voraussetzung für Bank & Anmeldung.' },
  { n: 6, i: FileText, t: 'Anmeldung', s: 'Begleitung zum Bürgeramt, Übersetzung, Meldebescheinigung gesichert.' },
  { n: 7, i: Landmark, t: 'Bankkonto', s: 'Termin bei Bank organisiert, Eröffnung begleitet — Gehalt kann fließen.' },
  { n: 8, i: CheckCircle2, t: 'Onboarded', s: 'Erster Arbeitstag. Übergabe an das Unternehmen. Mission abgeschlossen.' },
];

export default function CandidateJourneySection() {
  return (
    <section id="journey" className="py-28 bg-navy">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-0.5 bg-gold" />
          <span className="text-[11px] tracking-widest uppercase text-gold font-bold">Die Ankunfts-Journey</span>
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-bold text-cream leading-tight max-w-3xl reveal-on-scroll">
          Acht Momente. Vom ersten Schritt bis zum ersten Arbeitstag.
        </h2>
        <p className="text-cream/60 mt-5 max-w-2xl leading-relaxed">
          Jede Mission folgt dem gleichen, operativ erprobten Pfad. Jeder Schritt ist klar definiert,
          jemand ist verantwortlich, der Status ist für alle sichtbar.
        </p>

        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-2xl p-5 hover:bg-white/[0.08] transition-all duration-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gold/15 text-gold font-bold text-[13px] grid place-items-center">{s.n}</div>
                <s.i className="w-4 h-4 text-gold" />
              </div>
              <div className="font-serif text-lg font-bold text-cream">{s.t}</div>
              <div className="text-[12.5px] text-cream/60 mt-1.5 leading-relaxed">{s.s}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-[12px]">
          <Badge>Ø 14 Tage bis zum Start</Badge>
          <Badge>96% Completion-Rate</Badge>
          <Badge>4.8 / 5 Talent-Zufriedenheit</Badge>
        </div>
      </div>
    </section>
  );
}

function Badge({ children }) {
  return (
    <span className="bg-white/[0.06] inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-cream/80 border border-white/[0.10]">
      <span className="w-1.5 h-1.5 rounded-full bg-gold" />{children}
    </span>
  );
}
