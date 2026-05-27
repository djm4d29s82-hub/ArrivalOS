import { HeartPulse, Cpu, Wrench, Truck, Building, Rocket } from 'lucide-react';

const SECTORS = [
  { i: HeartPulse, l: 'Pflege' },
  { i: Cpu, l: 'IT & Software' },
  { i: Wrench, l: 'Engineering' },
  { i: Truck, l: 'Logistik' },
  { i: Building, l: 'Mittelstand' },
  { i: Rocket, l: 'Startups' },
];

export default function TrustBar() {
  return (
    <section className="py-10 bg-navy border-t border-b border-white/[0.07]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center text-[10.5px] uppercase tracking-[0.22em] text-white/35 mb-6">
          Aufgebaut für die Branchen, die Deutschland am Laufen halten
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {SECTORS.map((s) => (
            <div key={s.l} className="bg-white/[0.05] border border-white/[0.07] rounded-2xl py-5 flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition">
              <s.i className="w-5 h-5 text-gold" />
              <span className="text-[12px] text-cream/80 font-medium">{s.l}</span>
            </div>
          ))}
        </div>
        <div className="text-center text-[11px] text-white/30 mt-6">
          Made in Germany · DSGVO-konform · Hosting in der EU
        </div>
      </div>
    </section>
  );
}
