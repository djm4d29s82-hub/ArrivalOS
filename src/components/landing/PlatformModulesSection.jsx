import { LayoutGrid, Building2, Users, Compass, ArrowRight } from 'lucide-react';

const MODULES = [
  {
    i: LayoutGrid, role: 'Operations', name: 'Admin-Konsole',
    desc: 'Steuerzentrale für Operations: SOPs, Eskalationen, Qualitätskontrolle, Greeter-Allokation.',
    features: ['SOP-Bibliothek', 'Eskalations-Workflow', 'Kennzahlen-Dashboard', 'Greeter-Pool-Steuerung'],
  },
  {
    i: Building2, role: 'HR-Team', name: 'Unternehmensportal',
    desc: 'Self-Service für HR: Talente einbuchen, Status verfolgen, Dokumente einsehen, KPIs reporten.',
    features: ['Talent-Liste', 'Mission-Tracking', 'Dokumenten-Vault', 'KPI-Export'],
  },
  {
    i: Users, role: 'Lokal vor Ort', name: 'Greeter App',
    desc: 'Mobile-first App für lokale Greeter: Aufträge, Schritt-für-Schritt SOPs, Foto-Belege, Zeiterfassung.',
    features: ['Auftragsfeed', 'In-App-Chat', 'Foto-Uploads', 'Vergütung tracken'],
  },
  {
    i: Compass, role: 'Talent', name: 'Kandidatenreise',
    desc: 'Geführte Erfahrung für das ankommende Talent: was passiert wann, wer kümmert sich, was muss ich tun?',
    features: ['Timeline-Ansicht', 'Greeter-Profil', 'Dokumenten-Checkliste', 'Mehrsprachig (DE/EN/...)'],
  },
];

export default function PlatformModulesSection() {
  return (
    <section id="plattform" className="py-24" style={{ background: 'var(--ds-bg)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-0.5 bg-gold" />
            <span className="text-[11px] tracking-widest uppercase text-gold font-bold">Plattform</span>
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight max-w-3xl" style={{ color: 'var(--ds-t1)' }}>
            Vier Rollen. Vier Module. Eine Wahrheit.
          </h2>
          <p className="text-[var(--mid)] mt-5 max-w-2xl leading-relaxed">
            ArrivalOS ist keine zusätzliche Insel. Es ist eine rollenbasierte Plattform, die jede Stakeholder-Gruppe
            mit exakt dem Interface ausstattet, das sie braucht — auf dem gleichen Daten-Backbone.
          </p>

          <div className="grid md:grid-cols-2 gap-5 mt-14">
            {MODULES.map((m) => {
              const Icon = m.i;
              return (
                <div key={m.name} className="rounded-3xl p-7 transition hover:shadow-s2" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-navy/10 dark:bg-white/[0.10] grid place-items-center">
                      <Icon className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-[var(--light)]">{m.role}</div>
                      <div className="font-serif text-xl font-bold" style={{ color: 'var(--ds-t1)' }}>{m.name}</div>
                    </div>
                  </div>
                  <p className="text-[13.5px] text-[var(--mid)] leading-relaxed mb-5">{m.desc}</p>
                  <ul className="grid grid-cols-2 gap-2 text-[12.5px]" style={{ color: 'var(--ds-t2)' }}>
                    {m.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-gold" />{f}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex items-center justify-center">
            <a href="#demo" className="btn-primary inline-flex items-center gap-2 text-sm">
              Live-Demo der Plattform <ArrowRight className="w-4 h-4" />
            </a>
          </div>
      </div>
    </section>
  );
}
