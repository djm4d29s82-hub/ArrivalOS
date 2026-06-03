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
          <div className="w-9 h-9 rounded-full bg-navy grid place-items-center group-hover:scale-105 transition">
            <span className="text-gold font-serif font-bold text-lg">A</span>
          </div>
          <div className="leading-tight">
            <div className="font-bold text-[15px] tracking-tight" style={{ color: 'var(--ds-t1)' }}>Arrival<span className="text-gold">OS</span></div>
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
