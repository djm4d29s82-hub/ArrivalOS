import { Plane, MapPin, Home, Smartphone, FileText, Landmark, ShieldCheck, CheckCircle2 } from 'lucide-react';

/**
 * Single source of truth for the talent onboarding journey.
 * Replaces the previously duplicated STEP_META (TalentDashboard) and
 * STEP_CONFIGS (TalentJourney). DB JourneyStep records override title/description;
 * `short`/`emotional` come from here, mapped by index.
 */
export const JOURNEY_STEPS = [
  { key: 'flug',    icon: Plane,        title: 'Flug & Visa',         short: 'Reisedokumente bestätigt',  emotional: 'Deine Reise hat begonnen.',                detail: 'Flug gebucht, Visum erteilt — der erste Schritt ist getan.' },
  { key: 'ankunft', icon: MapPin,       title: 'Ankunft',             short: 'Dein Greeter holt dich ab', emotional: 'Ein Mensch wartet mit deinem Namen.',      detail: 'Du musst nichts alleine tragen. Am Ausgang wartet jemand.' },
  { key: 'wohnung', icon: Home,         title: 'Unterkunft',          short: 'Erste Tage im Apartment',   emotional: 'Dein erstes Zuhause in Deutschland.',      detail: 'Ein Ort, der dir gehört. Schlüssel in der Hand.' },
  { key: 'sim',     icon: Smartphone,   title: 'SIM-Karte',           short: 'Deutsches Telefonnetz',     emotional: 'Verbunden — ab jetzt bist du erreichbar.', detail: 'Eine neue Nummer. Deine Familie kann dich erreichen.' },
  { key: 'anmeld',  icon: FileText,     title: 'Anmeldung',           short: 'Wohnsitz registrieren',     emotional: 'Offiziell angekommen.',                    detail: 'Die Anmeldebescheinigung — das wichtigste Dokument.' },
  { key: 'bank',    icon: Landmark,     title: 'Bankkonto',           short: 'Erste Überweisungen',       emotional: 'Dein erstes Konto. Gehalt kann fließen.',  detail: 'Ohne Konto kein Gehalt. Mit Konto: Freiheit.' },
  { key: 'kv',      icon: ShieldCheck,  title: 'Krankenversicherung', short: 'Schutz für deine Familie',  emotional: 'Beschützt — für dich und deine Familie.',  detail: 'Die Versicherungskarte kommt in den nächsten Tagen.' },
  { key: 'done',    icon: CheckCircle2, title: 'Onboarded',           short: 'Willkommen in Deutschland', emotional: 'Du bist angekommen.',                      detail: 'Was als große Reise begann, ist jetzt dein Alltag.' },
];

export const JOURNEY_TOTAL = JOURNEY_STEPS.length;

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
