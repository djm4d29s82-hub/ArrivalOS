import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AboutSection from '@/components/landing/AboutSection';
import ValuePropSection from '@/components/landing/ValuePropSection';
import ContactSection from '@/components/landing/ContactSection';
import useScrollReveal from '@/lib/useScrollReveal';
import { usePublicTheme } from '@/lib/usePublicTheme';

/**
 * Single-Page-Landing im Calm-Canvas-Stil — schlank & kunden-fokussiert:
 * Hero · Für Unternehmen (Wert + Angebot) · Greeter werden · Über uns (nur Anton) · Kontakt.
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
              Arrival Germany ist die Betriebsschicht für Unternehmen, die internationale Fachkräfte
              einstellen — von der Einreise bis in den Alltag. Ein Ansprechpartner, eine Plattform,
              echte Menschen vor Ort.
            </p>
            <div className="mt-12 flex items-center gap-x-8 gap-y-4 flex-wrap">
              <a href="#kontakt" className="group inline-flex items-center gap-3 rounded-full bg-navy px-7 py-3.5 text-sm font-medium text-cream transition-colors hover:bg-gold hover:text-navy">
                Gespräch anfragen
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a href="#greeter" className="text-sm text-[var(--mid)] hover:text-navy transition-colors">
                Greeter werden
              </a>
            </div>
          </div>
        </section>

        {/* ── FÜR UNTERNEHMEN — Wert (Risiko-Reduktion) + Angebot (Arrival Package) ── */}
        <ValuePropSection />

        {/* ── GREETER WERDEN ── */}
        <section className="border-t border-[var(--border)]">
          <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-28 md:py-32">
            <div id="greeter" className="scroll-mt-24 reveal-on-scroll group max-w-xl">
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

        {/* ── ÜBER UNS (nur Anton, mit Foto) ── */}
        <AboutSection />

        {/* ── KONTAKT ── */}
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
