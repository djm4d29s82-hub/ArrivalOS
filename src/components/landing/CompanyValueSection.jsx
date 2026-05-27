import { Eye, Zap, Briefcase, Heart, Languages, ShieldCheck, ArrowRight } from 'lucide-react';

const BENEFITS = [
  { i: Eye,         t: 'Volle Transparenz',            s: 'Echtzeit-Sicht auf jede Mission. Keine HR-Sonderschicht, um den Status abzufragen.' },
  { i: Zap,         t: 'Schneller produktiv',           s: 'Ø 14 Tage bis zur produktiven Integration statt 6 Wochen Improvisation.' },
  { i: Briefcase,   t: 'Weniger HR-Last',               s: 'Bis zu 70% weniger administrative Aufwände beim internationalen Onboarding.' },
  { i: Heart,       t: 'Bessere Mitarbeiter­erfahrung', s: 'Talente werden begleitet — nicht abgegeben. Das spüren sie ab Tag 1.' },
  { i: Languages,   t: 'Echte Integration',             s: 'Sprache, Behörden, Alltag — Greeter machen Deutschland zugänglich.' },
  { i: ShieldCheck, t: 'Weniger Fehler',                s: 'SOPs & Audit-Logs verhindern verpasste Fristen und teure Wiederholungen.' },
];

export default function CompanyValueSection() {
  return (
    <section id="unternehmen" className="py-28" style={{ background: 'var(--ds-bg)' }}>
      <div className="max-w-7xl mx-auto px-6">

        {/* Section intro */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-0.5 bg-gold" />
          <span className="text-[11px] tracking-widest uppercase text-gold font-bold">Für Unternehmen</span>
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight max-w-3xl reveal-on-scroll" style={{ color: 'var(--ds-t1)' }}>
          Internationales Onboarding als{' '}
          <em className="not-italic text-gold">Infrastruktur.</em>
        </h2>
        <p className="text-[var(--mid)] mt-5 max-w-2xl leading-relaxed">
          Internationale Fachkräfte erfolgreich integrieren — ohne Relocation-Komplexität.
          ArrivalOS kombiniert menschliche Unterstützung vor Ort mit moderner Plattformtechnologie.
        </p>
        <div className="flex flex-wrap gap-3 mt-7">
          <a href="#preise" className="btn-primary inline-flex items-center gap-1.5">
            Pakete ansehen <ArrowRight className="w-3.5 h-3.5" />
          </a>
          <a href="#kontakt" className="btn-outline inline-flex items-center">
            Angebot anfragen
          </a>
          <a href="#demo" className="btn-outline inline-flex items-center gap-1.5" style={{ color: 'var(--mid)' }}>
            ▶ Live-Demo ansehen
          </a>
        </div>

        {/* Benefits grid */}
        <div className="grid md:grid-cols-3 gap-4 mt-14">
          {BENEFITS.map((b) => {
            const Icon = b.i;
            return (
              <div key={b.t} className="rounded-2xl p-6 hover:border-gold/30 transition" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
                <div className="w-10 h-10 rounded-lg bg-gold/10 grid place-items-center mb-4">
                  <Icon className="w-4 h-4 text-gold" />
                </div>
                <div className="font-serif text-lg font-bold" style={{ color: 'var(--ds-t1)' }}>{b.t}</div>
                <div className="text-[13px] text-[var(--mid)] mt-1.5 leading-relaxed">{b.s}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
