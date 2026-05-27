import { Cpu, Workflow, BarChart3, Heart, MapPin, MessagesSquare } from 'lucide-react';

const TECH = [
  { i: Workflow, t: 'Strukturierte Workflows', s: 'Jeder Schritt hat Verantwortlichkeit, Frist und Status.' },
  { i: Cpu, t: 'Eine Plattform für alle', s: 'Admin · Unternehmen · Greeter · Talent — eine Wahrheit.' },
  { i: BarChart3, t: 'Live-Transparenz', s: 'KPIs in Echtzeit: Onboarding-Zeit, Abschlussquote, Mitarbeiterbindung.' },
];

const HUMAN = [
  { i: Heart, t: 'Echte Menschen vor Ort', s: 'Greeter holen ab, übersetzen, begleiten zum Bürgeramt.' },
  { i: MapPin, t: 'Lokales Wissen', s: '42 Städte — jede mit eigenem Greeter-Pool aus der Community.' },
  { i: MessagesSquare, t: 'Persönliche Begleitung', s: 'Kein Bot — eine Person, die sich kümmert. Vom ersten Tag an.' },
];

export default function SolutionSection() {
  return (
    <section id="loesung" className="py-28" style={{ background: 'var(--ds-bg)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-0.5 bg-gold" />
          <span className="text-[11px] tracking-widest uppercase text-gold font-bold">Lösung</span>
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight max-w-3xl reveal-on-scroll" style={{ color: 'var(--ds-t1)' }}>
          Software schafft Struktur. <span className="text-gold">Menschen schaffen Vertrauen.</span>
        </h2>
        <p className="text-[var(--mid)] mt-5 max-w-2xl leading-relaxed">
          ArrivalOS ist kein HR-Tool. Es ist ein Versprechen: Jedes Talent, das nach Deutschland kommt,
          wird von einem echten Menschen begleitet — koordiniert, dokumentiert und live sichtbar für alle Beteiligten.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-14">
          <Pillar title="Digital" subtitle="Die Plattform" items={TECH} accent="navy" />
          <Pillar title="Human" subtitle="Das Greeter-Netzwerk" items={HUMAN} accent="gold" />
        </div>

        <div className="mt-10 max-w-2xl text-[13px] text-[var(--light)] italic">
          „Wir haben zuerst die Operations gebaut — dann die Software. Deshalb versteht ArrivalOS Ankunft nicht als Prozess, sondern als Moment."
        </div>
      </div>
    </section>
  );
}

function Pillar({ title, subtitle, items, accent }) {
  const dark = accent === 'navy';
  return (
    <div
      className={`rounded-3xl p-8 ${dark ? 'bg-navy text-cream' : ''}`}
      style={dark ? undefined : { background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
    >
      <div className="flex items-baseline justify-between mb-7">
        <h3 className={`font-serif text-3xl font-bold ${dark ? 'text-cream' : ''}`} style={dark ? undefined : { color: 'var(--ds-t1)' }}>{title}</h3>
        <span className={`text-[11px] uppercase tracking-widest ${dark ? 'text-gold' : 'text-[var(--light)]'}`}>{subtitle}</span>
      </div>
      <div className="space-y-5">
        {items.map((it) => (
          <div key={it.t} className="flex gap-3.5">
            <div className={`w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 ${dark ? 'bg-white/10' : ''}`} style={dark ? undefined : { background: 'var(--ds-card-border)' }}>
              <it.i className={`w-4 h-4 ${dark ? 'text-gold' : 'text-gold'}`} />
            </div>
            <div>
              <div className={`font-semibold text-[14.5px] ${dark ? 'text-cream' : ''}`} style={dark ? undefined : { color: 'var(--ds-t1)' }}>{it.t}</div>
              <div className={`text-[13px] ${dark ? 'text-cream/60' : 'text-[var(--mid)]'} mt-0.5 leading-relaxed`}>{it.s}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
