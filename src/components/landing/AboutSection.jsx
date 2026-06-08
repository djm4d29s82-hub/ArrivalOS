/**
 * "Wer wir sind" — ruhige Cream-Editorial-Sektion. Gründer-geführte Story + Mission.
 * Positionierung: Arrival Germany als Operating-System-Layer für internationale Relocation.
 * Öffentlich wird bewusst nur ein Co-Founder gezeigt (Anton Rauschenbach, mit Porträt).
 */
export default function AboutSection() {
  return (
    <section id="ueber-uns" className="border-t border-[var(--border)] scroll-mt-24">
      <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-28 md:py-36 reveal-on-scroll">
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold mb-10">Wer wir sind</p>

        <p className="font-serif text-navy text-[clamp(22px,3vw,38px)] leading-[1.3] max-w-[24ch] mb-16">
          Niemand sollte in einer neuen Stadt ankommen und sich verloren fühlen.
          <span className="text-[var(--mid)]"> Eine gute Ankunft ist kein Onboarding-Ticket — sie ist
          ein Mensch, der die Tür öffnet.</span>
        </p>

        <div className="grid md:grid-cols-[1.4fr_1fr] gap-16 md:gap-20 items-start">
          <div>
            <h2 className="font-serif text-navy text-[clamp(28px,4vw,52px)] leading-[1.1] max-w-[16ch]">
              Wir bauen die <span className="text-gold italic">Betriebsschicht</span> für internationale Ankunft.
            </h2>
            <p className="mt-8 text-[var(--mid)] leading-relaxed max-w-xl">
              Arrival Germany ist kein weiteres HR-Tool. Wir haben zuerst die Operations gebaut — die echte
              Wegbegleitung vor Ort — und dann die Software. Deshalb verstehen wir Ankunft nicht als Prozess,
              sondern als Moment, in dem ein Mensch sich entscheidet, ob er bleibt.
            </p>
          </div>

          <div className="rounded-2xl p-8" style={{ background: 'var(--ds-card)', border: '1px solid var(--border)' }}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--light)] mb-6">Gegründet von</p>
            <div className="flex items-center gap-4">
              <img
                src="/anton-rauschenbach.png"
                alt="Anton Rauschenbach"
                loading="lazy"
                className="w-16 h-16 rounded-full shrink-0 object-cover"
                style={{ background: 'var(--cream, #f5f1e8)', border: '1px solid var(--border)' }}
              />
              <div>
                <div className="font-semibold text-[16px] text-navy">Anton Rauschenbach</div>
                <div className="text-[12px] text-[var(--light)]">Mitgründer</div>
              </div>
            </div>
            <p className="mt-7 pt-6 border-t border-[var(--border)] font-serif italic text-[14px] text-[var(--mid)] leading-relaxed">
              „Ankunft beginnt mit Menschen — Struktur macht sie verlässlich."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
