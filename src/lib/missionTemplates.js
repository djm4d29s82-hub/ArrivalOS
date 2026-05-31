import { JOURNEY_STEPS } from '@/lib/journeySteps';
import { base44 } from '@/api/base44Client';

/**
 * Reusable step templates the Admin can apply to a mission in the MissionStepPlanner.
 * `offsetDays` is relative to the mission datetime (arrival day = 0) and is converted
 * to an absolute `scheduled_at` when the template is applied. Each step carries a
 * `key` so its icon resolves via resolveStepMeta(), even for non-default titles.
 *
 * Two sources are merged in the planner's "Vorlage…" picker:
 *   • the code-side built-ins below (`builtin: true`, read-only) — always available;
 *   • admin-managed DB rows (`mission_templates` table, `builtin: false`) via loadAllTemplates().
 */

// Sensible default offsets (days from arrival) for the talent journey keys.
const STANDARD_OFFSETS = { flug: 0, ankunft: 0, wohnung: 1, sim: 2, anmeld: 5, bank: 14, kv: 14, done: 30 };

export const MISSION_TEMPLATES = [
  {
    id: 'klinik-pflege',
    name: 'Klinik-Onboarding (Pflege)',
    builtin: true,
    steps: [
      { key: 'ankunft', title: 'Flughafenabholung',            offsetDays: 0 },
      { key: 'wohnung', title: 'Unterkunft & Check-in',         offsetDays: 0 },
      { key: 'anmeld',  title: 'Wohnungsgeberbescheinigung',    offsetDays: 1 },
      { key: 'wohnung', title: 'Ersteinkauf',                   offsetDays: 1 },
      { key: 'sim',     title: 'SIM-Karte',                     offsetDays: 2 },
      { key: 'anmeld',  title: 'Anmeldung Einwohnermeldeamt',   offsetDays: 5 },
      { key: 'bank',    title: 'Bankkonto',                     offsetDays: 14 },
      { key: 'kv',      title: 'Krankenversicherung',           offsetDays: 14 },
      { key: 'done',    title: 'Abschluss & Feedback',          offsetDays: 30 },
    ],
  },
  {
    id: 'standard-relocation',
    name: 'Standard Relocation',
    builtin: true,
    steps: JOURNEY_STEPS.map((s, i) => ({
      key: s.key,
      title: s.title,
      description: s.short,
      offsetDays: STANDARD_OFFSETS[s.key] ?? i,
    })),
  },
];

/**
 * Admin-managed templates from the DB. Best-effort: a missing table or RLS rejection
 * returns [] so the planner's built-ins always keep working (the migration is optional
 * for display — only DB templates need it).
 */
export async function loadDbTemplates() {
  try {
    const rows = await base44.entities.MissionTemplate.list('-updated_at');
    return (rows || []).map((r) => ({
      id: r.id,
      name: r.name,
      steps: Array.isArray(r.steps) ? r.steps : [],
      builtin: false,
    }));
  } catch {
    return [];
  }
}

/** Built-ins (read-only) first, then admin-managed DB templates. */
export async function loadAllTemplates() {
  const db = await loadDbTemplates();
  return [...MISSION_TEMPLATES, ...db];
}
