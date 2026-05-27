import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toaster';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Database, Bell, User, Users, BarChart3, Receipt, ScrollText, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function AdminSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

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

      <Section icon={Bell} title="Benachrichtigungen" desc="Wann möchtest du benachrichtigt werden?">
        <Toggle label="Neue Mission verfügbar" defaultChecked />
        <Toggle label="Mission abgeschlossen" defaultChecked />
        <Toggle label="Neue Nachricht" defaultChecked />
        <Toggle label="Wöchentliche Zusammenfassung" />
      </Section>

      {user?.role === 'admin' && (
        <Section icon={SlidersHorizontal} title="System & Kontrolle" desc="Team, Reporting, Abrechnung und Betriebsprotokolle">
          <ControlRow to="/admin/team" icon={Users} label="Team & Einladungen" desc="Nutzer einladen, Rollen vergeben" />
          <ControlRow to="/admin/analytics" icon={BarChart3} label="Analytics" desc="Kennzahlen & Trends" />
          <ControlRow to="/admin/quality" icon={BarChart3} label="Quality" desc="Qualitäts-Auswertung" />
          <ControlRow to="/admin/invoices" icon={Receipt} label="Rechnungen" desc="Abrechnung & Belege" />
          <ControlRow to="/admin/logs" icon={ScrollText} label="Activity Log" desc="Audit-Verlauf" />
          <ControlRow to="/admin/sops" icon={ScrollText} label="SOPs" desc="Standard-Abläufe" />
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

function Toggle({ label, defaultChecked = false }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
      <span className="text-sm" style={{ color: 'var(--ds-t1)' }}>{label}</span>
      <input type="checkbox" defaultChecked={defaultChecked} className="w-4 h-4 accent-gold" />
    </label>
  );
}
