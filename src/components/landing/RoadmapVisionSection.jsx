import { Rocket, MapPin, Layers, Globe } from 'lucide-react';

const PHASES = [
  {
    p: 'Phase 1', y: '2025 – 2026', i: Rocket, t: 'MVP &amp; Pilotkunden',
    s: 'Plattform live in 3 Pilot-Städten (München, Berlin, Hamburg). Greeter-Onboarding skaliert. Erste 500 Talente begleitet.',
    state: 'now',
  },
  {
    p: 'Phase 2', y: '2026 – 2027', i: MapPin, t: 'Nationale Skalierung',
    s: '42 Städte in Deutschland aktiv. HR-Integrationen mit Personio, BambooHR, DATEV. Branchenpakete für Pflege &amp; IT.',
    state: 'next',
  },
  {
    p: 'Phase 3', y: '2027 – 2028', i: Layers, t: 'Plattform-Hub',
    s: 'Öffnung für 3rd-Party-Services: Wohnungsanbieter, Versicherer, Banken. Arrival Germany wird zum Hub des Ankunfts-Ökosystems.',
    state: 'future',
  },
  {
    p: 'Phase 4', y: '2028+', i: Globe, t: 'Europäisches Arrival-Ökosystem',
    s: 'Expansion: Österreich, Niederlande, Schweden. Arrival Germany als Standard für strukturiertes Onboarding internationaler Talente in Europa.',
    state: 'future',
  },
];

export default function RoadmapVisionSection() {
  return (
    <section id="vision" className="py-24 bg-navy text-cream relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 opacity-[0.05]"
           style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, var(--gold) 0, transparent 50%)' }} />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="glass-dark rounded-3xl p-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-0.5 bg-gold" />
            <span className="text-[11px] tracking-widest uppercase text-gold font-bold">Vision &amp; Roadmap</span>
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight max-w-3xl">
            Vom Service zur <span className="text-gold">Plattform</span>. Vom Land zum Kontinent.
          </h2>
          <p className="text-cream/65 mt-5 max-w-2xl leading-relaxed">
            Wir glauben: Deutschland — und Europa — wird die nächsten zwei Jahrzehnte international rekrutieren müssen.
            Arrival Germany ist die Infrastruktur, die das menschlich und skalierbar macht.
          </p>

          <div className="relative mt-16">
            <div className="absolute left-7 top-0 bottom-0 w-px bg-white/10" />
            <div className="space-y-10">
              {PHASES.map((ph) => (
                <div key={ph.p} className="flex gap-6 items-start relative">
                  <div className={`relative z-10 w-14 h-14 rounded-full grid place-items-center flex-shrink-0 border-2 ${
                    ph.state === 'now' ? 'bg-gold border-gold' : ph.state === 'next' ? 'bg-navy-2 border-gold/40' : 'bg-navy-2 border-white/10'
                  }`}>
                    <ph.i className={`w-5 h-5 ${ph.state === 'now' ? 'text-navy' : 'text-gold'}`} />
                  </div>
                  <div className="glass-dark border border-white/10 rounded-2xl p-6">
                    <div className="flex items-baseline gap-3 mb-2">
                      <div className="text-[10px] uppercase tracking-widest text-gold font-bold">{ph.p} · {ph.y}</div>
                      {ph.state === 'now' && <span className="text-[9.5px] uppercase tracking-widest bg-gold text-navy px-2 py-0.5 rounded-full font-bold">Aktuell</span>}
                    </div>
                    <div className="font-serif text-2xl font-bold" dangerouslySetInnerHTML={{ __html: ph.t }} />
                    <div className="text-[13.5px] text-cream/65 mt-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: ph.s }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
