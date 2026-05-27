import { useAuth } from '@/lib/AuthContext';
import { Clock, LogOut } from 'lucide-react';

/**
 * Gezeigt, wenn ein eingeloggter Nutzer `status === 'pending_approval'` hat
 * (nur privilegierte Rollen — Talent ist nach Registrierung sofort aktiv).
 * Bewusst ruhig, keine Systembegriffe.
 */
export default function WaitingForApproval() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-[60vh] grid place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="w-12 h-12 rounded-full grid place-items-center mx-auto mb-5" style={{ background: 'rgba(196,146,40,0.12)', color: '#c49228' }}>
          <Clock className="w-5 h-5" />
        </div>
        <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--ds-t1)' }}>Zugang wird geprüft</h1>
        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: 'var(--ds-t2)' }}>
          Danke{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}. Dein Konto ist angelegt —
          ein Admin gibt deinen Zugang in Kürze frei. Du bekommst Bescheid, sobald es losgeht.
        </p>
        <button onClick={logout} className="mt-7 inline-flex items-center gap-2 text-[13px] transition hover:opacity-70" style={{ color: 'var(--ds-t3)' }}>
          <LogOut className="w-3.5 h-3.5" /> Abmelden
        </button>
      </div>
    </div>
  );
}
