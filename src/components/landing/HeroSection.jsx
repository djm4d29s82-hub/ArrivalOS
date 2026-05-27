import { ArrowRight, Sparkles } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative pt-36 pb-28 overflow-hidden">
      {/* Dark cinematic background */}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
           style={{ background: 'linear-gradient(150deg, #0e1520 0%, #141f38 40%, #1a2a48 75%, #0a1018 100%)' }} />
      {/* Subtle grid */}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
           style={{
             backgroundImage: 'linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px)',
             backgroundSize: '72px 72px',
             maskImage: 'radial-gradient(ellipse 80% 65% at 50% 50%, black 20%, transparent 80%)',
           }} />
      {/* Gold glow — animated ambient drift */}
      <div aria-hidden className="absolute pointer-events-none animate-ambient"
           style={{ top: '-20%', left: '-10%', width: '65vw', height: '65vw',
                    background: 'radial-gradient(circle, rgba(196,146,40,.13) 0%, transparent 65%)' }} />
      {/* Cool blue depth — bottom-right counter-glow */}
      <div aria-hidden className="absolute pointer-events-none"
           style={{ bottom: '-15%', right: '-5%', width: '55vw', height: '55vw',
                    background: 'radial-gradient(circle, rgba(26,80,160,.09) 0%, transparent 65%)' }} />
      {/* Center atmospheric haze */}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 60% 50% at 30% 60%, rgba(26,35,64,.18), transparent)' }} />

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="max-w-3xl glass-dark rounded-3xl p-10">
          <div className="inline-flex items-center gap-2 bg-white/[0.06] rounded-full px-3 py-1.5 mb-6 text-[11.5px]">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span className="text-white/60">42 deutsche Städte · Ein Mensch wartet vielleicht schon auf dein Talent.</span>
          </div>
          <h1 className="font-serif text-[clamp(36px,6vw,64px)] font-bold text-white leading-[1.02] tracking-[-0.02em]">
            Arrival OS
            <div className="text-[20px] font-medium text-white/60 mt-2">Plattform für menschliches Onboarding internationaler Talente</div>
          </h1>
          <p className="text-[16px] text-white/65 leading-relaxed mt-5 max-w-2xl">
            Wenn Menschen neu anfangen, zählen die ersten Stunden. Arrival OS koordiniert greifbare Ankunftsmomente — persönlich, sicher, verlässlich.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-8">
            <a href="#unternehmen" className="btn-gold">
              Für Unternehmen <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#greeter" className="btn-on-dark">
              Greeter werden
            </a>
            <a href="#demo" className="btn-on-dark">
              Plattform entdecken <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
