import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Globe, Mail, Phone, X, Building2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/toaster';
import { SERVICE_CATALOG, SERVICE_BY_KEY } from '@/lib/serviceCatalog';

const EMPTY = { name: '', category: 'wohnung', contact_email: '', contact_phone: '', website: '', regions: '', commission_pct: '', commission_flat: '', status: 'active', notes: '' };

/**
 * AdminPartners — directory of REAL signed partners (bank/insurance/housing/language…).
 * Empty by default; nothing is faked. A category without a partner stays "Netzwerk im Aufbau" in the
 * Services Marketplace. Commission terms are admin-only (RLS).
 */
export default function AdminPartners() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: partners = [] } = useQuery({ queryKey: ['partners'], queryFn: () => base44.entities.Partner.list('-created_at').catch(() => []) });

  const [editing, setEditing] = useState(null); // null | 'new' | partner object
  const [form, setForm] = useState(EMPTY);

  const open = (p) => {
    if (p) { setForm({ ...EMPTY, ...p, regions: (p.regions || []).join(', '), commission_pct: p.commission_pct ?? '', commission_flat: p.commission_flat ?? '' }); setEditing(p); }
    else { setForm(EMPTY); setEditing('new'); }
  };
  const close = () => { setEditing(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.name.trim()) { toast({ title: 'Name fehlt', variant: 'destructive' }); return; }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      website: form.website || null,
      regions: form.regions ? form.regions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      commission_pct: form.commission_pct === '' ? null : Number(form.commission_pct),
      commission_flat: form.commission_flat === '' ? null : Number(form.commission_flat),
      status: form.status,
      notes: form.notes || null,
    };
    try {
      if (editing === 'new') await base44.entities.Partner.create({ ...payload, created_by: user?.email || null });
      else await base44.entities.Partner.update(editing.id, payload);
      qc.invalidateQueries({ queryKey: ['partners'] });
      toast({ title: 'Partner gespeichert' });
      close();
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const remove = async (p) => {
    if (!confirm(`Partner „${p.name}" löschen?`)) return;
    try { await base44.entities.Partner.delete(p.id); qc.invalidateQueries({ queryKey: ['partners'] }); toast({ title: 'Partner gelöscht' }); }
    catch (e) { toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' }); }
  };

  const byCat = SERVICE_CATALOG.map((c) => ({ cat: c, items: partners.filter((p) => p.category === c.key) }));
  const fld = 'w-full px-3 py-2.5 text-[13px] rounded-lg';
  const fldStyle = { background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold" style={{ color: 'var(--ds-t1)' }}>Partner</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--ds-t2)' }}>Echte, unterschriebene Partner pro Kategorie. Leere Kategorien bleiben „Netzwerk im Aufbau".</p>
        </div>
        <button onClick={() => open(null)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy text-cream rounded-lg text-[13px] font-semibold hover:bg-navy/90 transition">
          <Plus className="w-4 h-4" /> Partner hinzufügen
        </button>
      </div>

      {byCat.map(({ cat, items }) => (
        <div key={cat.key}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-widest font-bold text-gold">{cat.label}</span>
            <span className="text-[11px]" style={{ color: 'var(--ds-t3)' }}>{items.length || '—'}</span>
          </div>
          {items.length === 0 ? (
            <div className="rounded-xl px-4 py-3 text-[12.5px]" style={{ background: 'var(--ds-input)', color: 'var(--ds-t3)', border: '1px dashed var(--ds-card-border)' }}>
              Netzwerk im Aufbau, noch kein Partner.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((p) => (
                <div key={p.id} className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
                  <div className="w-9 h-9 rounded-lg bg-gold/10 grid place-items-center shrink-0"><Building2 className="w-4 h-4 text-gold" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[14px]" style={{ color: 'var(--ds-t1)' }}>{p.name}</span>
                      {p.status === 'inactive' && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t3)' }}>inaktiv</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] mt-1" style={{ color: 'var(--ds-t2)' }}>
                      {p.contact_email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{p.contact_email}</span>}
                      {p.contact_phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{p.contact_phone}</span>}
                      {p.website && <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" />{p.website}</span>}
                    </div>
                    {(p.commission_pct != null || p.commission_flat != null) && (
                      <div className="text-[11px] mt-1" style={{ color: 'var(--ds-t3)' }}>
                        Revenue-Share: {p.commission_pct != null ? `${p.commission_pct}%` : ''}{p.commission_pct != null && p.commission_flat != null ? ' · ' : ''}{p.commission_flat != null ? `${p.commission_flat} € flat` : ''}
                      </div>
                    )}
                    {p.regions?.length > 0 && <div className="text-[11px] mt-0.5" style={{ color: 'var(--ds-t3)' }}>Regionen: {p.regions.join(', ')}</div>}
                  </div>
                  <button onClick={() => open(p)} className="w-8 h-8 grid place-items-center rounded-lg shrink-0" style={{ color: 'var(--ds-t3)' }} aria-label="Bearbeiten"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(p)} className="w-8 h-8 grid place-items-center rounded-lg text-[var(--ds-t3)] hover:text-red-600 shrink-0" aria-label="Löschen"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={close}>
          <div className="w-full max-w-lg rounded-2xl p-5 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--ds-bg)', border: '1px solid var(--ds-card-border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-serif text-xl font-bold" style={{ color: 'var(--ds-t1)' }}>{editing === 'new' ? 'Neuer Partner' : 'Partner bearbeiten'}</div>
              <button onClick={close} className="w-8 h-8 grid place-items-center rounded-lg" style={{ color: 'var(--ds-t3)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <Lbl t="Name"><input className={fld} style={fldStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Lbl>
              <div className="grid grid-cols-2 gap-3">
                <Lbl t="Kategorie">
                  <select className={fld} style={fldStyle} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    {SERVICE_CATALOG.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </Lbl>
                <Lbl t="Status">
                  <select className={fld} style={fldStyle} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="active">Aktiv</option><option value="inactive">Inaktiv</option>
                  </select>
                </Lbl>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Lbl t="E-Mail"><input className={fld} style={fldStyle} value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} /></Lbl>
                <Lbl t="Telefon"><input className={fld} style={fldStyle} value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} /></Lbl>
              </div>
              <Lbl t="Website"><input className={fld} style={fldStyle} value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} /></Lbl>
              <Lbl t="Regionen (Komma-getrennt, leer = überall)"><input className={fld} style={fldStyle} value={form.regions} onChange={(e) => setForm((f) => ({ ...f, regions: e.target.value }))} /></Lbl>
              <div className="grid grid-cols-2 gap-3">
                <Lbl t="Revenue-Share %"><input type="number" step="0.1" min="0" className={fld} style={fldStyle} value={form.commission_pct} onChange={(e) => setForm((f) => ({ ...f, commission_pct: e.target.value }))} /></Lbl>
                <Lbl t="oder Flat (€)"><input type="number" step="1" min="0" className={fld} style={fldStyle} value={form.commission_flat} onChange={(e) => setForm((f) => ({ ...f, commission_flat: e.target.value }))} /></Lbl>
              </div>
              <Lbl t="Notizen"><textarea rows={2} className={`${fld} resize-none`} style={fldStyle} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Lbl>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={close} className="px-4 py-2 text-[13px] rounded-md" style={{ color: 'var(--ds-t2)' }}>Abbrechen</button>
              <button onClick={save} className="px-4 py-2 bg-navy text-cream rounded-md text-[13px] font-semibold hover:bg-navy/90 transition">Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Lbl({ t, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--ds-t2)' }}>{t}</span>
      {children}
    </label>
  );
}
