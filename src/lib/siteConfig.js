// Zentrale Konfiguration — alles über Environment-Variablen austauschbar.
// Vor Live-Deployment: .env.production mit echten Werten füllen.

const env = import.meta.env;

export const COMPANY = {
  // NOTE: legalName / street / zip / hrb / vatId / registerCourt are still PLACEHOLDERS.
  // Set the real values via VITE_COMPANY_* env vars before launch for a compliant Impressum —
  // they were intentionally NOT invented (no real legal entity/address provided yet).
  legalName: env.VITE_COMPANY_LEGAL_NAME || 'ArrivalOS',
  brand: env.VITE_COMPANY_BRAND || 'ArrivalOS',
  street: env.VITE_COMPANY_STREET || 'Potsdamer Straße 63',
  zip: env.VITE_COMPANY_ZIP || '10785',
  city: env.VITE_COMPANY_CITY || 'Berlin',
  country: env.VITE_COMPANY_COUNTRY || 'Deutschland',
  phone: env.VITE_COMPANY_PHONE || '+49 151 24413723',
  email: env.VITE_COMPANY_EMAIL || 'support@arrivalgermany.com',
  pressEmail: env.VITE_COMPANY_PRESS_EMAIL || 'support@arrivalgermany.com',
  dpoEmail: env.VITE_COMPANY_DPO_EMAIL || 'support@arrivalgermany.com',
  careersEmail: env.VITE_COMPANY_CAREERS_EMAIL || 'support@arrivalgermany.com',
  ceo: env.VITE_COMPANY_CEO || 'Mustafa Ibrahim, Anton Rauschenbach',
  hrb: env.VITE_COMPANY_HRB || 'HRB 287345',
  registerCourt: env.VITE_COMPANY_REGISTER_COURT || 'Amtsgericht München',
  vatId: env.VITE_COMPANY_VAT_ID || 'DE 367 482 916',
  hostingCity: env.VITE_HOSTING_CITY || 'Frankfurt am Main',
};

export const URLS = {
  site: env.VITE_SITE_URL || 'https://arrivalgermany.com',
};

export const FEATURES = {
  leadWebhook: env.VITE_LEAD_WEBHOOK_URL || '', // Resend/Zapier/Make-Webhook für Kontaktformular
  plausibleDomain: env.VITE_PLAUSIBLE_DOMAIN || '', // z.B. arrivalos.neuland.de
  supabaseEnabled: !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY),
};
