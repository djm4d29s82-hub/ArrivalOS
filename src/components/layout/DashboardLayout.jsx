import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  LayoutDashboard, Briefcase, Users, Building2, FileText, MessageSquare,
  BarChart3, Settings, ScrollText, UserCheck, LogOut, Bell, ChevronDown,
  CalendarClock, User as UserIcon, Activity, Receipt,
  Info, CheckCircle2, AlertTriangle, AlertOctagon, BellOff, Search,
  Sun, Moon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { relativeTime } from '@/lib/utils';
import { useRealtimeMessages } from '@/lib/useRealtimeMessages';
import CommandPalette from '@/components/ui/CommandPalette';
import WaitingForApproval from '@/components/layout/WaitingForApproval';
import { useTheme } from '@/lib/ThemeContext';

const IS_SUPABASE = !!base44.raw;

// Sidebar = Entscheidungen. Max 5 operative Kerne pro Rolle (flach, keine Gruppen).
// Sekundäres (Nachrichten) lebt in der Topbar; Kontrolle (Settings, Analytics,
// Rechnungen, Logs, SOPs) lebt in den Einstellungen.
const MENUS = {
  admin: [
    { to: '/admin', label: 'Overview', icon: Activity, end: true },
    { to: '/admin/missions', label: 'Missions', icon: Briefcase },
    { to: '/admin/execution', label: 'Execution', icon: Users },
    { to: '/admin/companies', label: 'Companies', icon: Building2 },
  ],
  company: [
    { to: '/company', label: 'Übersicht', icon: LayoutDashboard, end: true },
    { to: '/company/documents', label: 'Dokumente', icon: FileText },
    { to: '/company/invoices', label: 'Rechnungen', icon: Receipt },
  ],
  greeter: [
    { to: '/greeter-dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/greeter-dashboard/missions', label: 'Meine Einsätze', icon: Briefcase },
    { to: '/greeter-dashboard/availability', label: 'Verfügbarkeit', icon: CalendarClock },
    { to: '/greeter-dashboard/profile', label: 'Profil', icon: UserIcon },
  ],
  talent: [
    { to: '/talent', label: 'Meine Journey', icon: LayoutDashboard, end: true },
    { to: '/talent/documents', label: 'Dokumente', icon: FileText },
    { to: '/talent/greeter', label: 'Mein Greeter', icon: UserCheck },
  ],
};

const SETTINGS_ROUTE = { admin: '/admin/settings', company: '/company/settings', greeter: '/greeter-dashboard/settings', talent: '/talent/settings' };
const MESSAGES_ROUTE = { admin: '/admin/messages', company: '/company/messages', greeter: '/greeter-dashboard/messages', talent: '/talent/messages' };

const ROLE_LABELS = { admin: 'Admin', company: 'Unternehmen', greeter: 'Greeter', talent: 'Talent' };

export default function DashboardLayout({ role }) {
  const { user, switchRole, logout } = useAuth();
  const nav = useNavigate();
  const menu = MENUS[role] || [];
  const { isDark, toggle } = useTheme();

  useEffect(() => {
    if (!IS_SUPABASE) return;
    if (!user) { nav('/login', { state: { from: { pathname: window.location.pathname + window.location.search } }, replace: true }); return; }
    if (user.role !== role && user.role !== 'admin') {
      nav(user.role === 'company' ? '/company' : user.role === 'greeter' ? '/greeter-dashboard' : user.role === 'talent' ? '/talent' : '/login', { replace: true });
    }
  }, [user, role, nav]);

  const { totalUnread } = useRealtimeMessages();
  const [notifs, setNotifs] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const notifRef = useRef(null);
  const roleRef = useRef(null);

  const reloadNotifs = () => {
    if (!user?.email) return;
    base44.entities.Notification.filter({ user_email: user.email }, '-created_at').then(setNotifs);
  };
  useEffect(() => {
    reloadNotifs();
    const i = setInterval(reloadNotifs, 8000);
    return () => clearInterval(i);
  }, [user?.email]);

  useEffect(() => {
    const onDoc = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (roleRef.current && !roleRef.current.contains(e.target)) setShowRole(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const unread = notifs.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await Promise.all(notifs.filter((n) => !n.read).map((n) => base44.entities.Notification.update(n.id, { read: true })));
    reloadNotifs();
  };

  const onSwitch = async (r) => {
    setShowRole(false);
    await switchRole(r);
    nav(r === 'admin' ? '/admin' : r === 'company' ? '/company' : r === 'talent' ? '/talent' : '/greeter-dashboard');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--ds-root)' }}>

      {/* Sidebar — always dark (navy in light mode, glass in dark) */}
      <aside className="w-64 shrink-0 flex flex-col" style={{ background: 'var(--ds-sidebar)', borderRight: '1px solid var(--ds-sidebar-border)' }}>
        <Link to="/" className="px-5 h-16 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          <div className="w-9 h-9 rounded-full grid place-items-center" style={{ background: 'rgba(196,146,40,0.15)' }}>
            <span className="text-gold font-serif font-bold text-lg">A</span>
          </div>
          <div>
            <div className="font-bold tracking-tight text-white">Arrival<span className="text-gold">OS</span></div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>{ROLE_LABELS[role]}-Portal</div>
          </div>
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {menu.map((m) => {
            const Icon = m.icon;
            return (
              <NavLink
                key={m.to}
                to={m.to}
                end={m.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                    isActive ? 'border-l-2 border-gold pl-[10px]' : 'hover:text-white'
                  }`
                }
                style={({ isActive }) => isActive
                  ? { background: 'rgba(196,146,40,0.12)', color: '#f0ebe0' }
                  : { color: 'rgba(255,255,255,0.45)' }
                }
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span className="flex-1">{m.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-3 py-2 mb-1">
            <div className="text-xs font-semibold text-white">{user?.full_name || 'User'}</div>
            <div className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email}</div>
          </div>
          {/* Settings = Kontrolle: tertiär, nicht in der primären Nav */}
          <Link
            to={SETTINGS_ROUTE[role]}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            <Settings className="w-4 h-4" /> Einstellungen
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            <LogOut className="w-4 h-4" /> Abmelden
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header
          className="h-16 px-6 flex items-center justify-between shrink-0"
          style={{ background: 'var(--ds-header)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--ds-header-border)' }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ds-t3)' }}>{ROLE_LABELS[role]}</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--ds-t1)' }}>{user?.full_name || user?.email}</div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('cmdk:open'))}
              className="hidden md:flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-[12px] transition"
              style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t3)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-card-hover)'; e.currentTarget.style.color = 'var(--ds-t2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-input)'; e.currentTarget.style.color = 'var(--ds-t3)'; }}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Suche…</span>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)', color: 'var(--ds-t3)' }}>⌘K</kbd>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-lg transition"
              style={{ color: 'var(--ds-t3)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-card)'; e.currentTarget.style.color = 'var(--ds-t1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ds-t3)'; }}
              title={isDark ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Role switcher — Dev-only. In Prod (Supabase) eine interne Affordance, die echten
                Nutzern nie erscheinen darf (switchRole wirft dort ohnehin). */}
            {!IS_SUPABASE && (
              <div className="relative" ref={roleRef}>
                <button
                  onClick={() => setShowRole((s) => !s)}
                  className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 font-medium transition"
                  style={{ border: '1px solid var(--ds-input-border)', color: 'var(--ds-t2)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-card-hover)'; e.currentTarget.style.color = 'var(--ds-t1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ds-t2)'; }}
                >
                  Rolle wechseln <ChevronDown className="w-3 h-3" />
                </button>
                {showRole && (
                  <div className="absolute right-0 top-full mt-1.5 rounded-xl shadow-[0_24px_48px_rgba(0,0,0,0.3)] w-44 py-1.5 z-20" style={{ background: 'var(--ds-popup)', border: '1px solid var(--ds-popup-border)' }}>
                    {['admin', 'company', 'greeter', 'talent'].map((r) => (
                      <button
                        key={r}
                        onClick={() => onSwitch(r)}
                        className="block w-full text-left px-3.5 py-2 text-sm transition"
                        style={{ color: r === role ? '#c49228' : 'var(--ds-t2)', fontWeight: r === role ? 600 : 400 }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-popup-item-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        {ROLE_LABELS[r]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages — sekundär, als Topbar-Icon statt Sidebar-Punkt */}
            <Link
              to={MESSAGES_ROUTE[role]}
              className="relative p-2 rounded-lg transition"
              style={{ color: 'var(--ds-t2)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-card-hover)'; e.currentTarget.style.color = 'var(--ds-t1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ds-t2)'; }}
              title="Nachrichten"
            >
              <MessageSquare className="w-4 h-4" />
              {totalUnread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-gold text-navy text-[9.5px] font-bold rounded-full grid place-items-center tabular-nums">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotif((s) => !s)}
                className="relative p-2 rounded-lg transition"
                style={{ color: 'var(--ds-t2)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-card-hover)'; e.currentTarget.style.color = 'var(--ds-t1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ds-t2)'; }}
              >
                <Bell className="w-4 h-4" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-gold text-navy text-[9.5px] font-bold rounded-full grid place-items-center tabular-nums">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {showNotif && (
                <div
                  className="absolute right-0 top-full mt-2 rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.3)] w-[400px] max-h-[520px] overflow-hidden z-30 flex flex-col"
                  style={{ background: 'var(--ds-popup)', border: '1px solid var(--ds-popup-border)' }}
                >
                  <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid var(--ds-popup-border)' }}>
                    <div>
                      <div className="font-semibold text-[14px]" style={{ color: 'var(--ds-t1)' }}>Benachrichtigungen</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--ds-t3)' }}>
                        {unread > 0 ? `${unread} ungelesen` : 'Alles gelesen'}
                      </div>
                    </div>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-[11.5px] font-medium transition" style={{ color: 'rgba(196,146,40,0.85)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#c49228'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(196,146,40,0.85)'; }}>
                        Alle als gelesen
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <div className="w-12 h-12 rounded-full grid place-items-center mx-auto mb-3" style={{ background: 'var(--ds-card)' }}>
                          <BellOff className="w-5 h-5" style={{ color: 'var(--ds-t3)' }} />
                        </div>
                        <div className="text-[13px] font-medium" style={{ color: 'var(--ds-t2)' }}>Keine Benachrichtigungen</div>
                        <div className="text-[11.5px] mt-1" style={{ color: 'var(--ds-t3)' }}>Wir melden uns, sobald etwas passiert.</div>
                      </div>
                    ) : (
                      groupNotifs(notifs.slice(0, 20)).map((group) => (
                        <div key={group.label}>
                          <div className="px-4 pt-3 pb-1.5 text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--ds-t3)' }}>
                            {group.label}
                          </div>
                          {group.items.map((n) => (
                            <NotifRow key={n.id} notif={n} onClick={async () => {
                              if (!n.read) { await base44.entities.Notification.update(n.id, { read: true }); reloadNotifs(); }
                              if (n.link) { setShowNotif(false); nav(n.link); }
                            }} />
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {user?.status === 'pending_approval' ? <WaitingForApproval /> : <Outlet />}
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}

// ─── Notification helpers ─────────────────────────────────────────────────────

const NOTIF_ICONS = {
  info:     { icon: Info,           tone: { bg: 'rgba(96,165,250,0.15)',  color: '#93c5fd' } },
  success:  { icon: CheckCircle2,   tone: { bg: 'rgba(74,222,128,0.15)',  color: '#86efac' } },
  warning:  { icon: AlertTriangle,  tone: { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' } },
  alert:    { icon: AlertOctagon,   tone: { bg: 'rgba(248,113,113,0.15)', color: '#fca5a5' } },
  critical: { icon: AlertOctagon,   tone: { bg: 'rgba(248,113,113,0.15)', color: '#fca5a5' } },
  message:  { icon: MessageSquare,  tone: { bg: 'rgba(196,146,40,0.12)',  color: '#c49228' } },
  mission:  { icon: Briefcase,      tone: { bg: 'rgba(196,146,40,0.12)',  color: '#c49228' } },
};

function NotifRow({ notif, onClick }) {
  const cfg = NOTIF_ICONS[notif.type] || NOTIF_ICONS.info;
  const Icon = cfg.icon;
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 flex items-start gap-3 transition"
      style={{
        borderBottom: '1px solid var(--ds-popup-border)',
        background: !notif.read ? 'rgba(196,146,40,0.04)' : 'transparent',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-popup-item-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = !notif.read ? 'rgba(196,146,40,0.04)' : 'transparent'; }}
    >
      <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: cfg.tone.bg }}>
        <Icon className="w-4 h-4" strokeWidth={2.2} style={{ color: cfg.tone.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--ds-t1)' }}>{notif.title}</div>
          {!notif.read && <span className="w-2 h-2 bg-gold rounded-full mt-1.5 shrink-0" />}
        </div>
        {notif.message && <div className="text-[11.5px] mt-0.5 leading-relaxed line-clamp-2" style={{ color: 'var(--ds-t3)' }}>{notif.message}</div>}
        <div className="text-[10.5px] mt-1.5 tabular-nums" style={{ color: 'var(--ds-t3)' }}>{relativeTime(notif.created_at)}</div>
      </div>
    </button>
  );
}

function groupNotifs(items) {
  const today = []; const yesterday = []; const older = [];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  for (const n of items) {
    const d = new Date(n.created_at);
    if (d >= startOfToday) today.push(n);
    else if (d >= startOfYesterday) yesterday.push(n);
    else older.push(n);
  }
  return [
    { label: 'Heute', items: today },
    { label: 'Gestern', items: yesterday },
    { label: 'Älter', items: older },
  ].filter((g) => g.items.length > 0);
}
