import { Plane, MapPin, Home, Smartphone, FileText, Landmark, ShieldCheck, CheckCircle2, Circle } from 'lucide-react';

/**
 * Single source of truth for the talent onboarding journey.
 * Replaces the previously duplicated STEP_META (TalentDashboard) and
 * STEP_CONFIGS (TalentJourney). DB JourneyStep records override title/description;
 * `short`/`emotional` come from here, mapped by index.
 */
export const JOURNEY_STEPS = [
  { key: 'flug',    icon: Plane,        title: 'Flug & Visa',         short: 'Reisedokumente bestätigt',  emotional: 'Deine Reise hat begonnen.',                detail: 'Flug gebucht, Visum erteilt — der erste Schritt ist getan.', bring: ['Reisepass', 'Visum / Aufenthaltstitel', 'Flugticket'],
    title_en: 'Flight & Visa',         short_en: 'Travel documents confirmed', emotional_en: 'Your journey has begun.',                bring_en: ['Passport', 'Visa / residence permit', 'Flight ticket'] },
  { key: 'ankunft', icon: MapPin,       title: 'Ankunft',             short: 'Dein Greeter holt dich ab', emotional: 'Ein Mensch wartet mit deinem Namen.',      detail: 'Du musst nichts alleine tragen. Am Ausgang wartet jemand.', bring: ['Reisepass', 'Handy mit Greeter-Kontakt'],
    title_en: 'Arrival',               short_en: 'Your greeter picks you up',  emotional_en: 'A person is waiting with your name.',    bring_en: ['Passport', 'Phone with greeter contact'] },
  { key: 'wohnung', icon: Home,         title: 'Unterkunft',          short: 'Erste Tage im Apartment',   emotional: 'Dein erstes Zuhause in Deutschland.',      detail: 'Ein Ort, der dir gehört. Schlüssel in der Hand.', bring: ['Reisepass', 'Mietvertrag (falls vorhanden)'],
    title_en: 'Housing',               short_en: 'First days in your apartment', emotional_en: 'Your first home in Germany.',          bring_en: ['Passport', 'Rental contract (if available)'] },
  { key: 'sim',     icon: Smartphone,   title: 'SIM-Karte',           short: 'Deutsches Telefonnetz',     emotional: 'Verbunden — ab jetzt bist du erreichbar.', detail: 'Eine neue Nummer. Deine Familie kann dich erreichen.', bring: ['Reisepass'],
    title_en: 'SIM card',              short_en: 'German mobile network',      emotional_en: 'Connected — you’re reachable now.',      bring_en: ['Passport'] },
  { key: 'anmeld',  icon: FileText,     title: 'Anmeldung',           short: 'Wohnsitz registrieren',     emotional: 'Offiziell angekommen.',                    detail: 'Die Anmeldebescheinigung — das wichtigste Dokument.', bring: ['Reisepass', 'Mietvertrag', 'Wohnungsgeberbestätigung', 'Visum / Aufenthaltstitel'],
    title_en: 'Registration',          short_en: 'Register your residence',    emotional_en: 'Officially arrived.',                    bring_en: ['Passport', 'Rental contract', 'Landlord confirmation (Wohnungsgeberbestätigung)', 'Visa / residence permit'] },
  { key: 'bank',    icon: Landmark,     title: 'Bankkonto',           short: 'Erste Überweisungen',       emotional: 'Dein erstes Konto. Gehalt kann fließen.',  detail: 'Ohne Konto kein Gehalt. Mit Konto: Freiheit.', bring: ['Reisepass', 'Anmeldebescheinigung', 'Steuer-ID (falls vorhanden)'],
    title_en: 'Bank account',          short_en: 'First transfers',            emotional_en: 'Your first account. Salary can flow.',   bring_en: ['Passport', 'Registration certificate (Anmeldebescheinigung)', 'Tax ID (if available)'] },
  { key: 'kv',      icon: ShieldCheck,  title: 'Krankenversicherung', short: 'Schutz für deine Familie',  emotional: 'Beschützt — für dich und deine Familie.',  detail: 'Die Versicherungskarte kommt in den nächsten Tagen.', bring: ['Reisepass', 'Anmeldebescheinigung', 'Arbeitsvertrag'],
    title_en: 'Health insurance',      short_en: 'Protection for your family', emotional_en: 'Protected — for you and your family.',   bring_en: ['Passport', 'Registration certificate', 'Employment contract'] },
  { key: 'done',    icon: CheckCircle2, title: 'Onboarded',           short: 'Willkommen in Deutschland', emotional: 'Du bist angekommen.',                      detail: 'Was als große Reise begann, ist jetzt dein Alltag.', bring: [],
    title_en: 'Onboarded',             short_en: 'Welcome to Germany',         emotional_en: 'You’ve arrived.',                        bring_en: [] },
];

export const JOURNEY_TOTAL = JOURNEY_STEPS.length;

/**
 * Default journey steps created automatically when a greeter is assigned.
 * SINGLE SOURCE OF TRUTH — replaces the two duplicated DEFAULT_JOURNEY_STEPS that
 * previously lived in missionEngine.js and missionWriteApi.ts (BUG 4 + BUG 6).
 * DB shape only: the React `icon` is intentionally dropped (not persistable).
 * `order` uses gaps of 10 so steps can be reordered/inserted without renumbering.
 */
export const DEFAULT_JOURNEY_STEPS = JOURNEY_STEPS.map((s, i) => ({
  title: s.title,
  description: s.short,
  order: (i + 1) * 10,
}));

/**
 * Resolves display metadata (currently just an icon) for a journey step that may
 * come from the DB (only has title/description) or from a config object (has key).
 * Matches by `key` first, then by title (exact or contained), else a neutral default.
 * Lets custom admin-planned steps render a sensible icon instead of an index-based one.
 */
export function resolveStepMeta(step) {
  const key = step?.key;
  const title = (step?.title || '').toLowerCase().trim();
  let match = null;
  if (key) match = JOURNEY_STEPS.find((s) => s.key === key);
  if (!match && title) {
    match = JOURNEY_STEPS.find((s) => {
      const t = s.title.toLowerCase();
      return title === t || title.includes(t) || t.includes(title);
    });
  }
  // Spread the matched config (key/title/short/emotional/detail) so callers can map
  // emotional copy by identity too; icon always falls back to a neutral default.
  return { ...(match || {}), icon: match?.icon || Circle };
}

/**
 * "Was mitbringen" items for a step: the admin-set DB list (bring_items) wins as-is (custom text isn't
 * translatable); otherwise the sensible default for the matched step type, in the requested language.
 */
export function stepBringItems(step, lang = 'de') {
  if (Array.isArray(step?.bring_items) && step.bring_items.length) return step.bring_items;
  const meta = resolveStepMeta(step);
  if (lang === 'en' && Array.isArray(meta.bring_en)) return meta.bring_en;
  return Array.isArray(meta.bring) ? meta.bring : [];
}

/**
 * Localized title/description/emotional for a step. DE keeps the DB text exactly (admin wording wins).
 * EN: recognized steps (matched by key/title) use the canonical English copy; truly custom steps fall
 * back to their German DB text (can't be auto-translated).
 */
export function localizeStep(step, lang = 'de') {
  const meta = resolveStepMeta(step);
  const matched = !!meta.key;
  const en = lang === 'en';
  return {
    title: en && matched ? (meta.title_en || meta.title) : (step?.title || meta.title || ''),
    description: en && matched ? (meta.short_en || meta.short) : (step?.description || meta.short || ''),
    emotional: en ? (meta.emotional_en || meta.emotional || '') : (meta.emotional || ''),
  };
}

/**
 * Derives a single, consistent progress view from a steps array.
 * currentIndex = the in-progress step, or the first non-completed, or completed count.
 */
export function journeyProgress(steps) {
  const list = steps?.length ? steps : [];
  const total = list.length || JOURNEY_TOTAL;
  const completed = list.filter((s) => s.status === 'completed').length;
  let currentIndex = list.findIndex((s) => s.status === 'in_progress');
  if (currentIndex < 0) currentIndex = list.findIndex((s) => s.status !== 'completed');
  if (currentIndex < 0) currentIndex = Math.max(0, completed - 1);
  return { total, completed, currentIndex };
}
