import { useState, useMemo } from 'react';
import { TrendingDown, TrendingUp, Coins } from 'lucide-react';

// Annahmen:
//  - Trad. Aufwand pro Talent: 35 HR-Stunden
//  - Mit ArrivalOS: 10 HR-Stunden
//  - Plattform-Kosten: 599 €/Talent (Standard)
//  - Friktion / verpasste Retention: 3.500 € pro Talent (Branchenmittel, traditionell)
export default function RoiSection() {
  const [count, setCount] = useState(10);
  const [rate, setRate] = useState(65);

  const calc = useMemo(() => {
    const tradHours = count * 35 * rate;
    const newHours = count * 10 * rate;
    const platform = count * 599;
    const tradFriction = count * 3500;
    const newFriction = count * 800;
    const tradTotal = tradHours + tradFriction;
    const newTotal = newHours + platform + newFriction;
    const save = tradTotal - newTotal;
    return { tradTotal, newTotal, save, hoursSave: count * 25 };
  }, [count, rate]);

  const fmt = (n) => n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';

  return (
    <section className="py-24 bg-navy">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-0.5 bg-gold" />
          <span className="text-[11px] tracking-widest uppercase text-gold font-bold">ROI-Rechner</span>
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-bold text-cream leading-tight max-w-3xl">
          Was kostet Ihr aktuelles Onboarding wirklich?
        </h2>

        <div className="grid md:grid-cols-2 gap-8 mt-12 items-start">
          <div className="bg-white/[0.05] border border-white/[0.08] rounded-3xl p-7 space-y-7">
            <Slider label="Internationale Talente / Jahr" value={count} setValue={setCount} min={1} max={50} suffix="" />
            <Slider label="HR-Stundensatz (Voll-Kosten)" value={rate} setValue={setRate} min={40} max={120} suffix=" €" />
            <div className="text-[11.5px] text-cream/40 italic pt-2">
              Annahmen: 35 HR-Std/Talent traditionell vs. 10 mit ArrivalOS · 3.500 € Friktionskosten/Talent (verpasste Retention, Fehler) vs. 800 € · Standard-Paket 599 €/Talent.
            </div>
          </div>

          <div className="bg-gold/[0.08] border border-gold/20 rounded-3xl p-7 space-y-5 text-cream">
            <Row icon={TrendingUp} label="Heute (Excel-Mode)" val={fmt(calc.tradTotal)} muted />
            <Row icon={TrendingDown} label="Mit ArrivalOS" val={fmt(calc.newTotal)} muted />
            <div className="border-t border-white/10 pt-5">
              <Row icon={Coins} label="Einsparung / Jahr" val={fmt(calc.save)} highlight />
              <div className="text-[12px] text-cream/55 mt-3">+ {calc.hoursSave} HR-Stunden, die in strategische Arbeit fließen statt in Behördentermine.</div>
            </div>
            <a href="#kontakt" className="btn-gold block text-center">
              Einblick erhalten →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Slider({ label, value, setValue, min, max, suffix }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <label className="text-[12.5px] uppercase tracking-widest text-cream/60 font-semibold">{label}</label>
        <span className="font-serif text-2xl font-bold text-gold">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => setValue(+e.target.value)}
             className="w-full accent-[var(--gold)]" />
    </div>
  );
}

function Row({ icon: I, label, val, highlight, muted }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <I className={`w-4 h-4 ${highlight ? 'text-gold' : 'text-cream/50'}`} />
        <span className={`text-[13px] ${muted ? 'text-cream/65' : 'text-cream'}`}>{label}</span>
      </div>
      <span className={`font-serif font-bold ${highlight ? 'text-3xl text-gold' : 'text-xl text-cream/85'}`}>{val}</span>
    </div>
  );
}
