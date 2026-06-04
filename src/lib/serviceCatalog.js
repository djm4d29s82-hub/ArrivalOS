// Services-Marketplace-Katalog (v1).
// Statische Kategorien — gespiegelt aus der Landing (ArrivalJourneySection), damit Marketing
// und Produkt dieselbe Sprache sprechen. Jede Kategorie ist eine Service-ART, KEINE behauptete
// Marken-Partnerschaft ("Partnernetzwerk im Aufbau"). Icons werden im Component per Name aufgelöst.

export const SERVICE_CATALOG = [
  { key: 'visa',         label: 'Visa & Immigration',   iconName: 'FileCheck',   blurb: 'Blue-Card, Anwälte, Behörden-Vorbereitung.', phase: 'Vor der Einreise' },
  { key: 'versicherung', label: 'Versicherung',          iconName: 'ShieldPlus',  blurb: 'Incoming- & Expat-Versicherung ab Tag 1.',  phase: 'Vor der Einreise' },
  { key: 'wohnung',      label: 'Wohnung',               iconName: 'Building2',    blurb: 'Serviced Apartments, Corporate Housing.',   phase: 'Erste 30 Tage' },
  { key: 'bank',         label: 'Bankkonto',             iconName: 'Landmark',     blurb: 'Kontoeröffnung mit Status bis zur IBAN.',   phase: 'Erste 30 Tage' },
  { key: 'sim',          label: 'Mobilfunk',             iconName: 'Smartphone',   blurb: 'SIM, Daten, Erreichbarkeit am ersten Tag.', phase: 'Erste 30 Tage' },
  { key: 'kv',           label: 'Krankenversicherung',   iconName: 'Stethoscope',  blurb: 'Anmeldung bei gesetzlichen Kassen.',        phase: 'Erste 30 Tage' },
  { key: 'sprache',      label: 'Sprache',               iconName: 'Languages',    blurb: 'Deutschkurse mit Lernfortschritt.',          phase: 'Integration' },
  { key: 'steuer',       label: 'Steuer & Payroll',      iconName: 'Calculator',   blurb: 'Expat-Steuerberatung & Payroll.',            phase: 'Integration' },
];

export const SERVICE_BY_KEY = Object.fromEntries(SERVICE_CATALOG.map((s) => [s.key, s]));

// Status-Lebenszyklus eines Service-Records pro Ankunft.
export const SERVICE_STATUS = {
  requested:   { label: 'Angefragt',       tone: 'gray' },
  in_progress: { label: 'In Bearbeitung',  tone: 'gold' },
  active:      { label: 'Aktiv',           tone: 'blue' },
  done:        { label: 'Abgeschlossen',   tone: 'green' },
  skipped:     { label: 'Nicht benötigt',  tone: 'gray' },
};

export const SERVICE_STATUS_ORDER = ['requested', 'in_progress', 'active', 'done', 'skipped'];
