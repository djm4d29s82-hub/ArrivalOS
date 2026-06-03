import { Instagram, Linkedin, Mail, Shield, Globe2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { COMPANY } from '@/lib/siteConfig';

export default function Footer() {
  return (
    <footer className="text-cream/90 pt-20 pb-10" style={{ background: 'var(--navy3)' }}>
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-5 md:grid-cols-2 gap-10">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-full bg-gold/15 grid place-items-center">
              <span className="text-gold font-serif font-bold text-lg">A</span>
            </div>
            <div className="leading-tight">
              <div className="font-bold text-cream text-lg">Arrival<span className="text-gold">OS</span></div>
            </div>
          </div>
          <p className="text-[13px] text-cream/75 leading-relaxed max-w-sm">
            Plattform für menschliches Onboarding internationaler Fachkräfte — strukturiert, sicher und persönlich.
          </p>
          <p className="font-serif italic text-[13px] text-cream/40 mt-4">„Ankunft beginnt mit Menschen.”</p>
          <div className="flex gap-2 mt-5">
            {[Instagram, Linkedin, Mail].map((I, i) => (
              <a key={i} className="w-9 h-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer" aria-label="Social Link">
                <I className="w-4 h-4 text-cream/70" />
              </a>
            ))}
          </div>
        </div>

        <Col title="Seiten" items={[
          ['Für Unternehmen', '#unternehmen'],
          ['Greeter werden', '#greeter'],
          ['Kontakt', '#kontakt'],
        ]} />

        <Col title="Über ArrivalOS" items={[
          ['Karriere', '/karriere'],
          ['Presse', '/presse'],
        ]} />

        <Col title="Rechtliches" items={[
          ['Impressum', '/impressum'],
          ['Datenschutz', '/datenschutz'],
          ['AGB', '/agb'],
        ]} />
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-16 pt-6 border-t border-white/5 flex flex-wrap justify-between items-center gap-4 text-[11px] text-cream/35">
        <span>© {new Date().getFullYear()} {COMPANY.legalName} · {COMPANY.street} · {COMPANY.zip} {COMPANY.city} · {COMPANY.email}</span>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5"><Shield className="w-3 h-3" /> DSGVO-konform</span>
          <span className="inline-flex items-center gap-1.5"><Globe2 className="w-3 h-3" /> Hosting in der EU</span>
          <span className="text-cream/25">·</span>
          <span>DE</span>
          <span className="opacity-40">EN (bald)</span>
        </div>
      </div>
    </footer>
  );
}

function Col({ title, items }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-widest uppercase text-gold/80 mb-4">{title}</div>
      <ul className="space-y-2.5 text-[13px]">
        {items.map(([label, href]) => (
          <li key={label}>
            {href.startsWith('#') ? (
              <a href={href} className="hover:text-cream transition">{label}</a>
            ) : (
              <Link to={href} className="hover:text-cream transition">{label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
