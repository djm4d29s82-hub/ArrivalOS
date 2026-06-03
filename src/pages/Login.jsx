import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { BACKEND_MODE } from '@/api/base44Client';
import { ArrowRight, Loader2 } from 'lucide-react';
import { usePublicTheme } from '@/lib/usePublicTheme';

const IS_DEV = BACKEND_MODE === 'localStorage';

// Seeded dev users — matches base44Client.js seedDB()
const DEV_USERS = [
  { email: 'admin@neuland.de',           role: 'admin',   label: 'Admin',      description: 'Operations Center, alle Missionen', dest: '/admin' },
  { email: 'hr@lumen.de',                role: 'company', label: 'Unternehmen', description: 'Helios Klinikum — Missions & Talents', dest: '/company' },
  { email: 'sophie@neuland.de',          role: 'greeter', label: 'Greeter',    description: 'Miriam Schulz — Aktive Missionen',  dest: '/greeter-dashboard' },
  { email: 'amara@talent.neuland.de',    role: 'talent',  label: 'Talent',     description: 'Priya Nair — Meine Journey',        dest: '/talent' },
];

const ROLE_COLORS = {
  admin:   'bg-navy/10 border-navy/20 text-navy dark:bg-white/[0.08] dark:border-white/20 dark:text-white/75',
  company: 'bg-gold/10 border-gold/30 text-[#7a5a10] dark:bg-gold/10 dark:border-gold/25 dark:text-[#d4a83a]',
  greeter: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400',
  talent:  'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400',
};

export default function Login() {
  usePublicTheme();
  const nav = useNavigate();
  const loc = useLocation();
  const { login, loginWithPassword } = useAuth();

  // Redirect destination — back to wherever the user tried to go, or root
  const from = loc.state?.from?.pathname || null;

  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [magicSent, setMagicSent] = useState(false);

  const roleDestination = (role) =>
    from ||
    (role === 'admin'   ? '/admin' :
     role === 'company' ? '/company' :
     role === 'greeter' ? '/greeter-dashboard' :
     role === 'talent'  ? '/talent' : '/');

  // Dev mode: one-click login
  const devLogin = async (u) => {
    setBusy(true);
    setError('');
    try {
      await login(u.email);
      nav(u.dest, { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Supabase mode: email + password
  const submitPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError('');
    try {
      const me = await loginWithPassword(email.trim(), password);
      nav(roleDestination(me?.role), { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Supabase mode: magic link
  const submitMagic = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError('');
    try {
      await login(email.trim());
      setMagicSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'var(--ds-bg)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <svg viewBox="0 0 64 64" className="w-10 h-10" aria-hidden="true">
              <path d="M32 6 L58 57 L45.5 57 L32 28 L18.5 57 L6 57 Z" fill="#c49228"/>
              <path d="M32 28 l2.3 5.5 5.5 2.3 -5.5 2.3 -2.3 5.5 -2.3 -5.5 -5.5 -2.3 5.5 -2.3 Z" fill="#e0bd62"/>
              <path d="M14 49 Q32 41 50 49" fill="none" stroke="#c49228" strokeWidth="2.6" strokeLinecap="round"/>
              <rect x="27.4" y="43.1" width="3" height="3.4" fill="#1a1a1a"/>
              <rect x="30.5" y="42.7" width="3" height="3.4" fill="#DD0000"/>
              <rect x="33.6" y="43.1" width="3" height="3.4" fill="#FFCE00"/>
            </svg>
            <div className="leading-tight text-left">
              <div className="font-bold text-[16px] tracking-[0.08em]" style={{ color: 'var(--ds-t1)' }}>ARRIVAL</div>
              <div className="text-[8.5px] tracking-[0.32em] font-semibold" style={{ color: '#c49228' }}>GERMANY</div>
            </div>
          </div>
          <h1 className="font-serif text-[22px] font-bold leading-tight" style={{ color: 'var(--ds-t1)' }}>Willkommen zurück</h1>
          <p className="text-[13px] text-[var(--mid)] mt-1.5">
            {IS_DEV ? 'Entwicklungsmodus — Nutzer direkt wählen' : 'Melde dich mit deinem Konto an'}
          </p>
        </div>

        {/* ── DEV MODE: quick role selector ────────────────────────────────── */}
        {IS_DEV && (
          <div className="space-y-2.5">
            {DEV_USERS.map((u) => (
              <button
                key={u.email}
                onClick={() => devLogin(u)}
                disabled={busy}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border text-left transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 ${ROLE_COLORS[u.role]}`}
              >
                <div className="w-9 h-9 rounded-lg bg-white/60 dark:bg-white/10 grid place-items-center shrink-0 font-bold text-[13px]">
                  {u.label[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13.5px] leading-snug">{u.label}</div>
                  <div className="text-[11.5px] opacity-70 mt-0.5 truncate">{u.description}</div>
                </div>
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 opacity-50" />
                ) : (
                  <ArrowRight className="w-4 h-4 shrink-0 opacity-40" />
                )}
              </button>
            ))}
            {error && (
              <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-1">
                {error}
              </div>
            )}
            <div className="text-center mt-4 text-[11px] text-[var(--light)]">
              Entwicklungsmodus · localStorage · keine echten Daten
            </div>
          </div>
        )}

        {/* ── SUPABASE MODE: email/password + magic link ────────────────────── */}
        {!IS_DEV && (
          <>
            {magicSent ? (
              <div className="text-center bg-green-50 border border-green-200 rounded-xl px-5 py-6">
                <div className="text-2xl mb-2">✉️</div>
                <div className="font-semibold text-[14px]" style={{ color: 'var(--ds-t1)' }}>Magic Link gesendet!</div>
                <div className="text-[12.5px] text-[var(--mid)] mt-1.5 leading-relaxed">
                  Überprüfe deine E-Mail <strong>{email}</strong> und klicke den Link, um dich anzumelden.
                </div>
                <button
                  onClick={() => { setMagicSent(false); setEmail(''); }}
                  className="mt-4 text-[12px] underline"
                  style={{ color: 'var(--ds-t1)' }}
                >
                  Andere E-Mail verwenden
                </button>
              </div>
            ) : (
              <div className="rounded-2xl shadow-sm p-6 space-y-4" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
                <form onSubmit={submitPassword} className="space-y-3">
                  <div>
                    <label className="block text-[11.5px] font-semibold mb-1.5" style={{ color: 'var(--ds-t1)' }}>E-Mail</label>
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@unternehmen.de"
                      className="w-full px-3 py-2.5 text-[13px] rounded-lg ds-input transition placeholder:text-[var(--ds-t3)]"
                      style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-semibold mb-1.5" style={{ color: 'var(--ds-t1)' }}>Passwort</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 text-[13px] rounded-lg ds-input transition placeholder:text-[var(--ds-t3)]"
                      style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
                    />
                  </div>
                  {error && (
                    <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={busy || !email}
                    className="w-full bg-navy text-cream py-2.5 rounded-lg text-[13.5px] font-semibold hover:bg-navy/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Anmelden
                  </button>
                </form>

                <div className="relative flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'var(--ds-card-border)' }} />
                  <span className="text-[11px] text-[var(--light)] shrink-0">oder</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--ds-card-border)' }} />
                </div>

                <button
                  onClick={submitMagic}
                  disabled={busy || !email}
                  className="w-full py-2.5 rounded-lg text-[13px] font-medium transition disabled:opacity-50"
                  style={{ border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-card-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Magic Link senden
                </button>

                <p className="text-[11px] text-[var(--light)] text-center">
                  Kein Konto? Wende dich an deinen Arrival-Germany-Administrator.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
