const INTEGRATIONS = [
  { l: 'HR-Systeme', s: 'Personio · BambooHR · Workday', status: 'live' },
  { l: 'Visa-Plattformen', s: 'Konsulats-API · Make-it-in-Germany', status: 'roadmap' },
  { l: 'Payroll', s: 'DATEV · Lohn AG', status: 'live' },
  { l: 'Wohnungs-Partner', s: 'Wunderflats · Habyt · HomeLike', status: 'live' },
  { l: 'Banken', s: 'N26 · Commerzbank · DKB', status: 'roadmap' },
  { l: 'CRM', s: 'HubSpot · Salesforce', status: 'live' },
  { l: 'Versicherungen', s: 'TK · AOK · Allianz', status: 'roadmap' },
  { l: 'Mobilfunk', s: 'Vodafone · Telekom · 1&1', status: 'live' },
];

export default function IntegrationsSection() {
  return (
    <section id="integrationen" className="py-24" style={{ background: 'var(--ds-bg)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-0.5 bg-gold" />
            <span className="text-[11px] tracking-widest uppercase text-gold font-bold">Integrationen</span>
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight max-w-3xl" style={{ color: 'var(--ds-t1)' }}>
            Eingebettet in Ihren bestehenden Stack — nicht parallel dazu.
          </h2>
          <p className="text-[var(--mid)] mt-5 max-w-2xl leading-relaxed">
            ArrivalOS spielt mit HR-Systemen, Payroll, Banken, Versicherungen und Wohnungs-Partnern zusammen.
            Kein weiteres Daten-Silo, sondern die Klammer um Ihr Ankunfts-Ökosystem.
          </p>

          <div className="grid md:grid-cols-4 gap-4 mt-14">
            {INTEGRATIONS.map((it) => (
              <div key={it.l} className="rounded-3xl p-5 transition hover:shadow-s2" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
                <div className="flex items-center justify-between mb-3 gap-3">
                  <div className="font-semibold text-[13.5px]" style={{ color: 'var(--ds-t1)' }}>{it.l}</div>
                  <span className={`text-[9.5px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${
                    it.status === 'live' ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'text-[var(--light)]'
                  }`}>
                    {it.status === 'live' ? 'Live' : 'In Planung'}
                  </span>
                </div>
                <div className="text-[12px] text-[var(--mid)] leading-relaxed">{it.s}</div>
              </div>
            ))}
          </div>
      </div>
    </section>
  );
}
