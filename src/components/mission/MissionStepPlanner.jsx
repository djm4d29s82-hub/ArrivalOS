import { useEffect, useState } from 'react';
import {
  Plus, ChevronUp, ChevronDown, Trash2, Check, CalendarClock, ListPlus,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toaster';
import {
  Card, CardBody, Button, Input, Select, Field, Modal, SectionHeader, EmptyState,
} from '@/components/ui';
import { MISSION_TEMPLATES } from '@/lib/missionTemplates';
import { resolveStepMeta } from '@/lib/journeySteps';
import { relativeStepDate } from '@/lib/utils';

/* ── date helpers ────────────────────────────────────────────── */
function toISO(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
function toDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
function addDaysISO(baseISO, days) {
  if (!baseISO || days == null) return null;
  const t = new Date(baseISO).getTime();
  if (isNaN(t)) return null;
  return new Date(t + days * 86400000).toISOString();
}

/**
 * MissionStepPlanner — Admin tool to plan the onboarding journey for a mission.
 * Apply a template, add/edit/reorder/delete steps, set a target date per step.
 * Persists through base44.entities.JourneyStep; optimistic UI for every mutation.
 */
export default function MissionStepPlanner({ missionId, missionDatetime, onStepsChange }) {
  const { toast } = useToast();
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newStep, setNewStep] = useState({ title: '', note: '', date: '' });
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const js = await base44.entities.JourneyStep.filter({ mission_id: missionId }, 'order');
      setSteps([...js].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch {
      setSteps([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (missionId) load(); }, [missionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Report the current step count to the parent (drives the assignment guard).
  useEffect(() => { onStepsChange?.(steps.length); }, [steps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxOrder = steps.reduce((m, s) => Math.max(m, s.order ?? 0), 0);

  /* ── templates ─────────────────────────────────────────────── */
  const onPickTemplate = (id) => {
    setTemplateId(id);
    if (!id) return;
    const tpl = MISSION_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    if (steps.length === 0) applyTemplate(tpl, 'replace');
    else setPendingTemplate(tpl);
  };

  const applyTemplate = async (tpl, mode) => {
    setBusy(true);
    setPendingTemplate(null);
    const oldSteps = mode === 'replace' ? steps : [];
    try {
      const startOrder = mode === 'append' ? maxOrder + 10 : 10;
      const rows = tpl.steps.map((s, i) => {
        const row = {
          mission_id: missionId,
          title: s.title,
          description: s.description || '',
          order: startOrder + i * 10,
          status: 'pending',
          completed_at: null,
        };
        const sched = addDaysISO(missionDatetime, s.offsetDays);
        if (sched) row.scheduled_at = sched;
        return row;
      });
      // Create the new steps FIRST, then delete the old ones — a mid-flight network
      // failure can never leave the mission with zero steps (briefly both coexist).
      await base44.entities.JourneyStep.bulkCreate(rows);
      if (oldSteps.length) {
        await Promise.all(oldSteps.map((s) => base44.entities.JourneyStep.delete(s.id)));
      }
      toast({ title: `Vorlage „${tpl.name}“ angewendet` });
      await load();
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setBusy(false);
      setTemplateId('');
    }
  };

  /* ── add ───────────────────────────────────────────────────── */
  const onAdd = async () => {
    const title = newStep.title.trim();
    if (!title) return;
    const optimistic = {
      id: `tmp-${Date.now()}`,
      mission_id: missionId,
      title,
      description: newStep.note.trim(),
      order: maxOrder + 10,
      status: 'pending',
      completed_at: null,
      scheduled_at: toISO(newStep.date),
    };
    setSteps((p) => [...p, optimistic]);
    setNewStep({ title: '', note: '', date: '' });
    setAdding(false);
    try {
      const row = { ...optimistic };
      delete row.id;
      if (!row.scheduled_at) delete row.scheduled_at;
      const created = await base44.entities.JourneyStep.create(row);
      setSteps((p) => p.map((s) => (s.id === optimistic.id ? created : s)));
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
      load();
    }
  };

  /* ── edit title ────────────────────────────────────────────── */
  const startEdit = (s) => { setEditingId(s.id); setEditTitle(s.title); };
  const saveEdit = async (s) => {
    const title = editTitle.trim();
    setEditingId(null);
    if (!title || title === s.title) return;
    setSteps((p) => p.map((x) => (x.id === s.id ? { ...x, title } : x)));
    try { await base44.entities.JourneyStep.update(s.id, { title }); } catch { load(); }
  };

  /* ── edit date ─────────────────────────────────────────────── */
  const onChangeDate = async (s, dateStr) => {
    const iso = toISO(dateStr);
    setSteps((p) => p.map((x) => (x.id === s.id ? { ...x, scheduled_at: iso } : x)));
    try { await base44.entities.JourneyStep.update(s.id, { scheduled_at: iso }); } catch { load(); }
  };

  /* ── reorder (swap order values of two neighbours) ─────────── */
  const move = async (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= steps.length) return;
    const a = steps[index];
    const b = steps[j];
    const updated = steps
      .map((s) => {
        if (s.id === a.id) return { ...s, order: b.order };
        if (s.id === b.id) return { ...s, order: a.order };
        return s;
      })
      .sort((x, y) => (x.order ?? 0) - (y.order ?? 0));
    setSteps(updated);
    try {
      await base44.entities.JourneyStep.update(a.id, { order: b.order });
      await base44.entities.JourneyStep.update(b.id, { order: a.order });
    } catch { load(); }
  };

  /* ── delete ────────────────────────────────────────────────── */
  const onDelete = async (s) => {
    setConfirmDelete(null);
    setSteps((p) => p.filter((x) => x.id !== s.id));
    try { await base44.entities.JourneyStep.delete(s.id); } catch { load(); }
  };

  const doneCount = steps.filter((s) => s.status === 'completed').length;

  return (
    <Card variant="default">
      <CardBody>
        <SectionHeader
          title="Schritte planen"
          count={steps.length ? `${doneCount}/${steps.length}` : undefined}
          action={
            <div className="flex items-center gap-2">
              <Select value={templateId} onChange={(e) => onPickTemplate(e.target.value)} disabled={busy}>
                <option value="">Vorlage…</option>
                {MISSION_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <Button variant="outline" size="sm" icon={Plus} onClick={() => setAdding((v) => !v)}>Schritt</Button>
            </div>
          }
        />

        {/* Add-step inline form */}
        {adding && (
          <div className="mt-3 rounded-lg p-3 space-y-2.5" style={{ background: 'var(--ds-card-border)' }}>
            <Field label="Titel">
              <Input autoFocus value={newStep.title} onChange={(e) => setNewStep((s) => ({ ...s, title: e.target.value }))} placeholder="z. B. Bankkonto eröffnen" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Notiz (optional)">
                <Input value={newStep.note} onChange={(e) => setNewStep((s) => ({ ...s, note: e.target.value }))} placeholder="Details…" />
              </Field>
              <Field label="Datum (optional)">
                <Input type="date" value={newStep.date} onChange={(e) => setNewStep((s) => ({ ...s, date: e.target.value }))} />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewStep({ title: '', note: '', date: '' }); }}>Abbrechen</Button>
              <Button variant="primary" size="sm" icon={Check} disabled={!newStep.title.trim()} onClick={onAdd}>Hinzufügen</Button>
            </div>
          </div>
        )}

        {/* Step list */}
        {loading ? (
          <div className="mt-3 text-[12.5px]" style={{ color: 'var(--ds-t3)' }}>Lädt…</div>
        ) : steps.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={ListPlus}
              title="Noch keine Schritte geplant"
              description="Wende eine Vorlage an oder füge Schritte einzeln hinzu."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {steps.map((s, i) => {
              const StepIcon = resolveStepMeta(s).icon;
              const done = s.status === 'completed';
              const due = relativeStepDate(s.scheduled_at);
              return (
                <li key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-2" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
                  {/* reorder */}
                  <div className="flex flex-col">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-25" aria-label="Nach oben">
                      <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--ds-t3)' }} />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="disabled:opacity-25" aria-label="Nach unten">
                      <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--ds-t3)' }} />
                    </button>
                  </div>

                  <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: done ? 'rgba(34,197,94,0.12)' : 'rgba(196,146,40,0.10)', color: done ? '#16a34a' : '#c49228' }}>
                    <StepIcon className="w-3.5 h-3.5" />
                  </div>

                  {/* title (inline edit) */}
                  <div className="min-w-0 flex-1">
                    {editingId === s.id ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => saveEdit(s)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(s); if (e.key === 'Escape') setEditingId(null); }}
                        className="w-full px-2 py-1 rounded text-[13px]"
                        style={{ background: 'var(--ds-bg)', border: '1px solid var(--ds-card-border)', color: 'var(--ds-t1)' }}
                      />
                    ) : (
                      <button onClick={() => startEdit(s)} className="text-left w-full">
                        <span className="text-[13px] font-medium" style={{ color: done ? 'var(--ds-t3)' : 'var(--ds-t1)', textDecoration: done ? 'line-through' : 'none' }}>{s.title}</span>
                        {due && <span className="ml-2 text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--ds-t3)' }}><CalendarClock className="w-3 h-3" />{due}</span>}
                      </button>
                    )}
                  </div>

                  {/* date */}
                  <input
                    type="date"
                    value={toDateInput(s.scheduled_at)}
                    onChange={(e) => onChangeDate(s, e.target.value)}
                    className="px-1.5 py-1 rounded text-[11px] shrink-0"
                    style={{ background: 'var(--ds-bg)', border: '1px solid var(--ds-card-border)', color: 'var(--ds-t2)' }}
                  />

                  {/* delete */}
                  <button onClick={() => setConfirmDelete(s)} aria-label="Löschen" className="shrink-0 p-1.5 rounded hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>

      {/* Replace / append modal */}
      {pendingTemplate && (
        <Modal
          open
          onClose={() => { setPendingTemplate(null); setTemplateId(''); }}
          title={`Vorlage „${pendingTemplate.name}“`}
          description="Es sind bereits Schritte geplant. Möchtest du sie ersetzen oder die Vorlage anhängen?"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setPendingTemplate(null); setTemplateId(''); }}>Abbrechen</Button>
              <Button variant="outline" icon={ListPlus} loading={busy} onClick={() => applyTemplate(pendingTemplate, 'append')}>Anhängen</Button>
              <Button variant="danger" loading={busy} onClick={() => applyTemplate(pendingTemplate, 'replace')}>Ersetzen</Button>
            </>
          }
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <Modal
          open
          onClose={() => setConfirmDelete(null)}
          title="Schritt löschen?"
          description={confirmDelete.title}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Abbrechen</Button>
              <Button variant="danger" icon={Trash2} onClick={() => onDelete(confirmDelete)}>Löschen</Button>
            </>
          }
        />
      )}
    </Card>
  );
}
