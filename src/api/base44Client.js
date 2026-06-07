// Mock base44 client — in-memory persistent store backed by localStorage.
// Provides entity CRUD that matches the API used by missionEngine and pages.
//
// Wenn VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in der .env gesetzt sind,
// wird stattdessen der Supabase-Adapter verwendet (siehe ./supabaseAdapter.js).

import { uid } from '@/lib/utils';
import { createSupabaseClient } from './supabaseAdapter';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jtaegmuftgxzjddfevbs.supabase.co';

// Sicherheits-Guard: Ein SECRET-Key darf NIEMALS im Browser laufen. Falls der Host (z.B. eine
// falsch gesetzte Vercel-Env-Var) einen `sb_secret_`-Key injiziert, ignorieren wir ihn und nutzen
// den ÖFFENTLICHEN Publishable-Key (der ist client-safe und gehört ohnehin ins Bundle).
const PUBLISHABLE_KEY = 'sb_publishable_QjJrJ9QPGqicol0QY1HrIw_kC2cs3lw';
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_KEY = ENV_KEY && !ENV_KEY.startsWith('sb_secret_') ? ENV_KEY : PUBLISHABLE_KEY;
const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_KEY);

const LS_KEY = 'neuland-base44-db-v1';

const ENTITY_NAMES = [
  'User',
  'Company',
  'GreeterProfile',
  'Candidate',
  'Mission',
  'JourneyStep',
  'Message',
  'Notification',
  'ActivityLog',
  'Invoice',
  'Settings',
  'Lead',
  'Document',
  'SOP',
  'Invite',
  'MissionTemplate',
  'MissionService',
  'Review',
  'Payout',
  'Partner',
  'ServiceConsent',
  'PushSubscription',
  'MissionExpense',
];

function emptyDB() {
  const db = {};
  ENTITY_NAMES.forEach((e) => (db[e] = []));
  return db;
}

function loadDB() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return seedDB(emptyDB());
    const parsed = JSON.parse(raw);
    ENTITY_NAMES.forEach((e) => {
      if (!parsed[e]) parsed[e] = [];
    });
    return parsed;
  } catch {
    return seedDB(emptyDB());
  }
}

function saveDB(db) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch {}
}

function seedDB(db) {
  // Companies
  db.Company = [
    { id: 'co1', name: 'Helios Klinikum Wuppertal', email: 'recruiting@helios-wuppertal.de', industry: 'Healthcare', city: 'Wuppertal', created_at: new Date().toISOString() },
    { id: 'co2', name: 'Bavaria Automotive', email: 'people@bavaria-automotive.de', industry: 'Automotive', city: 'Ingolstadt', created_at: new Date().toISOString() },
    { id: 'co3', name: 'Northwind Studios', email: 'hello@northwind.de', industry: 'Creative', city: 'Hamburg', created_at: new Date().toISOString() },
  ];

  // Users
  db.User = [
    { id: 'u-admin', email: 'admin@neuland.de', role: 'admin', full_name: 'Admin User' },
    { id: 'u-co1', email: 'hr@lumen.de', role: 'company', full_name: 'Sandra Weber', company_id: 'co1' },
    { id: 'u-g1', email: 'sophie@neuland.de', role: 'greeter', full_name: 'Miriam Schulz' },
    { id: 'u-g2', email: 'lena@neuland.de', role: 'greeter', full_name: 'Lena Hoffmann' },
    { id: 'u-g3', email: 'marco@neuland.de', role: 'greeter', full_name: 'Marco Klein' },
    { id: 'u-t1', email: 'amara@talent.neuland.de', role: 'talent', full_name: 'Priya Nair', candidate_id: 'ca1' },
  ];

  // Greeter Profiles
  db.GreeterProfile = [
    { id: 'g1', user_id: 'u-g1', email: 'sophie@neuland.de', full_name: 'Miriam Schulz', phone: '+49 151 11110001', city: 'Düsseldorf', languages: ['Deutsch', 'Englisch'], availability: 'flexible', status: 'available', rating: 4.9, completed_missions: 27 },
    { id: 'g2', user_id: 'u-g2', email: 'lena@neuland.de', full_name: 'Lena Hoffmann', phone: '+49 151 11110002', city: 'Berlin', languages: ['Deutsch', 'Englisch'], availability: 'weekends', status: 'available', rating: 4.7, completed_missions: 14 },
    { id: 'g3', user_id: 'u-g3', email: 'marco@neuland.de', full_name: 'Marco Klein', phone: '+49 151 11110003', city: 'Köln', languages: ['Deutsch', 'Englisch', 'Italienisch'], availability: 'evenings', status: 'available', rating: 4.8, completed_missions: 31 },
    { id: 'g4', user_id: 'u-g4', email: 'amira@neuland.de', full_name: 'Amira Hassan', phone: '+49 151 11110004', city: 'Hamburg', languages: ['Deutsch', 'Englisch', 'Französisch'], availability: 'flexible', status: 'available', rating: 4.6, completed_missions: 9 },
  ];

  // Candidates — enriched with the fields the greeter/talent screens already read
  // (phone, languages, country_of_origin, flight_no, arrival_time) so arrival info is real.
  db.Candidate = [
    { id: 'ca1', full_name: 'Priya Nair', origin: 'Indien', country_of_origin: 'Indien', role: 'Pflegefachkraft', city: 'Düsseldorf', company_id: 'co1', arrival_date: '2026-06-02', arrival_time: '2026-06-02T14:30', flight_no: 'AI 121', languages: ['Englisch'], phone: '+49 151 23456789', notes: 'Erstes Mal in Deutschland — laut Recruiter sehr aufgeregt.', status: 'in_progress', progress: 55 },
    { id: 'ca2', full_name: 'Tariq Mahmood', origin: 'Pakistan', country_of_origin: 'Pakistan', role: 'Elektriker', city: 'Ingolstadt', company_id: 'co2', arrival_date: '2026-05-28', arrival_time: '2026-05-28T09:00', flight_no: 'PK 713', languages: ['Urdu', 'Englisch'], phone: '+49 160 5551234', notes: 'Spricht wenig Englisch — Dolmetscher-App vorbereiten. 2 Koffer.', status: 'in_progress', progress: 70 },
    { id: 'ca3', full_name: 'Linh Tran', origin: 'Vietnam', country_of_origin: 'Vietnam', role: 'Art Director', city: 'Hamburg', company_id: 'co3', arrival_date: '2026-06-10', arrival_time: '2026-06-10T16:00', flight_no: 'EK 061', languages: ['Englisch', 'Französisch'], phone: '+49 152 9876543', status: 'preparation', progress: 15 },
    { id: 'ca4', full_name: 'Joana Pereira', origin: 'Portugal', country_of_origin: 'Portugal', role: 'Product Designer', city: 'Köln', company_id: 'co1', arrival_date: '2026-05-25', arrival_time: '2026-05-25T10:00', flight_no: 'TP 538', languages: ['Englisch', 'Portugiesisch'], phone: '+49 157 4445566', status: 'completed', progress: 100 },
    { id: 'ca5', full_name: 'Amara Diallo', origin: 'Senegal', country_of_origin: 'Senegal', role: 'Pflegefachkraft', city: 'München', company_id: 'co1', arrival_date: '2026-11-18', arrival_time: null, flight_no: null, languages: ['Englisch', 'Französisch'], phone: '+49 159 1122334', notes: 'Familie folgt nach Aufenthaltserlaubnis.', status: 'preparation', progress: 5 },
  ];

  // Missions
  db.Mission = [
    { id: 'm1', title: 'Flughafenabholung & Transfer', description: 'Priya Nair am Gate abholen', company_id: 'co1', candidate_id: 'ca1', greeter_id: 'g1', status: 'in_progress', city: 'Düsseldorf', location: 'DUS Airport, Terminal C, Gate C14', datetime: '2026-06-02T14:30', requirements: { languages: ['Englisch'] }, pay: 95, matched_greeters: ['g1'], created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'm2', title: 'Bürgeramt-Begleitung', description: 'Anmeldung Ingolstadt — Tariq Mahmood', company_id: 'co2', candidate_id: 'ca2', greeter_id: 'g2', status: 'assigned', city: 'Ingolstadt', location: 'Bürgeramt Ingolstadt', datetime: '2026-05-28T09:00', requirements: { languages: ['Englisch'] }, pay: 70, matched_greeters: ['g2'], created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'm3', title: 'Wohnungsübergabe & SIM-Setup', description: 'Linh Tran in Hamburg Altona', company_id: 'co3', candidate_id: 'ca3', greeter_id: null, status: 'open', city: 'Hamburg', location: 'Hamburg Altona', datetime: '2026-06-10T16:00', requirements: { languages: ['Englisch', 'Französisch'] }, pay: 85, matched_greeters: [], created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'm4', title: 'Welcome Day & Stadt-Orientierung', description: 'Joana Pereira in Köln', company_id: 'co1', candidate_id: 'ca4', greeter_id: 'g3', status: 'completed', city: 'Köln', location: 'Köln Innenstadt', datetime: '2026-05-25T10:00', requirements: { languages: ['Englisch'] }, pay: 120, matched_greeters: ['g3'], created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
    // Pre-seeded example missions — ready to test the full workflow
    { id: 'm5', title: 'Flughafenabholung Senior Engineer', description: 'Ankunft am MUC Terminal 2, Begleitung zur Unterkunft in Schwabing', company_id: 'co1', candidate_id: null, greeter_id: null, status: 'matched', city: 'München', location: 'MUC Airport, Terminal 2, Gate B', datetime: '2026-06-15T14:30', requirements: { languages: ['Englisch', 'Spanisch'] }, pay: 95, matched_greeters: ['g1'], created_at: new Date().toISOString() },
    { id: 'm6', title: 'Bürgeramt-Anmeldung', description: 'Anmeldung Wohnsitz, Steuer-ID beantragen', company_id: 'co2', candidate_id: null, greeter_id: null, status: 'matched', city: 'Berlin', location: 'Bürgeramt Mitte, Karl-Marx-Allee 31', datetime: '2026-06-03T09:00', requirements: { languages: ['Englisch'] }, pay: 70, matched_greeters: ['g2'], created_at: new Date().toISOString() },
    { id: 'm7', title: 'Wohnungsübergabe & SIM-Setup', description: 'Schlüsselübergabe, Vodafone-SIM aktivieren, Erstausstattung', company_id: 'co3', candidate_id: null, greeter_id: null, status: 'matched', city: 'Hamburg', location: 'Altona, Behringstraße 28', datetime: '2026-06-12T16:00', requirements: { languages: ['Englisch', 'Französisch'] }, pay: 85, matched_greeters: ['g4'], created_at: new Date().toISOString() },
    { id: 'm8', title: 'Welcome Day & Stadtorientierung', description: 'Stadtführung, Behördencheck, ÖPNV-Einführung', company_id: 'co1', candidate_id: null, greeter_id: null, status: 'matched', city: 'Köln', location: 'Köln Hauptbahnhof', datetime: '2026-06-20T10:00', requirements: { languages: ['Englisch', 'Italienisch'] }, pay: 120, matched_greeters: ['g3'], created_at: new Date().toISOString() },
    { id: 'm9', title: 'Pickup Frankfurt', description: 'Edge case — keine Greeter in dieser Stadt', company_id: 'co2', candidate_id: null, greeter_id: null, status: 'open', city: 'Frankfurt', location: 'FRA Airport, Terminal 1', datetime: '2026-06-25T11:00', requirements: { languages: ['Englisch'] }, pay: 100, matched_greeters: [], created_at: new Date().toISOString() },
    // Phase E — 'created' status missions (Incoming Queue)
    { id: 'm10', title: 'Airport Pickup — Neuzugang Senior Engineer', description: 'Ankunft FRA Terminal 1, Begleitung zur Unterkunft in Sachsenhausen', company_id: 'co2', candidate_id: null, greeter_id: null, status: 'created', city: 'Frankfurt', location: 'FRA Airport, Terminal 1', datetime: new Date(Date.now() + 7200000).toISOString(), requirements: { languages: ['Englisch'] }, pay: 100, matched_greeters: [], created_at: new Date().toISOString() },
    { id: 'm11', title: 'Erstanmeldung & Behördenbegleitung', description: 'Anmeldung Wohnsitz, SIM-Karte, Bankkonto eröffnen', company_id: 'co1', candidate_id: null, greeter_id: null, status: 'created', city: 'München', location: 'Bürgeramt Schwabing, Siebengebirgspl. 1', datetime: new Date(Date.now() + 14400000).toISOString(), requirements: { languages: ['Englisch', 'Spanisch'] }, pay: 75, matched_greeters: [], created_at: new Date().toISOString() },
    // Blocked mission — gives the company view a real "why" behind a red state
    { id: 'm12', title: 'Einreise & Onboarding Pflegekraft', description: 'Amara Diallo — Visum verzögert', company_id: 'co1', candidate_id: 'ca5', greeter_id: null, status: 'created', city: 'München', location: 'MUC Airport, Terminal 2', datetime: '2026-11-18T13:00', requirements: { languages: ['Englisch', 'Französisch'] }, pay: 110, matched_greeters: [], has_issue: true, issue_severity: 'critical', issue_message: 'Visum verzögert — neue Einreise 18. November', created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
  ];

  // Journey Steps for in_progress / completed missions
  const journeyTemplate = [
    'Arrival Check', 'Meet Client', 'Unterkunft & Check-in', 'SIM & Connectivity',
    'Behördengang', 'Bankkonto', 'Mid Check', 'Feedback & Sign-off',
  ];
  db.JourneyStep = [];
  ['m1', 'm2', 'm4'].forEach((mid) => {
    const total = journeyTemplate.length;
    const done = mid === 'm4' ? total : mid === 'm1' ? 3 : 2;
    journeyTemplate.forEach((title, i) => {
      db.JourneyStep.push({
        id: uid(),
        mission_id: mid,
        title,
        description: '',
        order: i + 1,
        status: i < done ? 'completed' : i === done ? 'in_progress' : 'pending',
        completed_at: i < done ? new Date(Date.now() - (total - i) * 3600000).toISOString() : null,
      });
    });
  });

  // Activity Log
  db.ActivityLog = [
    { id: uid(), entity_type: 'Mission', entity_id: 'm1', action: 'mission.created', old_value: '', new_value: 'open', created_by: 'hr@lumen.de', description: 'Mission "Flughafenabholung & Transfer" created', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: uid(), entity_type: 'Mission', entity_id: 'm1', action: 'mission.matched', old_value: 'open', new_value: 'matched', created_by: 'system', description: 'Matched 1 greeter(s)', timestamp: new Date(Date.now() - 86400000 * 3 + 1000).toISOString() },
    { id: uid(), entity_type: 'Mission', entity_id: 'm1', action: 'mission.assigned', old_value: 'matched', new_value: 'assigned', created_by: 'sophie@neuland.de', description: 'Greeter "Miriam Schulz" accepted', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: uid(), entity_type: 'Mission', entity_id: 'm1', action: 'mission.in_progress', old_value: 'assigned', new_value: 'in_progress', created_by: 'sophie@neuland.de', description: 'Mission started', timestamp: new Date(Date.now() - 86400000).toISOString() },
    { id: uid(), entity_type: 'Mission', entity_id: 'm1', action: 'step.completed', old_value: '', new_value: '', created_by: 'sophie@neuland.de', description: 'Miriam: Priya abgeholt, unterwegs zur Wohnung', timestamp: new Date(Date.now() - 23 * 60000).toISOString() },
    { id: uid(), entity_type: 'Mission', entity_id: 'm12', action: 'mission.created', old_value: '', new_value: 'created', created_by: 'hr@lumen.de', description: 'HR: Visum verzögert — Einreise auf 18.11. verschoben', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
  ];

  // Notifications
  db.Notification = [
    { id: uid(), user_email: 'sophie@neuland.de', title: 'Neue Mission!', message: 'Flughafenabholung in Düsseldorf', type: 'action', read: false, link: '/greeter-dashboard/missions', created_at: new Date().toISOString() },
    { id: uid(), user_email: 'hr@lumen.de', title: 'Greeter zugewiesen', message: 'Miriam Schulz übernimmt Priya Nair', type: 'success', read: false, link: '/company', created_at: new Date().toISOString() },
  ];

  // Invoices
  db.Invoice = [
    { id: 'inv1', company_id: 'co1', mission_id: 'm4', amount: 790, currency: 'EUR', status: 'paid', issued_at: new Date(Date.now() - 86400000 * 5).toISOString(), due_at: new Date(Date.now() + 86400000 * 25).toISOString() },
    { id: 'inv2', company_id: 'co2', mission_id: 'm2', amount: 490, currency: 'EUR', status: 'pending', issued_at: new Date().toISOString(), due_at: new Date(Date.now() + 86400000 * 30).toISOString() },
  ];

  // Messages
  db.Message = [
    { id: uid(), sender_id: 'u-co1', sender_name: 'Sandra Weber', receiver_id: 'u-g1', mission_id: 'm1', content: 'Hallo Miriam, danke fürs Übernehmen!', timestamp: new Date(Date.now() - 3600000 * 5).toISOString() },
    { id: uid(), sender_id: 'u-g1', sender_name: 'Miriam Schulz', receiver_id: 'u-co1', mission_id: 'm1', content: 'Gerne — Schild ist bereit, alles im grünen Bereich.', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  ];

  // Settings
  db.Settings = [
    { id: 'public', key: 'public', value: { brand: 'NeuLand', tagline: 'Arrival starts with people.' } },
  ];

  // Documents (per candidate)
  db.Document = [
    { id: 'd1', candidate_id: 'ca1', title: 'Arbeitsvertrag', type: 'contract', status: 'signed', uploaded_at: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: 'd2', candidate_id: 'ca1', title: 'Visa Bestätigung', type: 'visa', status: 'verified', uploaded_at: new Date(Date.now() - 86400000 * 8).toISOString() },
    { id: 'd3', candidate_id: 'ca1', title: 'Meldebescheinigung', type: 'registration', status: 'pending', uploaded_at: null },
    { id: 'd4', candidate_id: 'ca1', title: 'Kontoeröffnung Bestaetigung', type: 'banking', status: 'pending', uploaded_at: null },
    { id: 'd5', candidate_id: 'ca2', title: 'Arbeitsvertrag', type: 'contract', status: 'signed', uploaded_at: new Date(Date.now() - 86400000 * 12).toISOString() },
    { id: 'd6', candidate_id: 'ca2', title: 'Meldebescheinigung', type: 'registration', status: 'verified', uploaded_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  ];

  // Standard Operating Procedures
  db.SOP = [
    { id: 'sop1', code: 'SOP-001', title: 'Flughafenabholung', category: 'arrival', steps: 7, version: '2.3', updated_at: new Date(Date.now() - 86400000 * 14).toISOString() },
    { id: 'sop2', code: 'SOP-002', title: 'Bürgeramt-Anmeldung', category: 'administration', steps: 9, version: '3.1', updated_at: new Date(Date.now() - 86400000 * 21).toISOString() },
    { id: 'sop3', code: 'SOP-003', title: 'Bankkonto-Eröffnung', category: 'banking', steps: 6, version: '1.5', updated_at: new Date(Date.now() - 86400000 * 30).toISOString() },
    { id: 'sop4', code: 'SOP-004', title: 'Wohnungsübergabe', category: 'housing', steps: 8, version: '2.0', updated_at: new Date(Date.now() - 86400000 * 18).toISOString() },
    { id: 'sop5', code: 'SOP-005', title: 'SIM-Karte & Mobilfunk', category: 'connectivity', steps: 4, version: '1.2', updated_at: new Date(Date.now() - 86400000 * 45).toISOString() },
    { id: 'sop6', code: 'SOP-006', title: 'Welcome Day', category: 'onboarding', steps: 10, version: '2.1', updated_at: new Date(Date.now() - 86400000 * 7).toISOString() },
    { id: 'sop7', code: 'SOP-007', title: 'Eskalations-Workflow', category: 'escalation', steps: 5, version: '1.0', updated_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  ];

  saveDB(db);
  return db;
}

function makeEntity(name) {
  return {
    async list(orderBy) {
      const db = loadDB();
      let arr = [...(db[name] || [])];
      if (orderBy) {
        const desc = orderBy.startsWith('-');
        const key = desc ? orderBy.slice(1) : orderBy;
        arr.sort((a, b) => (a[key] > b[key] ? 1 : -1) * (desc ? -1 : 1));
      }
      return arr;
    },
    async filter(query = {}, orderBy) {
      const db = loadDB();
      let arr = (db[name] || []).filter((item) =>
        Object.entries(query).every(([k, v]) => {
          if (Array.isArray(v)) return v.includes(item[k]);
          return item[k] === v;
        })
      );
      if (orderBy) {
        const desc = orderBy.startsWith('-');
        const key = desc ? orderBy.slice(1) : orderBy;
        arr.sort((a, b) => (a[key] > b[key] ? 1 : -1) * (desc ? -1 : 1));
      }
      return arr;
    },
    async get(id) {
      const db = loadDB();
      return (db[name] || []).find((x) => x.id === id) || null;
    },
    async create(data) {
      const db = loadDB();
      const rec = { id: uid(), created_at: new Date().toISOString(), ...data };
      db[name] = db[name] || [];
      db[name].push(rec);
      saveDB(db);
      return rec;
    },
    async bulkCreate(items) {
      const db = loadDB();
      const created = items.map((d) => ({ id: uid(), created_at: new Date().toISOString(), ...d }));
      db[name] = [...(db[name] || []), ...created];
      saveDB(db);
      return created;
    },
    async update(id, patch) {
      const db = loadDB();
      const idx = (db[name] || []).findIndex((x) => x.id === id);
      if (idx === -1) throw new Error(`${name} ${id} not found`);
      db[name][idx] = { ...db[name][idx], ...patch, updated_at: new Date().toISOString() };
      saveDB(db);
      return db[name][idx];
    },
    async delete(id) {
      const db = loadDB();
      db[name] = (db[name] || []).filter((x) => x.id !== id);
      saveDB(db);
      return true;
    },
  };
}

const entities = {};
ENTITY_NAMES.forEach((n) => (entities[n] = makeEntity(n)));

const localBase44 = {
  entities,
  auth: {
    async me() {
      const stored = localStorage.getItem('neuland-current-user');
      if (stored) return JSON.parse(stored);
      // default: admin for demo
      const db = loadDB();
      const admin = db.User.find((u) => u.role === 'admin');
      localStorage.setItem('neuland-current-user', JSON.stringify(admin));
      return admin;
    },
    async login(email) {
      const db = loadDB();
      const u = db.User.find((x) => x.email === email);
      if (!u) throw new Error('User not found');
      localStorage.setItem('neuland-current-user', JSON.stringify(u));
      return u;
    },
    async switchRole(role) {
      const db = loadDB();
      const u = db.User.find((x) => x.role === role);
      if (!u) throw new Error('No user for role');
      localStorage.setItem('neuland-current-user', JSON.stringify(u));
      return u;
    },
    async logout() {
      localStorage.removeItem('neuland-current-user');
    },
  },
  resetDB() {
    localStorage.removeItem(LS_KEY);
    return seedDB(emptyDB());
  },
};

export const base44 = USE_SUPABASE
  ? createSupabaseClient(SUPABASE_URL, SUPABASE_KEY)
  : localBase44;

export const BACKEND_MODE = USE_SUPABASE ? 'supabase' : 'localStorage';

if (typeof window !== 'undefined') {
  console.info(`[ArrivalOS] Backend: ${BACKEND_MODE}`);
}
