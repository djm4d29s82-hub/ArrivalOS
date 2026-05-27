import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ContactSection from '@/components/landing/ContactSection';
import useScrollReveal from '@/lib/useScrollReveal';
import { usePublicTheme } from '@/lib/usePublicTheme';

/**
 * Ruhige Single-Page-Landing im Calm-Canvas-Stil.
 * Strikt vom Produkt getrennt: nur Bedeutung & Vertrauen — kein Showcase, keine Panels,
 * keine Feature-Sektionen. Das System lebt ausschließlich hinter dem Login.
 * Vier Sektionen: Hero · Manifest · Zwei Pfade · Kontakt.
 */
export default function Landing() {
  usePublicTheme();
  useScrollReveal();

  return (
    <div className="bg-cream">
      <Navbar />
      <main id="main-content" className="pt-16">

        {/* ── HERO ── */}
        <section className="relative min-h-[90vh] flex items-center">
          <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-24 md:py-32 w-full">
            <p className="animate-fade-in text-[11px] uppercase tracking-[0.28em] text-[var(--mid)] mb-10">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold mr-3 align-middle" />
              Human Arrival · Made in Germany
            </p>
            <h1 className="font-serif text-navy text-[clamp(44px,7vw,104px)] leading-[1.02] max-w-[18ch]">
              Ankunft,<br />
              <span className="text-gold italic">menschlich</span> gemacht.
            </h1>
            <p className="mt-10 max-w-xl text-lg text-[var(--mid)] leading-relaxed">
              NeuLand begleitet internationale Fachkräfte in den ersten Wochen in einer neuen Stadt —
              mit echten Menschen vor Ort, nicht mit einer App, die sie alleine lässt.
            </p>
            <div className="mt-12 flex items-center gap-8 flex-wrap">
              <a href="#unternehmen" className="group inline-flex items-center gap-3 text-sm text-navy">
                <span className="border-b border-navy pb-1 transition-colors group-hover:border-gold group-hover:text-gold">
                  Für Unternehmen
                </span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a href="#greeter" className="text-sm text-[var(--mid)] hover:text-navy transition-colors">
                Greeter werden
              </a>
            </div>
          </div>
        </section>

        {/* ── MANIFEST ── */}
        <section className="border-t border-[var(--border)]">
          <div className="max-w-[980px] mx-auto px-6 md:px-10 py-28 md:py-40 reveal-on-scroll">
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold mb-10">Was wir glauben</p>
            <p className="font-serif text-navy text-[clamp(26px,3.6vw,46px)] leading-[1.28]">
              Niemand sollte in einer neuen Stadt ankommen und sich verloren fühlen.
              <span className="text-[var(--mid)]"> Eine gute Ankunft ist kein Onboarding-Ticket.
              Sie ist ein Mensch, der die Tür öffnet — und sagt: schön, dass du da bist.</span>
            </p>
          </div>
        </section>

        {/* ── ZWEI PFADE ── */}
        <section className="border-t border-[var(--border)]">
          <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-28 md:py-32 grid md:grid-cols-2 gap-16 md:gap-20">
            <div id="unternehmen" className="scroll-mt-24 reveal-on-scroll group">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--mid)] mb-6">Für Unternehmen</p>
              <h2 className="font-serif text-4xl text-navy group-hover:text-gold transition-colors">Talente, die bleiben.</h2>
              <p className="mt-4 text-[var(--mid)] leading-relaxed max-w-md">
                Wir kümmern uns um die menschliche Seite der Relocation — damit Ihre Fachkräfte
                ankommen, nicht nur umziehen.
              </p>
              <a href="#kontakt" className="group/l mt-6 inline-flex items-center gap-2 text-sm text-navy">
                <span className="border-b border-navy pb-1 transition-colors group-hover/l:border-gold group-hover/l:text-gold">Gespräch anfragen</span>
                <span className="transition-transform group-hover/l:translate-x-1">→</span>
              </a>
            </div>
            <div id="greeter" className="scroll-mt-24 reveal-on-scroll group">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--mid)] mb-6">Für Greeter</p>
              <h2 className="font-serif text-4xl text-navy group-hover:text-gold transition-colors">Sei das erste Gesicht.</h2>
              <p className="mt-4 text-[var(--mid)] leading-relaxed max-w-md">
                Werde Teil einer Bewegung, die echten Unterschied macht — in deiner Stadt,
                in deiner Zeit, in deinem Rhythmus.
              </p>
              <a href="#kontakt" className="group/l mt-6 inline-flex items-center gap-2 text-sm text-navy">
                <span className="border-b border-navy pb-1 transition-colors group-hover/l:border-gold group-hover/l:text-gold">Mitmachen</span>
                <span className="transition-transform group-hover/l:translate-x-1">→</span>
              </a>
            </div>
          </div>
        </section>

        {/* ── KONTAKT ── */}
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
