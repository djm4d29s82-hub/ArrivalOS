import { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';

const TIERS = [
  {
    name: 'Starter',
    eyebrow: 'Der professionelle erste Eindruck',
    price: '490',
    period: '/ Kandidat:in',
    desc: 'Sicher ankommen. Persönlich begleitet. Vom ersten Schritt an.',
    outcomes: [
      'Flughafen- oder Bahnhofsabholung',
      'Transfer zur Unterkunft',
      'Deutsche SIM-Karte & Ersteinrichtung',
      'Persönliches Welcome Briefing',
      'WhatsApp-Support & Realtime Updates',
      'Live Einsatzstatus & Ankunfts-Tracking',
    ],
    moreOutcomes: [
      'Check-in Unterstützung',
      'Hilfe beim ersten Einkauf',
      'Einsatzdokumentation',
    ],
    cta: 'Erstgespräch vereinbaren',
    ctaHref: '#kontakt',
    primary: false,
    tag: null,
  },
  {
    name: 'Professional',
    eyebrow: 'Der strukturierte Start in Deutschland',
    price: '690',
    period: '/ Kandidat:in',
    desc: 'Integration von Tag 1. Behörden, Dokumente, Banking — alles koordiniert.',
    outcomes: [
      'Alles aus Starter',
      'Bürgeramt & Anmeldung',
      'Unterstützung bei Kontoeröffnung',
      'Dokumentenmanagement & Uploads',
      'Unternehmensdashboard + HR-Übersicht',
      'Kandidatenstatus in Echtzeit',
    ],
    moreOutcomes: [
      'Wohnungsgeberbestätigung',
      'Terminorganisation & Koordination',
      'Übersetzungshilfe vor Ort',
      'Kommentare & Notizen',
    ],
    cta: 'Plattform-Demo ansehen',
    ctaHref: '#demo',
    primary: true,
    tag: 'Beliebteste',
  },
  {
    name: 'Enterprise',
    eyebrow: 'Vollständige Arrival-Operations',
    price: null,
    period: 'ab €900 / Kandidat:in',
    desc: 'Volle Arrival Germany Plattform. Dedizierter Arrival Manager. Skalierbar.',
    outcomes: [
      'Alles aus Professional',
      'Account Manager',
      'Echtzeit-Operations-Monitoring',
      'API- & Systemintegrationen',
      'SLA-Management & Eskalation',
      'Multi-Standort-Verwaltung',
    ],
    moreOutcomes: [
      'KPI-Berichte & Analytics',
      'Individuelle Dashboards & Workflows',
      'Rollen- & Rechteverwaltung',
      'Mehrsprachiger Premium-Support',
      'Unterkunftskoordination',
    ],
    cta: 'Enterprise Gespräch buchen',
    ctaHref: '#kontakt',
    primary: false,
    tag: null,
  },
];

export default function PricingSection() {
  return (
    <section id="preise" className="py-24" style={{ background: 'var(--ds-bg)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-0.5 bg-gold" />
          <span className="text-[11px] tracking-widest uppercase text-gold font-bold">Transparente Preise</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-14">
          <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight" style={{ color: 'var(--ds-t1)' }}>
            Transparente Pakete für modernes<br />
            <span className="text-gold">internationales Onboarding.</span>
          </h2>
          <p className="text-[var(--mid)] text-[14px] max-w-xs leading-relaxed md:text-right">
            Faire Pauschalen. Menschliche Betreuung<br className="hidden md:block" /> + SaaS-Plattform. Ohne Setup-Gebühr.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {TIERS.map((t) => <TierCard key={t.name} tier={t} />)}
        </div>

        <div className="mt-10 pt-8 flex flex-wrap items-center justify-between gap-4" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
          <div className="flex flex-wrap gap-4 text-[12.5px] text-[var(--mid)]">
            {['Plattform-Zugang', 'Greeter-Netzwerk', 'DSGVO-konform', 'EU-Hosting'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-gold" /> {item}
              </span>
            ))}
          </div>
          <a href="#kontakt" className="text-[12.5px] text-gold font-medium hover:text-gold-2 transition inline-flex items-center gap-1">
            Individuelles Angebot anfragen <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function TierCard({ tier }) {
  const [expanded, setExpanded] = useState(false);
  const dark = tier.primary;
  return (
    <div
      className={`relative rounded-3xl p-8 flex flex-col transition-all ${dark ? 'bg-navy text-cream shadow-s3 ring-1 ring-gold/40 scale-[1.02] z-10' : ''}`}
      style={dark ? undefined : { background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
    >
      {dark && (
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(196,146,40,.08) 0%, transparent 70%)' }}
        />
      )}

      {tier.tag && (
        <div className="absolute -top-3 left-7 bg-gold text-navy text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
          {tier.tag}
        </div>
      )}

      <div className="relative flex-1 flex flex-col">
        <div className={`text-[10px] uppercase tracking-[0.18em] font-bold mb-3 ${dark ? 'text-gold' : 'text-[var(--light)]'}`}>
          {tier.eyebrow}
        </div>

        <div className={`font-serif text-2xl font-bold ${dark ? 'text-cream' : ''}`}>{tier.name}</div>

        <div className="mt-4 flex items-baseline gap-1.5">
          {tier.price ? (
            <>
              <span className={`font-serif text-5xl font-bold leading-none ${dark ? 'text-gold' : ''}`}>
                €{tier.price}
              </span>
              <span className={`text-[12px] ${dark ? 'text-cream/50' : 'text-[var(--light)]'}`}>{tier.period}</span>
            </>
          ) : (
            <span className={`font-serif text-[17px] font-semibold leading-tight ${dark ? 'text-cream/80' : 'text-[var(--mid)]'}`}>
              {tier.period}
            </span>
          )}
        </div>

        <p className={`text-[13px] mt-3 leading-relaxed ${dark ? 'text-cream/60' : 'text-[var(--mid)]'}`}>{tier.desc}</p>

        <div className={`mt-6 pt-6 border-t flex-1 space-y-2.5 ${dark ? 'border-white/[0.08]' : ''}`} style={dark ? undefined : { borderColor: 'var(--ds-card-border)' }}>
          {tier.outcomes.map((o) => <OutcomeLine key={o} text={o} dark={dark} />)}
          {expanded && tier.moreOutcomes.map((o) => <OutcomeLine key={o} text={o} dark={dark} />)}
          {tier.moreOutcomes.length > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className={`text-[11.5px] font-medium pt-1 transition ${dark ? 'text-gold/70 hover:text-gold' : 'text-gold hover:text-gold-2'}`}
            >
              {expanded ? '↑ Weniger anzeigen' : `+ ${tier.moreOutcomes.length} weitere Leistungen`}
            </button>
          )}
        </div>

        <a
          href={tier.ctaHref}
          className={`mt-7 block text-center px-5 py-3 rounded-full text-[13px] font-medium transition-all ${
            dark
              ? 'bg-gold text-navy hover:bg-gold-2'
              : 'bg-navy text-cream hover:bg-navy-2'
          }`}
        >
          {tier.cta}
        </a>
      </div>
    </div>
  );
}

function OutcomeLine({ text, dark }) {
  return (
    <div className="flex items-start gap-2.5">
      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gold" />
      <span className={`text-[13px] ${dark ? 'text-cream/80' : 'text-[var(--mid)]'}`}>{text}</span>
    </div>
  );
}
