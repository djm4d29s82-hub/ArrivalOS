import { useState, useEffect, useCallback } from 'react';
import {
  FileCheck, ShieldPlus, Building2, Landmark, Smartphone, Stethoscope,
  Languages, Calculator, Plus, Trash2, PackageOpen, Loader2,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button, Pill, Select, Input, EmptyState } from '@/components/ui';
import { relativeStepDate } from '@/lib/utils';
import {
  SERVICE_CATALOG, SERVICE_BY_KEY, SERVICE_STATUS, SERVICE_STATUS_ORDER, suggestServiceKeys,
  PROVIDER_TYPES, PROVIDER_TYPE_ORDER,
} from '@/lib/serviceCatalog';

const ICONS = { FileCheck, ShieldPlus, Building2, Landmark, Smartphone, Stethoscope, Languages, Calculator };

/**
 * MissionServices — Services Marketplace v1 (pro Ankunft).
 * Admin/Company aktivieren & tracken Partner-Services (Wohnung, Konto, SIM…) direkt in der Mission.
 * Best-effort: fehlt die Migration, bleibt die Liste leer + ein dezenter Hinweis (kein Crash).
 *
 * Props: missionId, createdBy?, managed (add/edit/delete), onChange?
 */
export default function MissionServices({ missionId, createdBy, managed = false, onChange }) {
  const [services, setServices] = useState([]);
  const [steps, setSteps] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false); // table/RLS missing
  const [busy, setBusy] = useState(false);
  const [addKey, setAddKey] = useState('');

  const load = useCallback(async () => {
    if (!missionId) return;
    setLoading(true);
    try {
      const rows = await base44.entities.MissionService.filter({ mission_id: missionId });
      setServices(Array.isArray(rows) ? rows : []);
      setDegraded(false);
    } catch {
      setServices([]);
      setDegraded(true);
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  useEffect(() => { load(); }, [load]);

  // Journey steps drive the suggestions ("✓ Flug angekommen → Wohnung benötigt"). Managed view only.
  useEffect(() => {
    if (!managed || !missionId) return;
    base44.entities.JourneyStep.filter({ mission_id: missionId })
      .then((s) => setSteps(Array.isArray(s) ? s : []))
      .catch(() => setSteps([]));
    // Active partners for the partner picker (admin-only table per RLS).
    base44.entities.Partner.filter({ status: 'active' })
      .then((p) => setPartners(Array.isArray(p) ? p : []))
      .catch(() => setPartners([]));
  }, [managed, missionId]);

  const setProviderType = async (svc, providerType) => {
    const patch = providerType === 'ag_partner'
      ? { provider_type: providerType }
      : { provider_type: providerType, partner_id: null, provider: providerType === 'company_provided' ? 'Vom Unternehmen gestellt' : null, commission_amount: null };
    setServices((arr) => arr.map((s) => (s.id === svc.id ? { ...s, ...patch } : s)));
    try { await base44.entities.MissionService.update(svc.id, patch); onChange?.(); }
    catch (e) { console.error(e); load(); }
  };

  const setPartner = async (svc, partnerId) => {
    const p = partners.find((x) => x.id === partnerId) || null;
    const patch = { partner_id: partnerId || null, provider: p?.name || null, commission_amount: p?.commission_flat ?? null };
    setServices((arr) => arr.map((s) => (s.id === svc.id ? { ...s, ...patch } : s)));
    try { await base44.entities.MissionService.update(svc.id, patch); onChange?.(); }
    catch (e) { console.error(e); load(); }
  };

  const usedKeys = new Set(services.map((s) => s.category));
  const available = SERVICE_CATALOG.filter((c) => !usedKeys.has(c.key));
  const suggestions = managed ? suggestServiceKeys(steps, usedKeys) : [];

  const add = async (key = addKey) => {
    if (!key || busy) return;
    setBusy(true);
    try {
      await base44.entities.MissionService.create({
        mission_id: missionId,
        category: key,
        status: 'requested',
        created_by: createdBy || null,
      });
      if (key === addKey) setAddKey('');
      await load();
      onChange?.();
    } catch (e) {
      console.error(e);
      setDegraded(true);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (svc, status) => {
    setServices((arr) => arr.map((s) => (s.id === svc.id ? { ...s, status } : s))); // optimistic
    try {
      await base44.entities.MissionService.update(svc.id, { status, updated_at: new Date().toISOString() });
      onChange?.();
    } catch (e) {
      console.error(e);
      load(); // revert from server
    }
  };

  const setNotes = async (svc, notes) => {
    try {
      await base44.entities.MissionService.update(svc.id, { notes: notes || null });
    } catch (e) {
      console.error(e);
    }
  };

  const setDue = async (svc, dateStr) => {
    const due_at = dateStr ? new Date(`${dateStr}T12:00:00`).toISOString() : null;
    setServices((arr) => arr.map((s) => (s.id === svc.id ? { ...s, due_at } : s))); // optimistic
    try {
      await base44.entities.MissionService.update(svc.id, { due_at });
    } catch (e) {
      console.error(e);
      load();
    }
  };

  const remove = async (svc) => {
    setServices((arr) => arr.filter((s) => s.id !== svc.id)); // optimistic
    try {
      await base44.entities.MissionService.delete(svc.id);
      onChange?.();
    } catch (e) {
      console.error(e);
      load();
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-[13px] text-[var(--mid)] py-2"><Loader2 className="w-4 h-4 animate-spin" /> Services laden…</div>;
  }

  return (
    <div className="space-y-3">
      {services.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Noch keine Services aktiviert"
          description={managed ? 'Aktiviere unten Partner-Services für diese Ankunft.' : 'Für diese Ankunft wurden noch keine Services aktiviert.'}
        />
      ) : (
        <div className="space-y-2">
          {services.map((svc) => {
            const cat = SERVICE_BY_KEY[svc.category] || { label: svc.category, iconName: 'PackageOpen', blurb: '' };
            const Icon = ICONS[cat.iconName] || PackageOpen;
            const st = SERVICE_STATUS[svc.status] || { label: svc.status, tone: 'neutral' };
            const openStatus = svc.status !== 'done' && svc.status !== 'skipped';
            const overdue = openStatus && svc.due_at && new Date(svc.due_at).getTime() < Date.now();
            const dueLabel = svc.due_at ? relativeStepDate(svc.due_at) : null;
            const dueValue = svc.due_at ? new Date(svc.due_at).toISOString().slice(0, 10) : '';
            return (
              <div key={svc.id} className="rounded-xl p-3.5" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gold/10 grid place-items-center shrink-0">
                    <Icon className="w-4 h-4 text-gold" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[13.5px]" style={{ color: 'var(--ds-t1)' }}>{cat.label}</div>
                    {svc.provider
                      ? <div className="text-[11.5px] truncate" style={{ color: 'var(--ds-t2)' }}>über {svc.provider}</div>
                      : dueLabel
                        ? <div className={`text-[11.5px] ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`} style={overdue ? undefined : { color: 'var(--ds-t3)' }}>Frist: {dueLabel}</div>
                        : cat.blurb && <div className="text-[11.5px] truncate" style={{ color: 'var(--ds-t3)' }}>{cat.blurb}</div>}
                    {svc.provider && dueLabel && (
                      <div className={`text-[11px] ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`} style={overdue ? undefined : { color: 'var(--ds-t3)' }}>Frist: {dueLabel}</div>
                    )}
                  </div>
                  {managed ? (
                    <Select
                      size="sm"
                      value={svc.status}
                      onChange={(e) => setStatus(svc, e.target.value)}
                      className="shrink-0"
                    >
                      {SERVICE_STATUS_ORDER.map((k) => (
                        <option key={k} value={k}>{SERVICE_STATUS[k].label}</option>
                      ))}
                    </Select>
                  ) : (
                    <Pill tone={st.tone} dot>{st.label}</Pill>
                  )}
                  {managed && (
                    <button
                      onClick={() => remove(svc)}
                      className="w-8 h-8 grid place-items-center rounded-lg text-[var(--ds-t3)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition shrink-0"
                      aria-label="Service entfernen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {managed && (() => {
                  const pt = svc.provider_type || 'ag_partner';
                  const catPartners = partners.filter((p) => p.category === svc.category);
                  return (
                    <>
                      <div className="mt-2.5 flex items-center gap-2">
                        <Select size="sm" value={pt} onChange={(e) => setProviderType(svc, e.target.value)} className="shrink-0">
                          {PROVIDER_TYPE_ORDER.map((k) => <option key={k} value={k}>{PROVIDER_TYPES[k].label}</option>)}
                        </Select>
                        {pt === 'ag_partner' && (
                          catPartners.length > 0 ? (
                            <Select size="sm" value={svc.partner_id || ''} onChange={(e) => setPartner(svc, e.target.value)} className="flex-1">
                              <option value="">— Partner wählen —</option>
                              {catPartners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </Select>
                          ) : (
                            <span className="text-[11.5px] flex-1" style={{ color: 'var(--ds-t3)' }}>Netzwerk im Aufbau — kein Partner in dieser Kategorie.</span>
                          )
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          size="sm"
                          className="flex-1"
                          defaultValue={svc.notes || ''}
                          placeholder={pt === 'company_provided' ? 'Adresse · Schlüssel · Kontakt (für den Greeter sichtbar)' : 'Notiz (optional) — z. B. Termin, Ansprechpartner…'}
                          onBlur={(e) => { if ((e.target.value || '') !== (svc.notes || '')) setNotes(svc, e.target.value); }}
                        />
                        <input
                          type="date"
                          value={dueValue}
                          onChange={(e) => setDue(svc, e.target.value)}
                          title="Frist (optional)"
                          className="h-8 px-2.5 text-[12.5px] rounded-lg shrink-0"
                          style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
                        />
                      </div>
                    </>
                  );
                })()}
                {!managed && svc.notes && (
                  <div className="text-[12px] mt-2 pl-12" style={{ color: 'var(--ds-t2)' }}>{svc.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {managed && suggestions.length > 0 && (
        <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--ds-input)', border: '1px dashed var(--ds-card-border)' }}>
          <div className="text-[10.5px] uppercase tracking-[0.1em] font-semibold mb-2" style={{ color: 'var(--ds-t3)' }}>
            Vorschläge aus dem Ankunftsplan
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((k) => {
              const cat = SERVICE_BY_KEY[k];
              if (!cat) return null;
              const Icon = ICONS[cat.iconName] || Plus;
              return (
                <button
                  key={k}
                  onClick={() => add(k)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full transition hover:border-gold/40 disabled:opacity-50"
                  style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)', color: 'var(--ds-t1)' }}
                >
                  <Icon className="w-3 h-3 text-gold" /> {cat.label} <Plus className="w-3 h-3 opacity-60" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {managed && available.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <Select size="sm" value={addKey} onChange={(e) => setAddKey(e.target.value)} className="flex-1">
            <option value="">Service hinzufügen…</option>
            {available.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </Select>
          <Button size="sm" variant="primary" icon={busy ? undefined : Plus} loading={busy} disabled={!addKey || busy} onClick={() => add()}>
            Hinzufügen
          </Button>
        </div>
      )}

      {degraded && (
        <div className="text-[11.5px] rounded-lg px-3 py-2" style={{ background: 'var(--ds-input)', color: 'var(--ds-t3)' }}>
          Migration ausstehend — Services werden erst nach dem Ausführen von <code>2026-06-mission-services.sql</code> gespeichert.
        </div>
      )}
    </div>
  );
}
