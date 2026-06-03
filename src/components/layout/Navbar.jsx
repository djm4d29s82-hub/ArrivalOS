import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';

const LINKS = [
  { href: '#unternehmen', label: 'Für Unternehmen' },
  { href: '#greeter', label: 'Greeter' },
  { href: '#kontakt', label: 'Kontakt' },
];

export default function Navbar() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 transition-all glass"
      style={{ borderBottom: '1px solid var(--ds-card-border)' }}>
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <svg viewBox="0 0 64 64" className="w-9 h-9 group-hover:scale-105 transition" aria-hidden="true">
            <defs><linearGradient id="agNav" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e9c66b"/><stop offset=".5" stopColor="#c2902f"/><stop offset="1" stopColor="#9c6f1f"/>
            </linearGradient></defs>
            <path d="M32 17 L20 53 L44 53 Z" fill="#15171d"/>
            <path d="M8 58 L32 5 L56 58" fill="none" stroke="url(#agNav)" strokeWidth="7" strokeLinejoin="round"/>
            <path d="M32 26 l1.9 6.1 6.1 1.9 -6.1 1.9 -1.9 6.1 -1.9 -6.1 -6.1 -1.9 6.1 -1.9 Z" fill="url(#agNav)"/>
            <path d="M5 52 Q33 41.5 59 49.5" fill="none" stroke="url(#agNav)" strokeWidth="2.6" strokeLinecap="round"/>
            <path d="M20 47.7 L25 46.8" stroke="#161616" strokeWidth="2.8"/>
            <path d="M25 46.8 L30 46.1" stroke="#DD0000" strokeWidth="2.8"/>
            <path d="M30 46.1 L35 45.7" stroke="#F6C534" strokeWidth="2.8"/>
          </svg>
          <div className="leading-tight">
            <div className="font-bold text-[15px] tracking-[0.08em]" style={{ color: 'var(--ds-t1)' }}>ARRIVAL</div>
            <div className="text-[8px] tracking-[0.32em] font-semibold" style={{ color: '#c49228' }}>GERMANY</div>
          </div>
        </Link>
        <ul className="hidden lg:flex items-center gap-7 text-[13px]" style={{ color: 'var(--ds-t2)' }}>
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="hover:text-navy dark:hover:text-white transition-colors font-medium">{l.label}</a>
            </li>
          ))}
        </ul>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => nav('/login')} className="text-[13px] px-3 py-1.5 transition hover:text-navy dark:hover:text-white" style={{ color: 'var(--ds-t2)' }}>Anmelden</button>
          <a href="#kontakt" className="btn-gold">
            Gespräch anfragen <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <button className="lg:hidden p-2" onClick={() => setOpen((s) => !s)} aria-label="Menü öffnen">
          {open ? <X className="w-5 h-5" style={{ color: 'var(--ds-t1)' }} /> : <Menu className="w-5 h-5" style={{ color: 'var(--ds-t1)' }} />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden" style={{ background: 'var(--ds-card)', borderBottom: '1px solid var(--ds-card-border)' }}>
          <div className="px-6 py-3 space-y-1">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="block py-2.5 text-sm font-medium"
                style={{ color: 'var(--ds-t1)', borderBottom: '1px solid var(--ds-card-border)' }}>{l.label}</a>
            ))}
            <a href="#kontakt" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-gold font-semibold">Gespräch anfragen →</a>
            <button onClick={() => { setOpen(false); nav('/login'); }} className="block w-full text-left py-2.5 text-sm" style={{ color: 'var(--ds-t2)' }}>Anmelden</button>
          </div>
        </div>
      )}
    </nav>
  );
}
