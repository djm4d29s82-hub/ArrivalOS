import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Mail, Link2, Copy, Check, Clock, ShieldCheck } from 'lucide-react';
import { base44, BACKEND_MODE } from '@/api/base44Client';
import { createInvite, approveUser, rejectUser } from '@/api/inviteUser';
import { useToast } from '@/components/ui/toaster';
import {
  PageHeader, Card, Button, Field, Input, Select, Avatar, Pill, SkeletonCard, EmptyState,
} from '@/components/ui';

const ROLE_LABELS = { admin: 'Admin', company: 'Unternehmen', greeter: 'Greeter', talent: 'Talent' };
const ROLE_TONE = { admin: 'navy', company: 'gold', greeter: 'green', talent: 'blue' };

export default function AdminTeam() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: candidates = [] } = useQuery({ queryKey: ['candidates'], queryFn: () => base44.entities.Candidate.list() });

  const pending = useMemo(() => users.filter((u) => u.status === 'pending_approval'), [users]);

  const [form, setForm] = useState({ full_name: '', email: '', role: 'talent', company_id: '', candidate_id: '', city: '', languages: '', mode: 'link' });
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setLink('');
    try {
      const res = await createInvite({
        email: form.email,
        full_name: form.full_name,
        role: form.role,
        company_id: form.role === 'company' ? form.company_id || null : null,
        candidate_id: form.role === 'talent' ? form.candidate_id || null : null,
        city: form.city,
        languages: form.languages ? form.languages.split(',').map((s) => s.trim()).filter(Boolean) : [],
        mode: form.mode,
      });
      if (res.link) setLink(res.link);
      toast({
        title: form.mode === 'email' ? 'Einladung verschickt' : 'Einladungslink erstellt',
        description: form.mode === 'email'
          ? `${form.email} erhält eine E-Mail mit dem Link.`
          : 'Link unten kopieren und an die Person senden.',
      });
      setForm({ full_name: '', email: '', role: 'talent', company_id: '', candidate_id: '', city: '', languages: '', mode: form.mode });
      qc.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast({ title: 'Fehler', description: err?.message || String(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
  };

  const decide = async (u, approve) => {
    try {
      await (approve ? approveUser(u.id) : rejectUser(u.id));
      toast({ title: approve ? 'Zugang freigegeben' : 'Abgelehnt', description: u.email });
      qc.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast({ title: 'Fehler', description: err?.message || String(err), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      <PageHeader eyebrow="System · Team" title="Team & Einladungen" description={`${users.length} Nutzer · Einladen, freigeben, Rollen setzen`} />

      {/* Invite form */}
      <Card variant="default" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-gold" />
          <h2 className="font-semibold text-[15px]" style={{ color: 'var(--ds-t1)' }}>Nutzer einladen</h2>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name"><Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Vor- und Nachname" /></Field>
            <Field label={form.mode === 'email' ? 'E-Mail (Pflicht)' : 'E-Mail (optional, sperrt den Link)'}>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@firma.de" required={form.mode === 'email'} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Rolle">
              <Select value={form.role} onChange={(e) => set('role', e.target.value)} className="w-full">
                {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Einladung per">
              <Select value={form.mode} onChange={(e) => set('mode', e.target.value)} className="w-full">
                <option value="link">Teilbarer Link</option>
                <option value="email">E-Mail</option>
              </Select>
            </Field>
          </div>

          {form.role === 'company' && (
            <Field label="Unternehmen">
              <Select value={form.company_id} onChange={(e) => set('company_id', e.target.value)} className="w-full">
                <option value="">— wählen —</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          )}
          {form.role === 'talent' && (
            <Field label="Kandidat:in">
              <Select value={form.candidate_id} onChange={(e) => set('candidate_id', e.target.value)} className="w-full">
                <option value="">— wählen —</option>
                {candidates.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </Select>
            </Field>
          )}
          {form.role === 'greeter' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Stadt"><Input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="München" /></Field>
              <Field label="Sprachen (kommagetrennt)"><Input value={form.languages} onChange={(e) => set('languages', e.target.value)} placeholder="Deutsch, Englisch" /></Field>
            </div>
          )}

          <Button type="submit" variant="primary" icon={form.mode === 'email' ? Mail : Link2} loading={busy} disabled={form.mode === 'email' && !form.email}>
            {form.mode === 'email' ? 'Einladung senden' : 'Link erzeugen'}
          </Button>
        </form>

        {link && (
          <div className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)' }}>
            <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#c49228' }} />
            <span className="text-[12px] truncate flex-1" style={{ color: 'var(--ds-t1)' }}>{link}</span>
            <button onClick={copy} className="shrink-0 inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: copied ? '#16a34a' : 'var(--ds-t2)' }}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Kopiert' : 'Kopieren'}
            </button>
          </div>
        )}
        {BACKEND_MODE !== 'supabase' && (
          <p className="mt-3 text-[11.5px]" style={{ color: 'var(--ds-t3)' }}>Demo-Modus: Link funktioniert lokal, kein echter Mailversand.</p>
        )}
      </Card>

      {/* Pending approvals (nur privilegierte Rollen landen hier) */}
      {pending.length > 0 && (
        <Card variant="default" className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gold" />
            <h2 className="font-semibold text-[15px]" style={{ color: 'var(--ds-t1)' }}>Ausstehende Freigaben</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(196,146,40,0.15)', color: '#c49228' }}>{pending.length}</span>
          </div>
          <div className="space-y-2">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--ds-input)' }}>
                <Avatar name={u.full_name || u.email} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[13px] truncate" style={{ color: 'var(--ds-t1)' }}>{u.full_name || u.email}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--ds-t3)' }}>{u.email} · {ROLE_LABELS[u.role] || u.role}</div>
                </div>
                <Button variant="success" size="xs" onClick={() => decide(u, true)}>Freigeben</Button>
                <Button variant="ghost" size="xs" className="!text-red-600 hover:!bg-red-500/10" onClick={() => decide(u, false)}>Ablehnen</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* User list */}
      {isLoading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
      ) : users.length === 0 ? (
        <Card variant="flat"><EmptyState icon={ShieldCheck} title="Noch keine Nutzer" /></Card>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
          {users.map((u, i) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3" style={i > 0 ? { borderTop: '1px solid var(--ds-card-border)' } : {}}>
              <Avatar name={u.full_name || u.email} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[13.5px] truncate" style={{ color: 'var(--ds-t1)' }}>{u.full_name || '—'}</div>
                <div className="text-[11.5px] truncate" style={{ color: 'var(--ds-t3)' }}>{u.email}</div>
              </div>
              {u.status === 'pending_approval' && <Pill tone="amber" size="xs">Wartet</Pill>}
              <Pill tone={ROLE_TONE[u.role] || 'navy'} size="xs">{ROLE_LABELS[u.role] || u.role}</Pill>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
