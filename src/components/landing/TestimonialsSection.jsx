import { Quote } from 'lucide-react';

const VOICES = [
  {
    role: 'HR-Leitung', name: 'Dr. Katja Renner', org: 'Klinikum NordWest · 320 Pflegekräfte/Jahr',
    quote: 'Vorher: drei Excel-Listen und ein WhatsApp-Chaos. Heute öffne ich ein Dashboard und sehe, wo jede einzelne Pflegekraft im Onboarding steht. Das hat unsere HR-Arbeit verändert.',
  },
  {
    role: 'Internationales Talent', name: 'Rafael Méndez', org: 'Software Engineer · Berlin, aus Buenos Aires',
    quote: 'Drei Tage nach der Landung hatte ich Wohnung, SIM, Bankkonto und eine Person, die mich beim Bürgeramt begleitete. Ich hätte es nie allein geschafft.',
  },
  {
    role: 'Greeterin', name: 'Sophie Brandão', org: 'Greeterin in München · seit 2024',
    quote: 'Ich war selbst Expat. Heute helfe ich anderen — flexibel, fair bezahlt, mit einer App, die wirklich funktioniert. Es ist der sinnvollste Nebenjob, den ich je hatte.',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-navy">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-0.5 bg-gold" />
          <span className="text-[11px] tracking-widest uppercase text-gold font-bold">Stimmen</span>
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-bold text-cream leading-tight max-w-3xl">
          Drei Perspektiven. Eine Plattform, die alle drei zufrieden stellt.
        </h2>

        <div className="grid md:grid-cols-3 gap-5 mt-14">
          {VOICES.map((v) => (
            <div key={v.name} className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-6 hover:bg-white/[0.08] transition">
              <Quote className="w-7 h-7 text-gold mb-4" />
              <div className="font-serif italic text-[15px] text-cream/85 leading-relaxed">„{v.quote}"</div>
              <div className="mt-6 pt-5 border-t border-white/[0.08]">
                <div className="text-[10px] uppercase tracking-widest text-gold font-bold">{v.role}</div>
                <div className="font-semibold text-cream text-[14px] mt-1">{v.name}</div>
                <div className="text-[12px] text-cream/55">{v.org}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
