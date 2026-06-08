import { useNavigate } from 'react-router-dom';
import {
  Plane, Home, Landmark, Smartphone, ShieldPlus, Stamp, Languages, Users,
  ArrowRight, Building2, HeartHandshake, Clock, Wallet,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AboutSection from '@/components/landing/AboutSection';
import ContactSection from '@/components/landing/ContactSection';
import useScrollReveal from '@/lib/useScrollReveal';
import { usePublicTheme } from '@/lib/usePublicTheme';

/**
 * Startseite = kurze, hochwertige Vorschau mit zwei Türen (Unternehmen & Greeter).
 * Die eigentliche Qualität zeigt sich im Produkt hinter dem Login — hier nur ein ruhiger,
 * premium Gateway: Hero · Zwei Wege · Was wir übernehmen · Über uns (Anton) · Kontakt.
 */

// Echte Service-Kategorien (keine erfundenen Marken) — nur als knappe Vorschau.
const SCOPE = [
  { i: Stamp, t: 'Visum & Behörden' },
  { i: Plane, t: 'Flughafen-Abholung' },
  { i: Home, t: 'Wohnung' },
  { i: Landmark, t: 'Bankkonto' },
  { i: Smartphone, t: 'Mobilfunk' },
  { i: ShieldPlus, t: 'Versicherung' },
  { i: Languages, t: 'Sprache' },
];

const COMPANY_POINTS = [
  { i: Users, t: 'Ein Partner statt zehn' },
  { i: HeartHandshake, t: 'Greeter vor Ort' },
  { i: Building2, t: 'Live-Status & KI-Briefing' },
];

const GREETER_POINTS = [
  { i: Clock, t: 'Flexible Zeiten' },
  { i: Wallet, t: 'Honorar pro Einsatz' },
  { i: Smartphone, t: 'Alles in der Mobile-App' },
];

export default function Landing() {
  usePublicTheme();
  useScrollReveal();
  const nav = useNavigate();

  return (
    <div className="bg-cream">
      <Navbar />
      <main id="main-content" className="pt-16">

        {/* ── HERO ── */}
        <section className="relative">
          <div className="max-w-[1180px] mx-auto px-6 md:px-10 pt-24 md:pt-32 pb-16 md:pb-20">
            <p className="animate-fade-in text-[11px] uppercase tracking-[0.28em] text-[var(--mid)] mb-8">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold mr-3 align-middle" />
              Human Arrival · Made in Germany
            </p>
            <h1 className="font-serif text-navy text-[clamp(40px,6.4vw,92px)] leading-[1.03] max-w-[16ch]">
              Ankunft, <span className="text-gold italic">menschlich</span> gemacht.
            </h1>
            <p className="mt-8 max-w-2xl text-lg text-[var(--mid)] leading-relaxed">
              Ein echter Mensch holt deine internationale Fachkraft am Flughafen ab. Ein System
              begleitet jeden Schritt von der Einreise bis in den Alltag.
            </p>
            <div className="mt-10 flex items-center gap-x-6 gap-y-3 flex-wrap">
              <a href="#unternehmen" className="group inline-flex items-center gap-3 rounded-full bg-navy px-7 py-3.5 text-sm font-medium text-cream transition-colors hover:bg-gold hover:text-navy">
                Für Unternehmen
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a href="#greeter" className="group inline-flex items-center gap-2 text-sm text-navy">
                <span className="border-b border-navy/40 pb-0.5 transition-colors group-hover:border-gold group-hover:text-gold">Greeter werden</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </section>

        {/* ── ZWEI WEGE — die zwei Türen ── */}
        <section className="border-t border-[var(--border)]">
          <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-16 md:py-24">
            <div className="grid md:grid-cols-2 gap-5">

              {/* Für Unternehmen — dunkle, hochwertige Karte */}
              <div id="unternehmen" className="scroll-mt-24 reveal-on-scroll rounded-3xl p-8 md:p-10 flex flex-col" style={{ background: 'var(--navy)' }}>
                <p className="text-[11px] uppercase tracking-[0.24em] text-gold mb-6">Für Unternehmen</p>
                <h2 className="font-serif text-cream text-[clamp(24px,3vw,38px)] leading-[1.12]">
                  Ihr stellt international ein. Wir sorgen dafür, dass die Fachkraft ankommt
                  <span className="text-gold italic"> und bleibt.</span>
                </h2>
                <p className="mt-4 text-cream/60 leading-relaxed">
                  Eine Fachkraft, die nicht ankommt, ist teurer als jeder Service. Wir übernehmen den
                  ganzen Ankunftsprozess, orchestriert über eine Plattform.
                </p>
                <div className="mt-7 space-y-2.5">
                  {COMPANY_POINTS.map((p) => {
                    const Icon = p.i;
                    return (
                      <div key={p.t} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.16)' }}>
                          <Icon className="w-4 h-4 text-gold" />
                        </div>
                        <span className="text-[14px] text-cream/85">{p.t}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-8 pt-2 flex items-center gap-5 flex-wrap">
                  <a href="#kontakt" className="inline-flex items-center gap-2.5 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy transition hover:brightness-105">
                    Gespräch anfragen <ArrowRight className="w-4 h-4" />
                  </a>
                  <button onClick={() => nav('/login')} className="text-sm text-cream/60 hover:text-cream transition-colors">
                    Anmelden
                  </button>
                </div>
              </div>

              {/* Für Greeter — helle, gold-getönte Karte */}
              <div id="greeter" className="scroll-mt-24 reveal-on-scroll rounded-3xl p-8 md:p-10 flex flex-col" style={{ background: 'rgba(196,146,40,0.07)', border: '1px solid rgba(196,146,40,0.22)' }}>
                <p className="text-[11px] uppercase tracking-[0.24em] text-gold mb-6">Für Greeter</p>
                <h2 className="font-serif text-navy text-[clamp(24px,3vw,38px)] leading-[1.12]">
                  Sei das <span className="text-gold italic">erste Gesicht.</span>
                </h2>
                <p className="mt-4 text-[var(--mid)] leading-relaxed">
                  Begleite Ankommende in deiner Stadt, in deiner Zeit, in deinem Rhythmus. Du bist der
                  Mensch, der die Tür öffnet.
                </p>
                <div className="mt-7 space-y-2.5">
                  {GREETER_POINTS.map((p) => {
                    const Icon = p.i;
                    return (
                      <div key={p.t} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.14)' }}>
                          <Icon className="w-4 h-4 text-gold" />
                        </div>
                        <span className="text-[14px] text-navy/80">{p.t}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-8 pt-2">
                  <a href="#kontakt" className="group inline-flex items-center gap-2.5 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-cream transition hover:bg-gold hover:text-navy">
                    Greeter werden <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── WAS WIR ÜBERNEHMEN — knappe, konkrete Vorschau ── */}
        <section className="border-t border-[var(--border)]">
          <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-16 md:py-20 text-center reveal-on-scroll">
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold mb-7">Was wir übernehmen</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {SCOPE.map((s) => {
                const Icon = s.i;
                return (
                  <span key={s.t} className="inline-flex items-center gap-2 text-[13px] text-navy/80 px-4 py-2 rounded-full" style={{ background: 'var(--ds-card)', border: '1px solid var(--border)' }}>
                    <Icon className="w-3.5 h-3.5 text-gold" /> {s.t}
                  </span>
                );
              })}
            </div>
            <p className="mt-7 text-[13px] text-[var(--light)] max-w-xl mx-auto">
              Heute live: die persönliche Ankunft. Drumherum wächst das Service-Netzwerk. Schritt für Schritt,
              ehrlich, ohne Versprechen, die wir nicht halten.
            </p>
          </div>
        </section>

        {/* ── ÜBER UNS (nur Anton) ── */}
        <AboutSection />

        {/* ── KONTAKT ── */}
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
