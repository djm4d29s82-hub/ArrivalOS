import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { usePublicTheme } from '@/lib/usePublicTheme';

// Zwei Modi auf einer Seite:
//  • 'request' — Nutzer kommt von „Passwort vergessen?": E-Mail eingeben → Recovery-Mail.
//  • 'update'  — Nutzer kommt aus dem Mail-Link: Supabase setzt eine Recovery-Session
//                (URL-Hash type=recovery, Event PASSWORD_RECOVERY) → neues Passwort setzen.
export default function ResetPassword() {
  usePublicTheme();
  const nav = useNavigate();
  const { requestPasswordReset, updatePassword } = useAuth();

  const [mode, setMode] = useState(() =>
    typeof window !== 'undefined' && window.location.hash.includes('type=recovery') ? 'update' : 'request'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);

  // Wenn der Recovery-Link verarbeitet wird, feuert Supabase PASSWORD_RECOVERY — dann in den Update-Modus.
  useEffect(() => {
    if (typeof base44.auth?.onChange !== 'function') return undefined;
    const unsub = base44.auth.onChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('update');
    });
    return () => { try { unsub?.(); } catch { /* noop */ } };
  }, []);

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError('');
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const submitUpdate = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen haben.'); return; }
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein.'); return; }
    setBusy(true);
    setError('');
    try {
      await updatePassword(password);
      setDone(true);
      // Die Recovery-Session ist jetzt aktiv → kurz bestätigen, dann ins Dashboard leiten.
      setTimeout(() => nav('/', { replace: true }), 1600);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'var(--ds-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <svg viewBox="0 0 64 64" className="w-10 h-10" aria-hidden="true">
              <defs><linearGradient id="agReset" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#e9c66b"/><stop offset=".5" stopColor="#c2902f"/><stop offset="1" stopColor="#9c6f1f"/>
              </linearGradient></defs>
              <path d="M32 17 L20 53 L44 53 Z" fill="#15171d"/>
              <path d="M8 58 L32 5 L56 58" fill="none" stroke="url(#agReset)" strokeWidth="7" strokeLinejoin="round"/>
              <path d="M32 26 l1.9 6.1 6.1 1.9 -6.1 1.9 -1.9 6.1 -1.9 -6.1 -6.1 -1.9 6.1 -1.9 Z" fill="url(#agReset)"/>
            </svg>
            <div className="leading-tight text-left">
              <div className="font-bold text-[16px] tracking-[0.08em]" style={{ color: 'var(--ds-t1)' }}>ARRIVAL</div>
              <div className="text-[8.5px] tracking-[0.32em] font-semibold" style={{ color: '#c49228' }}>GERMANY</div>
            </div>
          </div>
          <h1 className="font-serif text-[22px] font-bold leading-tight" style={{ color: 'var(--ds-t1)' }}>
            {mode === 'update' ? 'Neues Passwort setzen' : 'Passwort zurücksetzen'}
          </h1>
          <p className="text-[13px] text-[var(--mid)] mt-1.5">
            {mode === 'update'
              ? 'Wähle ein neues Passwort für dein Konto.'
              : 'Wir senden dir einen Link zum Zurücksetzen.'}
          </p>
        </div>

        {/* Bestätigung: Mail gesendet */}
        {mode === 'request' && sent ? (
          <div className="text-center bg-green-50 border border-green-200 rounded-xl px-5 py-6">
            <div className="text-2xl mb-2">✉️</div>
            <div className="font-semibold text-[14px]" style={{ color: 'var(--ds-t1)' }}>Link gesendet</div>
            <div className="text-[12.5px] text-[var(--mid)] mt-1.5 leading-relaxed">
              Falls ein Konto zu <strong>{email}</strong> existiert, findest du dort einen Link zum Zurücksetzen.
            </div>
            <button onClick={() => nav('/login')} className="mt-4 text-[12px] underline" style={{ color: 'var(--ds-t1)' }}>
              Zurück zur Anmeldung
            </button>
          </div>
        ) : done ? (
          <div className="text-center bg-green-50 border border-green-200 rounded-xl px-5 py-6">
            <div className="text-2xl mb-2">✅</div>
            <div className="font-semibold text-[14px]" style={{ color: 'var(--ds-t1)' }}>Passwort aktualisiert</div>
            <div className="text-[12.5px] text-[var(--mid)] mt-1.5">Du wirst weitergeleitet…</div>
          </div>
        ) : (
          <div className="rounded-2xl shadow-sm p-6 space-y-4" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
            {mode === 'update' ? (
              <form onSubmit={submitUpdate} className="space-y-3">
                <div>
                  <label className="block text-[11.5px] font-semibold mb-1.5" style={{ color: 'var(--ds-t1)' }}>Neues Passwort</label>
                  <input
                    type="password" autoComplete="new-password" required
                    value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mindestens 8 Zeichen"
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg ds-input transition placeholder:text-[var(--ds-t3)]"
                    style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold mb-1.5" style={{ color: 'var(--ds-t1)' }}>Passwort bestätigen</label>
                  <input
                    type="password" autoComplete="new-password" required
                    value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••"
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg ds-input transition placeholder:text-[var(--ds-t3)]"
                    style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
                  />
                </div>
                {error && <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
                <button type="submit" disabled={busy || !password || !confirm}
                  className="w-full bg-navy text-cream py-2.5 rounded-lg text-[13.5px] font-semibold hover:bg-navy/90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Passwort speichern
                </button>
              </form>
            ) : (
              <form onSubmit={submitRequest} className="space-y-3">
                <div>
                  <label className="block text-[11.5px] font-semibold mb-1.5" style={{ color: 'var(--ds-t1)' }}>E-Mail</label>
                  <input
                    type="email" required autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@unternehmen.de"
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg ds-input transition placeholder:text-[var(--ds-t3)]"
                    style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
                  />
                </div>
                {error && <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
                <button type="submit" disabled={busy || !email}
                  className="w-full bg-navy text-cream py-2.5 rounded-lg text-[13.5px] font-semibold hover:bg-navy/90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Link senden
                </button>
              </form>
            )}
            <button onClick={() => nav('/login')} className="w-full text-[11px] text-center" style={{ color: 'var(--ds-t3)' }}>
              Zurück zur Anmeldung
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
