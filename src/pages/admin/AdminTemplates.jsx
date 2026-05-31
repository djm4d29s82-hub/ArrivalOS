import { useEffect, useState } from 'react';
import {
  Plus, ChevronUp, ChevronDown, Trash2, Copy, Save, ListChecks, Lock, ListPlus,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toaster';
import {
  Card, CardBody, Button, Input, Field, Modal, SectionHeader, EmptyState, Pill,
} from '@/components/ui';
import { MISSION_TEMPLATES, loadDbTemplates } from '@/lib/missionTemplates';

const parseBring = (str) => (str || '').split(',').map((x) => x.trim()).filter(Boolean);
const emptyStep = () => ({ key: '', title: '', description: '', offsetDays: 0, bring: [] });

/**
 * AdminTemplates — manage reusable journey-step templates without a code deploy.
 * Built-ins (MISSION_TEMPLATES) are read-only and can be "Duplizieren"-ed into an
 * editable DB copy; DB templates (mission_templates table) are fully editable.
 * The planner's "Vorlage…" picker merges both via loadAllTemplates().
 */
export default function AdminTemplates() {
  const { toast } = useToast();
  const [dbTemplates, setDbTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setDbTemplates(await loadDbTemplates());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  /* ── create / duplicate ─────────────────────────────────────── */
  const createTemplate = async (name, steps) => {
    try {
      const created = await base44.entities.MissionTemplate.create({ name, steps });
      setDbTemplates((p) => [{ id: created.id, name: created.name, steps: created.steps || steps, builtin: false }, ...p]);
      toast({ title: `Vorlage „${name}" erstellt` });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || 'Konnte Vorlage nicht erstellen (Migration mission_templates ausgeführt?).', variant: 'destructive' });
    }
  };
  const onNew = () => createTemplate('Neue Vorlage', []);
  const onDuplicate = (tpl) => createTemplate(
    `${tpl.name} (Kopie)`,
    tpl.steps.map((s) => ({ key: s.key || '', title: s.title, description: s.description || '', offsetDays: s.offsetDays ?? 0, bring: Array.isArray(s.bring) ? [...s.bring] : [] })),
  );

  /* ── delete ─────────────────────────────────────────────────── */
  const onDelete = async (tpl) => {
    setConfirmDelete(null);
    setDbTemplates((p) => p.filter((t) => t.id !== tpl.id));
    try { await base44.entities.MissionTemplate.delete(tpl.id); } catch { load(); }
  };

  /* ── persist one DB template (name + steps) ─────────────────── */
  const saveTemplate = async (id, patch) => {
    try {
      await base44.entities.MissionTemplate.update(id, patch);
      toast({ title: 'Gespeichert' });
    } catch (e) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
      load();
    }
  };

  return (
    <div>
      <div className="mb-2 text-[11px] uppercase tracking-widest text-gold font-bold">Operations · Vorlagen</div>
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ds-t1)' }}>Schritt-Vorlagen</h1>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--ds-t2)' }}>
            Wiederverwendbare Onboarding-Abläufe — ohne Deploy. Im Missions-Planer unter „Vorlage…" anwendbar.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={onNew}>Neue Vorlage</Button>
      </div>

      {/* Built-in templates — read-only */}
      <div className="mt-8 space-y-4">
        <div className="text-[11px] uppercase tracking-widest font-bold" style={{ color: 'var(--ds-t3)' }}>Standard-Vorlagen</div>
        {MISSION_TEMPLATES.map((tpl) => (
          <Card key={tpl.id} variant="default">
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold" style={{ color: 'var(--ds-t1)' }}>{tpl.name}</span>
                    <Pill tone="neutral"><Lock className="w-3 h-3" /> Standard</Pill>
                  </div>
                  <div className="mt-1 text-[12.5px]" style={{ color: 'var(--ds-t3)' }}>{tpl.steps.length} Schritte</div>
                </div>
                <Button variant="outline" size="sm" icon={Copy} onClick={() => onDuplicate(tpl)}>Duplizieren</Button>
              </div>
              <ol className="mt-3 flex flex-wrap gap-1.5">
                {tpl.steps.map((s, i) => (
                  <li key={i} className="text-[11.5px] px-2 py-1 rounded" style={{ background: 'var(--ds-card-border)', color: 'var(--ds-t2)' }}>
                    {s.title} <span style={{ color: 'var(--ds-t3)' }}>· Tag {s.offsetDays ?? 0}</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* DB templates — editable */}
      <div className="mt-8 space-y-4">
        <div className="text-[11px] uppercase tracking-widest font-bold" style={{ color: 'var(--ds-t3)' }}>Eigene Vorlagen</div>
        {loading ? (
          <div className="text-[12.5px]" style={{ color: 'var(--ds-t3)' }}>Lädt…</div>
        ) : dbTemplates.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Noch keine eigenen Vorlagen"
            description="Erstelle eine neue Vorlage oder dupliziere eine Standard-Vorlage zum Bearbeiten."
          />
        ) : (
          dbTemplates.map((tpl) => (
            <EditableTemplate
              key={tpl.id}
              template={tpl}
              onSave={(patch) => saveTemplate(tpl.id, patch)}
              onDelete={() => setConfirmDelete(tpl)}
            />
          ))
        )}
      </div>

      {confirmDelete && (
        <Modal
          open
          onClose={() => setConfirmDelete(null)}
          title="Vorlage löschen?"
          description={confirmDelete.name}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Abbrechen</Button>
              <Button variant="danger" icon={Trash2} onClick={() => onDelete(confirmDelete)}>Löschen</Button>
            </>
          }
        />
      )}
    </div>
  );
}

/* ── editable DB template card ──────────────────────────────────── */
function EditableTemplate({ template, onSave, onDelete }) {
  const [name, setName] = useState(template.name);
  const [steps, setSteps] = useState(() => template.steps.map((s) => ({ ...s, bring: Array.isArray(s.bring) ? s.bring : [] })));
  const [dirty, setDirty] = useState(false);

  const touch = () => setDirty(true);
  const setStep = (i, patch) => { setSteps((p) => p.map((s, j) => (j === i ? { ...s, ...patch } : s))); touch(); };
  const addStep = () => { setSteps((p) => [...p, emptyStep()]); touch(); };
  const removeStep = (i) => { setSteps((p) => p.filter((_, j) => j !== i)); touch(); };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    setSteps((p) => { const n = [...p]; [n[i], n[j]] = [n[j], n[i]]; return n; });
    touch();
  };

  const save = () => {
    const cleaned = steps
      .filter((s) => (s.title || '').trim())
      .map((s) => ({
        key: s.key || '',
        title: s.title.trim(),
        description: (s.description || '').trim(),
        offsetDays: Number.isFinite(+s.offsetDays) ? +s.offsetDays : 0,
        bring: Array.isArray(s.bring) ? s.bring : [],
      }));
    onSave({ name: name.trim() || 'Vorlage', steps: cleaned });
    setDirty(false);
  };

  return (
    <Card variant="default">
      <CardBody>
        <SectionHeader
          title={
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); touch(); }}
              className="px-2 py-1 rounded text-[15px] font-semibold"
              style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
            />
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" icon={Save} disabled={!dirty} onClick={save}>Speichern</Button>
              <Button variant="ghost" size="sm" icon={Trash2} onClick={onDelete} aria-label="Vorlage löschen" />
            </div>
          }
        />

        {steps.length === 0 ? (
          <div className="mt-3 text-[12.5px]" style={{ color: 'var(--ds-t3)' }}>Noch keine Schritte — füge welche hinzu.</div>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg px-2 py-2" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
                <div className="flex flex-col pt-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-25" aria-label="Nach oben">
                    <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--ds-t3)' }} />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="disabled:opacity-25" aria-label="Nach unten">
                    <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--ds-t3)' }} />
                  </button>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Input value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} placeholder="Titel (z. B. Bankkonto eröffnen)" />
                  <div className="grid grid-cols-[1fr,110px] gap-1.5">
                    <Input value={s.description || ''} onChange={(e) => setStep(i, { description: e.target.value })} placeholder="Notiz (optional)" />
                    <Input
                      type="number"
                      value={s.offsetDays ?? 0}
                      onChange={(e) => setStep(i, { offsetDays: e.target.value })}
                      placeholder="Tag"
                      title="Tage ab Ankunft"
                    />
                  </div>
                  <Input
                    value={(s.bring || []).join(', ')}
                    onChange={(e) => setStep(i, { bring: parseBring(e.target.value) })}
                    placeholder="Mitbringen (kommagetrennt, optional)"
                  />
                </div>
                <button onClick={() => removeStep(i)} aria-label="Schritt löschen" className="shrink-0 p-1.5 rounded hover:bg-red-500/10">
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <Button variant="outline" size="sm" icon={ListPlus} onClick={addStep}>Schritt hinzufügen</Button>
        </div>
      </CardBody>
    </Card>
  );
}
