import { useState } from 'react';
import {
  Plane, HeartHandshake, Home, GraduationCap, Sparkles,
  FileCheck, ShieldPlus, Ticket, Building2, Landmark, Smartphone, Stethoscope,
  Languages, Stamp, Calculator, Dumbbell, Users, Brain, MapPin, ArrowRight,
} from 'lucide-react';

/**
 * "Die Arrival Journey" — interaktive 5-Phasen-Pipeline (Ökosystem-Vision).
 * Phase 2 "Ankunft" ist heute live; die übrigen Phasen sind das wachsende
 * Service-Netzwerk ("Netzwerk im Aufbau"). Reine Präsentation, kein Backend.
 *
 * Ehrlichkeit: Services sind Kategorien/Beispiele — keine behaupteten Marken-Partnerschaften.
 */

const PHASES = [
  {
    key: 'vor',
    n: '01',
    icon: Plane,
    title: 'Vor der Einreise',
    live: false,
    tagline: 'Bevor das Talent landet, ist alles vorbereitet.',
    services: [
      { i: FileCheck, t: 'Visa & Immigration', s: 'Blue-Card-Spezialisten, Anwälte, Behörden-Vorbereitung.' },
      { i: ShieldPlus, t: 'Versicherung', s: 'Incoming- & Expat-Versicherung ab dem ersten Tag.' },
      { i: Ticket, t: 'Flug & Anreise', s: 'Ankunftsdaten fließen automatisch in die Plattform.' },
    ],
  },
  {
    key: 'ankunft',
    n: '02',
    icon: HeartHandshake,
    title: 'Die Ankunft',
    live: true,
    tagline: 'Unser Kern: ein echter Mensch am Flughafen.',
    services: [
      { i: Users, t: 'Greeter vor Ort', s: 'Persönliche Abholung mit Schild — kein Bot, ein Gesicht.' },
      { i: MapPin, t: 'Erstorientierung', s: 'Erste Wege, erste Worte, erstes Ankommen in der Stadt.' },
      { i: ShieldPlus, t: 'Notfallhilfe', s: 'Erreichbar, wenn es zählt — auch nachts.' },
    ],
  },
  {
    key: '30tage',
    n: '03',
    icon: Home,
    title: 'Die ersten 30 Tage',
    live: false,
    tagline: 'Wohnung, Konto, SIM — das, was sofort Stress macht.',
    services: [
      { i: Building2, t: 'Wohnung', s: 'Serviced Apartments, Corporate Housing, Maklernetzwerk.' },
      { i: Landmark, t: 'Bankkonto', s: 'Kontoeröffnung mit getracktem Status bis zur IBAN.' },
      { i: Smartphone, t: 'Mobilfunk', s: 'SIM, Daten, Erreichbarkeit am ersten Tag.' },
      { i: Stethoscope, t: 'Krankenversicherung', s: 'Anmeldung bei gesetzlichen Kassen, begleitet.' },
    ],
  },
  {
    key: 'integration',
    n: '04',
    icon: GraduationCap,
    title: 'Integration',
    live: false,
    tagline: 'Sprache, Behörden, Steuer — strukturiert begleitet.',
    services: [
      { i: Languages, t: 'Sprache', s: 'Deutschkurse mit nachvollziehbarem Lernfortschritt.' },
      { i: Stamp, t: 'Behördentermine', s: 'Bürgeramt-Begleitung & Übersetzungsdienste.' },
      { i: Calculator, t: 'Steuer & Payroll', s: 'Expat-Steuerberatung und Payroll-Spezialisten.' },
    ],
  },
  {
    key: 'alltag',
    n: '05',
    icon: Sparkles,
    title: 'Der Alltag',
    live: false,
    tagline: 'Hier entsteht echte Bindung — und Bleibebereitschaft.',
    services: [
      { i: Dumbbell, t: 'Freizeit & Community', s: 'Sport, Co-Working, lokale Communities.' },
      { i: Brain, t: 'Mental Health', s: 'Coaching & Expat-Beratung für einen guten Start.' },
    ],
  },
];

export default function ArrivalJourneySection() {
  const [active, setActive] = useState('ankunft');
  const phase = PHASES.find((p) => p.key === active) || PHASES[1];

  return (
    <section id="journey" className="border-t border-[var(--border)] scroll-mt-24">
      <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-28 md:py-36">
        <div className="reveal-on-scroll max-w-[42ch]">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold mb-8">Die Arrival Journey</p>
          <h2 className="font-serif text-navy text-[clamp(28px,4vw,52px)] leading-[1.1]">
            Nicht ein Transfer.<br />
            <span className="text-gold italic">Ein ganzer Ankunftsprozess.</span>
          </h2>
          <p className="mt-8 text-[var(--mid)] leading-relaxed">
            Wir denken nicht in Features, sondern in Lebensphasen — von der Einreise bis zum Alltag.
            Heute begleiten wir die Ankunft. Schritt für Schritt orchestrieren wir das gesamte Netzwerk
            darum herum.
          </p>
        </div>

        {/* Phase rail */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-5 gap-3">
          {PHASES.map((p) => {
            const Icon = p.icon;
            const on = p.key === active;
            return (
              <button
                key={p.key}
                onClick={() => setActive(p.key)}
                className="text-left rounded-2xl p-5 transition-all"
                style={{
                  background: on ? 'var(--navy)' : 'var(--ds-card)',
                  border: `1px solid ${on ? 'var(--navy)' : 'var(--border)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[11px] font-bold tracking-widest ${on ? 'text-gold' : 'text-[var(--light)]'}`}>{p.n}</span>
                  <Icon className={`w-4 h-4 ${on ? 'text-gold' : 'text-[var(--mid)]'}`} />
                </div>
                <div className={`font-serif text-[15px] font-bold leading-tight ${on ? 'text-cream' : 'text-navy'}`}>{p.title}</div>
                <span
                  className="inline-block mt-3 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={p.live
                    ? { background: 'rgba(22,163,74,0.14)', color: '#15803d' }
                    : on ? { background: 'rgba(255,255,255,0.12)', color: 'rgba(244,239,230,0.7)' }
                         : { background: 'rgba(0,0,0,0.04)', color: 'var(--light)' }}
                >
                  {p.live ? 'Live heute' : 'Netzwerk im Aufbau'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active phase detail */}
        <div className="mt-6 rounded-3xl p-7 md:p-10 reveal-on-scroll" style={{ background: 'var(--ds-card)', border: '1px solid var(--border)' }}>
          <p className="font-serif text-[clamp(18px,2.4vw,26px)] text-navy max-w-[30ch]">{phase.tagline}</p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {phase.services.map((s) => {
              const Icon = s.i;
              return (
                <div key={s.t} className="rounded-2xl p-5" style={{ background: 'var(--ds-bg)', border: '1px solid var(--border)' }}>
                  <div className="w-9 h-9 rounded-lg bg-gold/10 grid place-items-center mb-3">
                    <Icon className="w-4 h-4 text-gold" />
                  </div>
                  <div className="font-semibold text-[14px] text-navy">{s.t}</div>
                  <div className="text-[12.5px] text-[var(--mid)] mt-1 leading-relaxed">{s.s}</div>
                </div>
              );
            })}
          </div>

          {!phase.live && (
            <p className="mt-7 text-[12.5px] text-[var(--light)]">
              Diese Phase wird über unser wachsendes Partnernetzwerk orchestriert — direkt aus der Plattform heraus.
            </p>
          )}
        </div>

        <div className="mt-10">
          <a href="#kontakt" className="group inline-flex items-center gap-3 text-sm text-navy">
            <span className="border-b border-navy pb-1 transition-colors group-hover:border-gold group-hover:text-gold">
              Den ganzen Prozess über uns orchestrieren
            </span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
