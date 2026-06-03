import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const FAQS = [
  { q: 'Was unterscheidet Arrival Germany von einem klassischen HR-Tool?',
    a: 'Klassische HR-Tools enden bei Onboarding-Workflows im System. Arrival Germany verbindet Software mit echten Greetern vor Ort — wir lösen den Teil, den keine Software allein lösen kann: jemanden zum Bürgeramt begleiten.' },
  { q: 'Wie schnell ist ein Talent einsatzbereit?',
    a: 'Pilot-Setup in 7 Tagen. Erstes Talent kann unmittelbar gebucht werden. Volle Integration in Ihr HR-System dauert je nach Komplexität 2–6 Wochen.' },
  { q: 'In welchen Sprachen funktioniert die Talent-App?',
    a: 'Aktuell DE und EN. ES, FR, AR, PT und weitere folgen 2026. Greeter-Sprachen abhängig vom Pool — wir matchen aktiv nach Muttersprache.' },
  { q: 'Wie verdienen Greeter?',
    a: '70–120 € pro Einsatz, abhängig von Aufgabe, Region und Sprachkombination. Vollständig in der App ausgewiesen. Vergütung erfolgt monatlich. Steuerlich als Übungsleiter, Minijob oder Selbstständigkeit, je nach Setup.' },
  { q: 'Was passiert mit den Daten der Talente?',
    a: 'Verarbeitung ausschließlich in der EU, gehostet in Frankfurt. DSGVO-konform mit AV-Vertrag. Talente haben volle Auskunfts- und Löschrechte. Sensible Dokumente (Pass, Visa) werden verschlüsselt im Vault gespeichert.' },
  { q: 'Funktioniert das auch außerhalb großer Städte?',
    a: 'Ja. Unser Netzwerk ist in 42 Städten aktiv und wächst monatlich. Für ländliche Regionen ohne festen Greeter-Pool bauen wir auf Anfrage gezielt Kapazität auf — typische Vorlaufzeit 4–8 Wochen.' },
];

export default function FaqSection() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="py-24" style={{ background: 'var(--ds-bg)' }}>
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-0.5 bg-gold" />
          <span className="text-[11px] tracking-widest uppercase text-gold font-bold">FAQ</span>
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight" style={{ color: 'var(--ds-t1)' }}>
          Was Sie wahrscheinlich noch fragen.
        </h2>

        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <div key={i} className="rounded-xl overflow-hidden">
              <button onClick={() => setOpen(open === i ? -1 : i)}
                      className="w-full flex items-center justify-between text-left px-5 py-4 transition">
                <span className="font-semibold text-[14.5px]" style={{ color: 'var(--ds-t1)' }}>{f.q}</span>
                {open === i ? <Minus className="w-4 h-4 text-gold flex-shrink-0" /> : <Plus className="w-4 h-4 text-gold flex-shrink-0" />}
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-[13.5px] text-[var(--mid)] leading-relaxed rounded-xl mt-2" style={{ background: 'var(--ds-card)' }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
