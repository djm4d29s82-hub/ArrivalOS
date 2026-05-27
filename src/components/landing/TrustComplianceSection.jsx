import { Shield, Lock, FileCheck2, Globe2, KeyRound } from 'lucide-react';

const BADGES = [
  { i: Shield, t: 'DSGVO-konform', s: 'Datenverarbeitung nach Art. 6 & 9 DSGVO. AV-Verträge auf Anfrage.' },
  { i: KeyRound, t: 'Rollenbasierter Zugriff', s: 'Granulare RBAC: Admin · Company · Greeter · Talent — Least-Privilege.' },
  { i: FileCheck2, t: 'Audit-Logs', s: 'Jede Aktion nachvollziehbar. Wer hat wann was geändert — manipulationssicher.' },
  { i: Globe2, t: 'EU-Hosting', s: 'Server in Frankfurt. Datenverarbeitung ausschließlich in der EU.' },
  { i: Lock, t: 'Verschlüsselung', s: 'TLS 1.3 in transit. AES-256 at rest. Verschlüsselte Dokumenten-Vault.' },
];

export default function TrustComplianceSection() {
  return (
    <section className="py-24 bg-navy">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-0.5 bg-gold" />
          <span className="text-[11px] tracking-widest uppercase text-gold font-bold">Vertrauen &amp; Compliance</span>
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-bold text-cream leading-tight max-w-3xl">
          Bei Mitarbeitenden, Behörden und Audit-Teams beruhigend.
        </h2>
        <p className="text-cream/60 mt-5 max-w-2xl leading-relaxed">
          ArrivalOS ist von Anfang an für regulierte Branchen entworfen: Pflege, Healthcare, öffentliche Träger,
          Konzern-HR. Compliance ist kein Add-On, sondern Fundament.
        </p>

        <div className="grid md:grid-cols-5 gap-4 mt-14">
          {BADGES.map((b) => {
            const Icon = b.i;
            return (
              <div key={b.t} className="bg-white/[0.05] border border-white/[0.08] rounded-3xl p-5 transition hover:bg-white/[0.08] text-center md:text-left">
                <div className="w-10 h-10 rounded-lg bg-gold/10 grid place-items-center mb-4 mx-auto md:mx-0">
                  <Icon className="w-4 h-4 text-gold" />
                </div>
                <div className="font-semibold text-cream text-[13.5px]">{b.t}</div>
                <div className="text-[12px] text-cream/55 mt-1.5 leading-relaxed">{b.s}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-[12px] text-cream/35">
          AV-Vertrag, TOMs und Datenschutz-Folgenabschätzung auf Anfrage. ISO 27001-Vorbereitung in Q3/2026.
        </div>
      </div>
    </section>
  );
}
