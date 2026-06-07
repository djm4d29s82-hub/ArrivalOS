import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toaster';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AlertTriangle, Database, Bell, User, Users, BarChart3, Receipt, ScrollText, ChevronRight, SlidersHorizontal, ListChecks, Wallet, Euro, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { usePush } from '@/lib/usePush';

const TIERS_ID = 'package_tiers';
const TIER_KEYS = [
  { k: 'starter', label: 'Starter' },
  { k: 'professional', label: 'Professional' },
  { k: 'enterprise', label: 'Enterprise' },
];

export default function AdminSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tiers, setTiers] = useState({ starter: '490', professional: '690', enterprise: '900' });
  const [priceSaving, setPriceSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    base44.entities.Settings.get(TIERS_ID)
      .then((row) => { const v = row?.value; if (v && typeof v === 'object') setTiers({ starter: String(v.starter ?? ''), professional: String(v.professional ?? ''), enterprise: String(v.enterprise ?? '') }); })
      .catch(() => {});
  }, [user?.role]);

  const saveTiers = async () => {
    const value = {};
    for (const { k } of TIER_KEYS) {
      const num = Number(tiers[k]);
      if (Number.isNaN(num) || num < 0) { toast({ title: 'Ungültiger Preis', variant: 'destructive' }); return; }
      value[k] = num;
    }
    setPriceSaving(true);
    try {
      try {
        await base44.entities.Settings.update(TIERS_ID, { value });
      } catch {
        await base44.entities.Settings.create({ id: TIERS_ID, key: TIERS_ID, value });
      }
      toast({ title: 'Paketpreise gespeichert', description: `Starter ${value.starter} € · Professional ${value.professional} € · Enterprise ${value.enterprise} €` });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setPriceSaving(false);
    }
  };

  const resetDB = () => {
    if (!confirm('Beispieldaten neu laden? Aktuelle Einträge gehen verloren.')) return;
    base44.resetDB();
    qc.invalidateQueries();
    toast({ title: 'Daten neu geladen', description: 'Initialdatensatz wurde geladen.' });
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold" style={{ color: 'var(--ds-t1)' }}>Einstellungen</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--ds-t2)' }}>Profil, Benachrichtigungen und Daten</p>
      </div>

      <Section icon={User} title="Profil" desc="Eigene Daten">
        <Row label="Name" value={user?.full_name || '—'} />
        <Row label="E-Mail" value={user?.email || '—'} />
        <Row label="Rolle" value={user?.role || '—'} />
      </Section>

      <Section icon={Bell} title="Benachrichtigungen" desc="Push-Mitteilungen auf dieses Gerät">
        <PushToggle />
      </Section>

      {user?.role === 'admin' && (
        <Section icon={Euro} title="Abrechnung" desc="Paketpreise pro Ankunft (je Tier) — bei Mission-Abschluss wird der Tier-Preis des Unternehmens berechnet">
          <div className="grid sm:grid-cols-3 gap-3">
            {TIER_KEYS.map(({ k, label }) => (
              <div key={k}>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--ds-t2)' }}>{label} (€)</label>
                <input
                  type="number" min="0" step="1" value={tiers[k]}
                  onChange={(e) => setTiers((t) => ({ ...t, [k]: e.target.value }))}
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg"
                  style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 mt-1">
            <p className="text-[11.5px]" style={{ color: 'var(--ds-t3)' }}>
              Das Tier eines Unternehmens wird unter „Unternehmen" gesetzt (Standard: Professional).
            </p>
            <button onClick={saveTiers} disabled={priceSaving} className="px-4 py-2.5 bg-navy text-cream rounded-md text-xs font-semibold hover:bg-navy/90 transition disabled:opacity-50 shrink-0">
              Speichern
            </button>
          </div>
        </Section>
      )}

      {user?.role === 'admin' && (
        <Section icon={SlidersHorizontal} title="System & Kontrolle" desc="Team, Reporting, Abrechnung und Betriebsprotokolle">
          <ControlRow to="/admin/team" icon={Users} label="Team & Einladungen" desc="Nutzer einladen, Rollen vergeben" />
          <ControlRow to="/admin/analytics" icon={BarChart3} label="Analytics" desc="Kennzahlen & Trends" />
          <ControlRow to="/admin/quality" icon={BarChart3} label="Quality" desc="Qualitäts-Auswertung" />
          <ControlRow to="/admin/invoices" icon={Receipt} label="Rechnungen" desc="Abrechnung & Belege" />
          <ControlRow to="/admin/payouts" icon={Wallet} label="Greeter-Auszahlungen" desc="Honorare pro Einsatz, als ausgezahlt markieren" />
          <ControlRow to="/admin/partners" icon={Building2} label="Partner" desc="Bank, Versicherung, Wohnung, Sprache — echtes Partnernetzwerk" />
          <ControlRow to="/admin/logs" icon={ScrollText} label="Activity Log" desc="Audit-Verlauf" />
          <ControlRow to="/admin/sops" icon={ScrollText} label="SOPs" desc="Standard-Abläufe" />
          <ControlRow to="/admin/templates" icon={ListChecks} label="Schritt-Vorlagen" desc="Onboarding-Abläufe ohne Deploy" />
        </Section>
      )}

      <Section icon={Database} title="Daten" desc="Arbeitsdaten verwalten">
        <div className="rounded-lg p-4 flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-red-400 text-sm">Beispieldaten neu laden</div>
            <p className="text-xs text-red-500/70 mt-1">Lädt den initialen Datensatz neu. Aktuelle Einträge gehen verloren.</p>
            <button onClick={resetDB} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 transition">Neu laden</button>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, desc, children }) {
  return (
    <div className="rounded-xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
      <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--ds-card-border)' }}>
        <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: 'rgba(196,146,40,0.10)' }}>
          <Icon className="w-4 h-4 text-gold" />
        </div>
        <div>
          <div className="font-semibold text-sm" style={{ color: 'var(--ds-t1)' }}>{title}</div>
          <div className="text-xs" style={{ color: 'var(--ds-t2)' }}>{desc}</div>
        </div>
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

function ControlRow({ to, icon: Icon, label, desc }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 -mx-1 px-3 py-2.5 rounded-lg transition"
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-card-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(196,146,40,0.10)', color: '#c49228' }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium" style={{ color: 'var(--ds-t1)' }}>{label}</div>
        <div className="text-[11.5px]" style={{ color: 'var(--ds-t3)' }}>{desc}</div>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-t3)' }} />
    </Link>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2 last:border-0" style={{ borderBottom: '1px solid var(--ds-card-border)' }}>
      <span className="text-xs" style={{ color: 'var(--ds-t2)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--ds-t1)' }}>{value}</span>
    </div>
  );
}

function PushToggle() {
  const { supported, status, enable, disable } = usePush();
  if (!supported) return <div className="text-[12.5px]" style={{ color: 'var(--ds-t3)' }}>Dieses Gerät unterstützt keine Push-Mitteilungen.</div>;
  if (status === 'denied') return <div className="text-[12.5px]" style={{ color: 'var(--ds-t3)' }}>Benachrichtigungen sind im Browser blockiert. Bitte in den Browser-Einstellungen erlauben.</div>;
  const on = status === 'on';
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium" style={{ color: 'var(--ds-t1)' }}>Push-Benachrichtigungen</div>
        <div className="text-[11.5px]" style={{ color: 'var(--ds-t3)' }}>Neue Mission, Flug-Updates, Nachrichten — auch wenn die App geschlossen ist.</div>
      </div>
      <button
        onClick={on ? disable : enable}
        disabled={status === 'busy'}
        className={`px-4 py-2 rounded-md text-xs font-semibold transition disabled:opacity-50 ${on ? '' : 'bg-navy text-cream hover:bg-navy/90'}`}
        style={on ? { background: 'var(--ds-card-border)', color: 'var(--ds-t1)' } : undefined}
      >
        {status === 'busy' ? '…' : on ? 'Deaktivieren' : 'Aktivieren'}
      </button>
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
function Toggle({ label, defaultChecked = false }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
      <span className="text-sm" style={{ color: 'var(--ds-t1)' }}>{label}</span>
      <input type="checkbox" defaultChecked={defaultChecked} className="w-4 h-4 accent-gold" />
    </label>
  );
}
