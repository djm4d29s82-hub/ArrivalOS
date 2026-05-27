// Zentrale Konfiguration — alles über Environment-Variablen austauschbar.
// Vor Live-Deployment: .env.production mit echten Werten füllen.

const env = import.meta.env;

export const COMPANY = {
  legalName: env.VITE_COMPANY_LEGAL_NAME || 'NeuLand Welcome Services GmbH',
  brand: env.VITE_COMPANY_BRAND || 'ArrivalOS by NeuLand',
  street: env.VITE_COMPANY_STREET || 'Marienplatz 1',
  zip: env.VITE_COMPANY_ZIP || '80331',
  city: env.VITE_COMPANY_CITY || 'München',
  country: env.VITE_COMPANY_COUNTRY || 'Deutschland',
  phone: env.VITE_COMPANY_PHONE || '+49 89 12345 6789',
  email: env.VITE_COMPANY_EMAIL || 'hello@neuland.de',
  pressEmail: env.VITE_COMPANY_PRESS_EMAIL || 'press@neuland.de',
  dpoEmail: env.VITE_COMPANY_DPO_EMAIL || 'dpo@neuland.de',
  careersEmail: env.VITE_COMPANY_CAREERS_EMAIL || 'careers@neuland.de',
  ceo: env.VITE_COMPANY_CEO || 'Dr. Lena Bachmann, Tobias Reuter',
  hrb: env.VITE_COMPANY_HRB || 'HRB 287345',
  registerCourt: env.VITE_COMPANY_REGISTER_COURT || 'Amtsgericht München',
  vatId: env.VITE_COMPANY_VAT_ID || 'DE 367 482 916',
  hostingCity: env.VITE_HOSTING_CITY || 'Frankfurt am Main',
};

export const URLS = {
  site: env.VITE_SITE_URL || 'https://arrivalos.neuland.de',
};

export const FEATURES = {
  leadWebhook: env.VITE_LEAD_WEBHOOK_URL || '', // Resend/Zapier/Make-Webhook für Kontaktformular
  plausibleDomain: env.VITE_PLAUSIBLE_DOMAIN || '', // z.B. arrivalos.neuland.de
  supabaseEnabled: !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY),
};
