import { useState } from 'react';
import { COMPANY } from '@/lib/siteConfig';
import { base44 } from '@/api/base44Client';

/**
 * Kontakt — ruhige Cream-Editorial-Sektion. Erfasst Leads (Unternehmen wie Greeter).
 * Bewusst reduziert: Headline + ein Satz + Formular. Kein Showcase, keine Info-Kacheln.
 */
export default function ContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function isValidEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !message || !isValidEmail(email)) return;
    setLoading(true);
    try {
      await base44.entities.Lead.create({
        name: name || null,
        email,
        company: company || null,
        message,
        source: 'landing',
      });
      setSent(true);
      setName(''); setEmail(''); setCompany(''); setMessage('');
      setTimeout(() => setSent(false), 6000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const field = 'w-full rounded-lg px-4 py-3 text-[14px] outline-none transition';
  const fieldStyle = { background: 'var(--ds-card)', border: '1px solid var(--border)', color: 'var(--navy)' };

  return (
    <section id="kontakt" className="border-t border-[var(--border)] scroll-mt-24">
      <div className="max-w-[760px] mx-auto px-6 md:px-10 py-28 md:py-36 reveal-on-scroll">
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold mb-10">Kontakt</p>
        <h2 className="font-serif text-navy text-[clamp(30px,4.2vw,56px)] leading-[1.08] max-w-[18ch]">
          Sprechen wir über deinen nächsten Standort.
        </h2>
        <p className="mt-8 max-w-xl text-[var(--mid)] leading-relaxed">
          Ein kurzer Austausch genügt, über die erste Stunde, die erste Wegbegleitung und einen
          ruhigen Start für internationales Talent.
        </p>

        {sent ? (
          <p className="mt-12 font-serif text-2xl text-navy">
            Danke, wir melden uns zeitnah bei dir.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-12 grid gap-3 max-w-xl">
            <div className="grid sm:grid-cols-2 gap-3">
              <input className={field} style={fieldStyle} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className={field} style={fieldStyle} placeholder="Unternehmen (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <input type="email" required className={field} style={fieldStyle} placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <textarea required rows={4} className={`${field} resize-none`} style={fieldStyle} placeholder="Kurz beschreiben, worum es geht" value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="flex items-center gap-6 mt-2">
              <button type="submit" disabled={loading || !isValidEmail(email) || !message} className="btn-gold disabled:opacity-50">
                {loading ? 'Senden…' : 'Nachricht senden'}
              </button>
              <a href={`mailto:${COMPANY.email}`} className="text-sm text-[var(--mid)] hover:text-navy transition-colors">
                Oder direkt: {COMPANY.email}
              </a>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
