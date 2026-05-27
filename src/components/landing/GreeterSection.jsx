import { GraduationCap, Globe, Users, ArrowRight, Wallet, Calendar, Star } from 'lucide-react';

const TYPES = [
  { i: GraduationCap, t: 'Studenten', s: 'Flexibler Nebenjob mit Sinn — perfekt zwischen Vorlesungen.' },
  { i: Globe, t: 'Expats', s: 'Du kamst selbst nach Deutschland — heute hilfst du anderen, anzukommen.' },
  { i: Users, t: 'Community Partner', s: 'Vereine, Kirchen, Diaspora-Organisationen werden Teil des Netzwerks.' },
];

const STEPS = [
  { n: 1, t: 'Bewerben', s: 'Kurzes Profil, Sprachen, Verfügbarkeit.' },
  { n: 2, t: 'Onboarding-Call', s: '30 Min mit unserem Operations-Team.' },
  { n: 3, t: 'Schulung', s: 'SOPs, Datenschutz, Code of Conduct.' },
  { n: 4, t: 'Erste Mission', s: 'Begleitet bei deinem ersten Talent — bezahlt.' },
];

export default function GreeterSection() {
  return (
    <section id="greeter" className="py-24 bg-navy text-cream relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 opacity-[0.04] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, var(--gold) 0, transparent 40%)' }} />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-0.5 bg-gold" />
          <span className="text-[11px] tracking-widest uppercase text-gold font-bold">Für Greeter</span>
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight max-w-3xl">
          Werde Teil eines Netzwerks, das Ankommen <span className="text-gold">menschlich</span> macht.
        </h2>
        <p className="text-cream/65 mt-5 max-w-2xl leading-relaxed">
          Greeter sind das Herzstück von ArrivalOS. Du holst Talente ab, übersetzt beim Bürgeramt,
          zeigst die ersten Wege — und wirst dafür fair bezahlt. Mit voller App-Unterstützung.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mt-14">
          {TYPES.map((t) => (
            <div key={t.t} className="glass-dark rounded-2xl p-6 transition">
              <div className="w-10 h-10 rounded-lg bg-gold/15 grid place-items-center mb-4">
                <t.i className="w-4 h-4 text-gold" />
              </div>
              <div className="font-serif text-xl font-bold">{t.t}</div>
              <div className="text-[13px] text-cream/65 mt-1.5 leading-relaxed">{t.s}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-14 items-start">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-gold/80 mb-4">So wirst du Greeter</div>
            <ol className="space-y-3">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-gold/15 text-gold font-bold grid place-items-center flex-shrink-0 text-sm">{s.n}</div>
                  <div>
                    <div className="font-semibold">{s.t}</div>
                    <div className="text-[12.5px] text-cream/55">{s.s}</div>
                  </div>
                </li>
              ))}
            </ol>
            <a href="#kontakt" className="mt-7 inline-flex items-center gap-2 btn-gold">
              Greeter werden <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="space-y-4">
            <div className="glass-dark rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-gold" />
                <div className="text-[11px] uppercase tracking-widest text-gold">Vergütung</div>
              </div>
              <div className="font-serif text-4xl font-bold text-cream">70 – 120 €<span className="text-lg text-cream/50"> / Einsatz</span></div>
              <div className="text-[12.5px] text-cream/60 mt-2">Pro abgeschlossenem Einsatz. Transparent in der App ausgewiesen.</div>
            </div>
            <div className="glass-dark p-6">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gold" />
                <div className="text-[11px] uppercase tracking-widest text-gold">Flexibilität</div>
              </div>
              <div className="text-[13.5px] text-cream/75 leading-relaxed">Du nimmst Aufträge an, wenn sie passen. Keine Schichten, keine Mindestverpflichtung.</div>
            </div>
            <div className="glass-dark p-6">
              <div className="flex items-center gap-2 mb-2"><Star className="w-4 h-4 text-gold" /><div className="text-[11px] uppercase tracking-widest text-gold">Stimme aus dem Netzwerk</div></div>
              <div className="font-serif italic text-[14px] text-cream/80 leading-relaxed">„Ich bin selbst aus Brasilien hierher. Greeter zu sein gibt mir das Gefühl, etwas zurückzugeben — und nebenbei verdiene ich gut."</div>
              <div className="text-[11.5px] text-cream/45 mt-3">— Sophie B., Greeterin in München</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
