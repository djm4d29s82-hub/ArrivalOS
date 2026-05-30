import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Home, Briefcase, MessageSquare, User as UserIcon, Bell, LogOut, MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useRealtimeMessages } from '@/lib/useRealtimeMessages';
import { Avatar, IconButton, Pill } from '@/components/ui';
import WaitingForApproval from '@/components/layout/WaitingForApproval';

const IS_SUPABASE = !!base44.raw;

/**
 * MobileGreeterLayout — workforce-app shell for Greeter role.
 * - Top header: brand mark, online-status, bell, avatar/logout
 * - Main: scrollable content area
 * - Bottom nav: Home, Einsätze, Chat, Profil
 */
const TABS = [
  { to: '/greeter-dashboard', label: 'Home', icon: Home, end: true },
  { to: '/greeter-dashboard/missions', label: 'Einsätze', icon: Briefcase },
  { to: '/greeter-dashboard/messages', label: 'Chat', icon: MessageSquare, badge: 'messages' },
  { to: '/greeter-dashboard/profile', label: 'Profil', icon: UserIcon },
];

export default function MobileGreeterLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { totalUnread } = useRealtimeMessages();
  const [online, setOnline] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => menuRef.current && !menuRef.current.contains(e.target) && setShowMenu(false);
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // Auth/Rollen-Guard (Supabase-Modus) — Parität zum DashboardLayout. Kein user → /login;
  // Nicht-Greeter (außer admin) → eigenes Portal. Dev (localStorage) bleibt unberührt.
  useEffect(() => {
    if (!IS_SUPABASE) return;
    if (!user) { nav('/login', { state: { from: { pathname: window.location.pathname + window.location.search } }, replace: true }); return; }
    if (user.role !== 'greeter' && user.role !== 'admin') {
      nav(user.role === 'company' ? '/company' : user.role === 'talent' ? '/talent' : '/login', { replace: true });
    }
  }, [user, nav]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ds-bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-navy text-cream shadow-[0_2px_12px_rgba(16,24,40,.08)]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/greeter-dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold/15 grid place-items-center">
              <span className="text-gold font-serif font-bold text-base">N</span>
            </div>
            <div>
              <div className="font-bold tracking-tight text-[15px] leading-none">Neu<span className="text-gold">Land</span></div>
              <div className="text-[9.5px] uppercase tracking-widest text-cream/50 mt-0.5">Greeter</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnline((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 transition"
              aria-label="Online-Status wechseln"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-400' : 'bg-cream/30'}`} />
              {online ? 'Online' : 'Pause'}
            </button>

            <IconButton icon={Bell} size="sm" label="Benachrichtigungen" className="!bg-white/10 !text-cream hover:!bg-white/15" />

            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu((s) => !s)} className="block" aria-label="Konto">
                <Avatar name={user?.full_name} size="sm" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 rounded-xl shadow-[0_12px_32px_-8px_rgba(16,24,40,.16)] w-56 py-1 z-40"
                  style={{ background: 'var(--ds-popup)', border: '1px solid var(--ds-popup-border)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--ds-popup-border)' }}>
                    <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ds-t1)' }}>{user?.full_name}</div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--ds-t2)' }}>{user?.email}</div>
                  </div>
                  {[
                    { label: 'Verfügbarkeit', to: '/greeter-dashboard/availability' },
                    { label: 'SOPs & Schulung', to: '/greeter-dashboard/sop' },
                    { label: 'Einstellungen', to: '/greeter-dashboard/settings' },
                  ].map((item) => (
                    <button key={item.to}
                      onClick={() => { setShowMenu(false); nav(item.to); }}
                      className="w-full text-left px-4 py-2.5 text-[13px] transition"
                      style={{ color: 'var(--ds-t1)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-popup-item-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {item.label}
                    </button>
                  ))}
                  <div className="my-1" style={{ borderTop: '1px solid var(--ds-popup-border)' }} />
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-red-500 transition inline-flex items-center gap-2"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <LogOut className="w-3.5 h-3.5" /> Abmelden
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto px-4 py-5">
          {user?.status === 'pending_approval' ? <WaitingForApproval /> : <Outlet />}
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 shadow-[0_-2px_12px_rgba(16,24,40,.06)] pb-[max(env(safe-area-inset-bottom),0px)]"
        style={{ background: 'var(--ds-card)', borderTop: '1px solid var(--ds-card-border)' }}>
        <div className="max-w-2xl mx-auto flex">
          {TABS.map((t) => {
            const Icon = t.icon;
            const showBadge = t.badge === 'messages' && totalUnread > 0;
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10.5px] font-medium transition-colors ${
                    isActive ? 'text-navy dark:text-white' : 'text-[var(--light)] hover:text-navy dark:hover:text-white/80'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute top-0 inset-x-6 h-[2.5px] rounded-full bg-gold" />}
                    <div className="relative">
                      <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.4 : 2} />
                      {showBadge && (
                        <span className="absolute -top-1.5 -right-2 bg-gold text-navy text-[9px] font-bold rounded-full px-1 min-w-[14px] h-[14px] grid place-items-center leading-none">
                          {totalUnread}
                        </span>
                      )}
                    </div>
                    <span>{t.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
