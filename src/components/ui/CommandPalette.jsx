import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search, Briefcase, Users, Building2, UserCheck, Activity, Settings, BarChart3,
  ScrollText, MessageSquare, Receipt, FileText, ArrowRight, Hash,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

/**
 * CommandPalette — Linear/Notion-style global search (Cmd-K / Ctrl-K).
 * Searches missions, greeters, companies, candidates + static navigation actions.
 */
export default function CommandPalette() {
  const nav = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'admin';

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [data, setData] = useState({ missions: [], greeters: [], companies: [], candidates: [] });
  const inputRef = useRef(null);

  // Global hotkey
  useEffect(() => {
    const onKey = (e) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
      if (isCmdK) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    const onOpen = () => setOpen(true);
    window.addEventListener('cmdk:open', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('cmdk:open', onOpen);
    };
  }, [open]);

  // Load entities on first open
  useEffect(() => {
    if (!open) return;
    setQ(''); setActive(0);
    setTimeout(() => inputRef.current?.focus(), 30);
    (async () => {
      try {
        const [missions, greeters, companies, candidates] = await Promise.all([
          base44.entities.Mission.list('-datetime').catch(() => []),
          base44.entities.GreeterProfile.list().catch(() => []),
          base44.entities.Company.list().catch(() => []),
          base44.entities.Candidate.list().catch(() => []),
        ]);
        setData({ missions, greeters, companies, candidates });
      } catch { /* empty */ }
    })();
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const ACTIONS = useMemo(() => buildActions(role), [role]);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const match = (text) => !term || (text || '').toLowerCase().includes(term);

    const missions = data.missions
      .filter((m) => match(`${m.title} ${m.city} ${m.location || ''} ${m.id}`))
      .slice(0, 6)
      .map((m) => ({
        type: 'mission', id: m.id, title: m.title,
        subtitle: `${m.city || '—'} · ${m.status}`,
        icon: Briefcase,
        to: role === 'admin' ? `/admin/missions/${m.id}`
          : role === 'greeter' ? `/greeter-dashboard/missions/${m.id}`
          : '/company/missions',
      }));
    const greeters = role === 'admin' ? data.greeters.filter((g) => match(g.full_name)).slice(0, 5).map((g) => ({
      type: 'greeter', id: g.id, title: g.full_name,
      subtitle: `${g.city || ''} · ★ ${g.rating?.toFixed(1) || '—'}`,
      icon: Users, to: '/admin/greeters',
    })) : [];
    const companies = role === 'admin' ? data.companies.filter((c) => match(c.name)).slice(0, 5).map((c) => ({
      type: 'company', id: c.id, title: c.name,
      subtitle: c.industry || c.city || '',
      icon: Building2, to: '/admin/companies',
    })) : [];
    const candidates = role === 'admin' ? data.candidates.filter((c) => match(c.full_name)).slice(0, 5).map((c) => ({
      type: 'candidate', id: c.id, title: c.full_name,
      subtitle: c.country_of_origin || c.email || '',
      icon: UserCheck, to: '/admin/candidates',
    })) : [];
    const actions = ACTIONS.filter((a) => match(`${a.title} ${a.subtitle || ''}`)).slice(0, 8);

    const all = [
      actions.length && { label: 'Aktionen', items: actions },
      missions.length && { label: 'Missionen', items: missions },
      greeters.length && { label: 'Greeter', items: greeters },
      companies.length && { label: 'Unternehmen', items: companies },
      candidates.length && { label: 'Talente', items: candidates },
    ].filter(Boolean);
    return all;
  }, [q, data, ACTIONS, role]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => { if (active >= flat.length) setActive(0); }, [flat.length, active]);

  const choose = (item) => {
    setOpen(false);
    nav(item.to);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (flat[active]) choose(flat[active]); }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-2xl shadow-[0_24px_60px_-12px_rgba(16,24,40,.30)] overflow-hidden flex flex-col max-h-[70vh] animate-slide-up"
        style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
      >
        <div className="flex items-center gap-3 px-4 h-14" style={{ borderBottom: '1px solid var(--ds-card-border)' }}>
          <Search className="w-4 h-4 text-[var(--light)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Suche Missionen, Greeter, Talente oder navigiere…"
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--light)]"
            style={{ color: 'var(--ds-t1)' }}
          />
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-[var(--mid)] font-mono"
            style={{ background: 'var(--ds-card-border)', border: '1px solid var(--ds-card-border)' }}>ESC</kbd>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {flat.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Hash className="w-5 h-5 text-[var(--light)] mx-auto mb-2" />
              <div className="text-[13px] text-[var(--mid)]">Keine Treffer für „{q}"</div>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.label}>
                <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--light)] font-semibold">{g.label}</div>
                <div>
                  {g.items.map((item) => {
                    const flatIdx = flat.indexOf(item);
                    const isActive = flatIdx === active;
                    const Icon = item.icon;
                    return (
                      <button
                        key={`${item.type}-${item.id || item.to}`}
                        onMouseEnter={() => setActive(flatIdx)}
                        onClick={() => choose(item)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition"
                        style={{ background: isActive ? 'rgba(196,146,40,0.08)' : 'transparent' }}
                      >
                        <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
                          style={{ background: isActive ? 'rgba(196,146,40,0.15)' : 'var(--ds-card-border)', color: isActive ? '#8a6818' : 'var(--ds-t2)' }}>
                          <Icon className="w-4 h-4" strokeWidth={2.2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium truncate" style={{ color: 'var(--ds-t1)' }}>{item.title}</div>
                          {item.subtitle && <div className="text-[11.5px] text-[var(--mid)] truncate">{item.subtitle}</div>}
                        </div>
                        {isActive && <ArrowRight className="w-3.5 h-3.5 text-gold shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 flex items-center justify-between text-[11px] text-[var(--light)]"
          style={{ borderTop: '1px solid var(--ds-card-border)', background: 'var(--ds-card)' }}>
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 rounded text-[10px] font-mono"
              style={{ background: 'var(--ds-card-border)', border: '1px solid var(--ds-card-border)' }}>↑↓</kbd> Navigieren</span>
            <span><kbd className="px-1 py-0.5 rounded text-[10px] font-mono"
              style={{ background: 'var(--ds-card-border)', border: '1px solid var(--ds-card-border)' }}>↵</kbd> Öffnen</span>
          </div>
          <div className="hidden md:block">{flat.length} Treffer</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function buildActions(role) {
  const A = (title, to, icon, subtitle) => ({ type: 'action', title, to, icon, subtitle });
  if (role === 'admin') return [
    A('Operations Center', '/admin', Activity, 'Übersicht'),
    A('Missionen', '/admin/missions', Briefcase, 'Alle Einsätze'),
    A('Talente', '/admin/candidates', UserCheck),
    A('Greeter', '/admin/greeters', Users),
    A('Unternehmen', '/admin/companies', Building2),
    A('Nachrichten', '/admin/messages', MessageSquare),
    A('Analytics', '/admin/analytics', BarChart3),
    A('Quality', '/admin/quality', BarChart3),
    A('Rechnungen', '/admin/invoices', Receipt),
    A('Activity Log', '/admin/logs', ScrollText),
    A('SOPs', '/admin/sops', ScrollText),
    A('Einstellungen', '/admin/settings', Settings),
  ];
  if (role === 'company') return [
    A('Dashboard', '/company', Activity),
    A('Missionen', '/company/missions', Briefcase),
    A('Talente', '/company/candidates', UserCheck),
    A('Dokumente', '/company/documents', FileText),
    A('Nachrichten', '/company/messages', MessageSquare),
    A('Rechnungen', '/company/invoices', Receipt),
    A('Einstellungen', '/company/settings', Settings),
  ];
  if (role === 'greeter') return [
    A('Dashboard', '/greeter-dashboard', Activity),
    A('Meine Einsätze', '/greeter-dashboard/missions', Briefcase),
    A('Nachrichten', '/greeter-dashboard/messages', MessageSquare),
    A('Profil', '/greeter-dashboard/profile', Settings),
  ];
  return [
    A('Meine Journey', '/talent', Activity),
    A('Dokumente', '/talent/documents', FileText),
    A('Nachrichten', '/talent/messages', MessageSquare),
  ];
}
