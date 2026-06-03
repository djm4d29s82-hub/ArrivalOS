import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { usePublicTheme } from '@/lib/usePublicTheme';
import { peekInvite, acceptInvite } from '@/api/inviteUser';

const DEST = { admin: '/admin', company: '/company', greeter: '/greeter-dashboard', talent: '/talent' };

export default function Register() {
  usePublicTheme();
  // Capture the invite token once, then strip it from the address bar (effect below) so it
  // never lingers in browser history / Sentry breadcrumbs / over-the-shoulder — R3 hardening.
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const nav = useNavigate();
  const { login, loginWithPassword } = useAuth();

  const [peek, setPeek] = useState(null); // null=loading, {valid,...}
  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Remove ?token=… from the URL once captured (kept in state above; submit still works).
  useEffect(() => {
    if (token && window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      if (!token) { setPeek({ valid: false }); return; }
      try {
        const p = await peekInvite(token);
        setPeek(p || { valid: true }); // supabase: peek=null → generisch zulassen, Validierung serverseitig
        if (p?.email) setEmail(p.email);
        if (p?.full_name) setFullName(p.full_name);
      } catch {
        setPeek({ valid: true }); // im Zweifel Formular zeigen; Accept validiert hart
      }
    })();
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await acceptInvite({ token, full_name, password, email });
      const user = res.mode === 'supabase'
        ? await loginWithPassword(res.email, password)
        : await login(res.email);
      nav(DEST[user?.role] || '/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Registrierung fehlgeschlagen.');
      setBusy(false);
    }
  };

  const field = 'w-full rounded-lg px-4 py-3 text-[14px] outline-none transition';
  const fieldStyle = { background: 'var(--ds-card)', border: '1px solid var(--border)', color: 'var(--navy)' };

  const invalid = peek && peek.valid === false;

  return (
    <div className="min-h-screen bg-cream flex items-center">
      <div className="max-w-[480px] mx-auto px-6 w-full py-20">
        <div className="text-[11px] uppercase tracking-[0.28em] text-gold mb-8">NeuLand</div>

        {peek === null ? (
          <div className="flex items-center gap-2 text-[var(--mid)]"><Loader2 className="w-4 h-4 animate-spin" /> Einladung wird geprüft…</div>
        ) : invalid ? (
          <>
            <h1 className="font-serif text-navy text-[clamp(28px,4vw,44px)] leading-tight">Einladung ungültig.</h1>
            <p className="mt-6 text-[var(--mid)] leading-relaxed">
              Dieser Einladungslink ist abgelaufen oder wurde bereits genutzt. Bitte wende dich an die
              Person, die dich eingeladen hat.
            </p>
            <Link to="/" className="mt-8 inline-block text-sm text-navy border-b border-navy pb-1 hover:text-gold hover:border-gold transition-colors">Zur Startseite</Link>
          </>
        ) : (
          <>
            <h1 className="font-serif text-navy text-[clamp(30px,4.4vw,52px)] leading-[1.08]">
              Du wurdest <span className="text-gold italic">eingeladen.</span>
            </h1>
            <p className="mt-6 text-[var(--mid)] leading-relaxed">
              Schön, dass du da bist. Leg kurz dein Konto an — dann geht es los.
            </p>

            <form onSubmit={submit} className="mt-10 grid gap-3">
              <input className={field} style={fieldStyle} placeholder="Dein Name" value={full_name} onChange={(e) => setFullName(e.target.value)} autoFocus />
              <input
                type="email" required className={field} style={fieldStyle} placeholder="E-Mail"
                value={email} onChange={(e) => setEmail(e.target.value)}
                readOnly={!!peek?.emailLocked}
              />
              <input type="password" required minLength={8} className={field} style={fieldStyle} placeholder="Passwort (min. 8 Zeichen)" value={password} onChange={(e) => setPassword(e.target.value)} />
              {error && <div className="text-[12.5px] text-red-600">{error}</div>}
              <button type="submit" disabled={busy || !password} className="btn-gold mt-2 disabled:opacity-50">
                {busy ? 'Konto wird angelegt…' : 'Konto anlegen'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
