// Services-Marketplace-Katalog (v1).
// Statische Kategorien — gespiegelt aus der Landing (ArrivalJourneySection), damit Marketing
// und Produkt dieselbe Sprache sprechen. Jede Kategorie ist eine Service-ART, KEINE behauptete
// Marken-Partnerschaft ("Partnernetzwerk im Aufbau"). Icons werden im Component per Name aufgelöst.

export const SERVICE_CATALOG = [
  { key: 'visa',         label: 'Visa & Immigration',   label_en: 'Visa & Immigration',   iconName: 'FileCheck',   blurb: 'Blue-Card, Anwälte, Behörden-Vorbereitung.', blurb_en: 'Blue Card, lawyers, authority prep.',     phase: 'Vor der Einreise' },
  { key: 'versicherung', label: 'Versicherung',          label_en: 'Insurance',            iconName: 'ShieldPlus',  blurb: 'Incoming- & Expat-Versicherung ab Tag 1.',  blurb_en: 'Incoming & expat insurance from day 1.',  phase: 'Vor der Einreise' },
  { key: 'wohnung',      label: 'Wohnung',               label_en: 'Housing',              iconName: 'Building2',    blurb: 'Serviced Apartments, Corporate Housing.',   blurb_en: 'Serviced apartments, corporate housing.', phase: 'Erste 30 Tage' },
  { key: 'bank',         label: 'Bankkonto',             label_en: 'Bank account',         iconName: 'Landmark',     blurb: 'Kontoeröffnung mit Status bis zur IBAN.',   blurb_en: 'Account opening, tracked to your IBAN.',  phase: 'Erste 30 Tage' },
  { key: 'sim',          label: 'Mobilfunk',             label_en: 'Mobile plan',          iconName: 'Smartphone',   blurb: 'SIM, Daten, Erreichbarkeit am ersten Tag.', blurb_en: 'SIM, data, reachable from day one.',      phase: 'Erste 30 Tage' },
  { key: 'kv',           label: 'Krankenversicherung',   label_en: 'Health insurance',     iconName: 'Stethoscope',  blurb: 'Anmeldung bei gesetzlichen Kassen.',        blurb_en: 'Registration with public health funds.',  phase: 'Erste 30 Tage' },
  { key: 'sprache',      label: 'Sprache',               label_en: 'Language',             iconName: 'Languages',    blurb: 'Deutschkurse mit Lernfortschritt.',          blurb_en: 'German courses with tracked progress.',   phase: 'Integration' },
  { key: 'steuer',       label: 'Steuer & Payroll',      label_en: 'Tax & payroll',        iconName: 'Calculator',   blurb: 'Expat-Steuerberatung & Payroll.',            blurb_en: 'Expat tax advice & payroll.',             phase: 'Integration' },
];

export const SERVICE_BY_KEY = Object.fromEntries(SERVICE_CATALOG.map((s) => [s.key, s]));

// Status-Lebenszyklus eines Service-Records pro Ankunft.
export const SERVICE_STATUS = {
  requested:   { label: 'Angefragt',       label_en: 'Requested',     tone: 'neutral' },
  in_progress: { label: 'In Bearbeitung',  label_en: 'In progress',   tone: 'gold' },
  active:      { label: 'Aktiv',           label_en: 'Active',        tone: 'blue' },
  done:        { label: 'Abgeschlossen',   label_en: 'Done',          tone: 'green' },
  skipped:     { label: 'Nicht benötigt',  label_en: 'Not needed',    tone: 'neutral' },
};

export const SERVICE_STATUS_ORDER = ['requested', 'in_progress', 'active', 'done', 'skipped'];

// Heuristik: welche Service-Kategorien ein Journey-Step nahelegt.
// "✓ Flug angekommen → Wohnung & SIM benötigt" usw. Reine Vorschläge — der Admin entscheidet.
export const SERVICE_KEYS_FOR_STEP = {
  flug:    ['wohnung', 'sim'],
  ankunft: ['wohnung', 'sim'],
  wohnung: ['wohnung'],
  sim:     ['sim'],
  anmeld:  ['bank', 'kv'],
  bank:    ['bank'],
  kv:      ['kv'],
};

/** Vorschlags-Service-Keys aus den Journey-Steps einer Mission, ohne bereits aktivierte. */
export function suggestServiceKeys(steps = [], usedKeys = new Set()) {
  const out = [];
  for (const s of steps) {
    for (const k of (SERVICE_KEYS_FOR_STEP[s.key] || [])) {
      if (!usedKeys.has(k) && !out.includes(k)) out.push(k);
    }
  }
  return out;
}

/** DE default, EN by lang. Mirrors localizeStep(). */
export function localizeService(cat, lang = 'de') {
  if (!cat) return { label: '', blurb: '' };
  return {
    label: lang === 'en' ? (cat.label_en || cat.label) : cat.label,
    blurb: lang === 'en' ? (cat.blurb_en || cat.blurb) : cat.blurb,
  };
}

export function serviceStatusLabel(status, lang = 'de') {
  const s = SERVICE_STATUS[status];
  if (!s) return status;
  return lang === 'en' ? (s.label_en || s.label) : s.label;
}
