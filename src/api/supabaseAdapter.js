// Supabase Adapter — gleiches Interface wie der lokale base44-Mock.
// Wird nur geladen wenn VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY gesetzt sind.
//
// Erwartete Tabellen siehe supabase/schema.sql.
// Alle Tabellen-Namen sind lowercase plural (companies, users, missions, ...).

import { createClient } from '@supabase/supabase-js';

const TABLE_MAP = {
  User: 'users',
  Company: 'companies',
  GreeterProfile: 'greeter_profiles',
  Candidate: 'candidates',
  Mission: 'missions',
  JourneyStep: 'journey_steps',
  Message: 'messages',
  Notification: 'notifications',
  ActivityLog: 'activity_logs',
  Invoice: 'invoices',
  Settings: 'settings',
  Lead: 'leads',
  Document: 'documents',
  SOP: 'sops',
  MissionTemplate: 'mission_templates',
  MissionService: 'mission_services',
  Review: 'reviews',
  Payout: 'payouts',
};

export function createSupabaseClient(url, anonKey) {
  const sb = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  const makeEntity = (entityName) => {
    const table = TABLE_MAP[entityName] || entityName.toLowerCase();

    const applyOrder = (q, orderBy) => {
      if (!orderBy) return q;
      const desc = orderBy.startsWith('-');
      const key = desc ? orderBy.slice(1) : orderBy;
      return q.order(key, { ascending: !desc });
    };

    return {
      async list(orderBy) {
        let q = sb.from(table).select('*');
        q = applyOrder(q, orderBy);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      },
      async filter(query = {}, orderBy) {
        let q = sb.from(table).select('*');
        for (const [k, v] of Object.entries(query)) {
          q = Array.isArray(v) ? q.in(k, v) : q.eq(k, v);
        }
        q = applyOrder(q, orderBy);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      },
      async get(id) {
        const { data, error } = await sb.from(table).select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data;
      },
      async create(payload) {
        const { data, error } = await sb.from(table).insert(payload).select().single();
        if (error) throw error;
        return data;
      },
      async bulkCreate(items) {
        const { data, error } = await sb.from(table).insert(items).select();
        if (error) throw error;
        return data || [];
      },
      async update(id, patch) {
        const { data, error } = await sb.from(table).update(patch).eq('id', id).select().single();
        if (error) throw error;
        return data;
      },
      async delete(id) {
        const { error } = await sb.from(table).delete().eq('id', id);
        if (error) throw error;
        return true;
      },
    };
  };

  const entities = {};
  Object.keys(TABLE_MAP).forEach((name) => {
    entities[name] = makeEntity(name);
  });

  const auth = {
    async me() {
      // Restore from the persisted session (localStorage, no network) — getUser() would make a
      // network round-trip and, behind the boot timeout, resolves to null on any slowness → the
      // user looks logged out after a reload.
      const { data: { session } } = await sb.auth.getSession();
      const user = session?.user;
      if (!user) return null;
      const { data: profile } = await sb.from('users').select('*').eq('id', user.id).maybeSingle();
      return profile || { id: user.id, email: user.email, role: 'talent' };
    },
    async login(email) {
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
      return { pending: true, email };
    },
    async loginWithPassword(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const user = data.user;
      if (!user) return null;
      // Return the app PROFILE (role / company_id / candidate_id), not the bare auth user —
      // routing depends on the role being present immediately after login.
      const { data: profile } = await sb.from('users').select('*').eq('id', user.id).maybeSingle();
      return profile || { id: user.id, email: user.email, role: 'talent' };
    },
    async switchRole() {
      throw new Error('Role-switching is dev-mode only — not available in Supabase mode.');
    },
    async logout() {
      await sb.auth.signOut();
    },
    onChange(cb) {
      // Defer off the listener stack: the callback fires while GoTrue holds its navigator.locks auth
      // lock, and calling another auth/DB method from inside it can deadlock. setTimeout(…, 0) runs
      // the consumer after the lock is released.
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        setTimeout(() => cb(event, session), 0);
      });
      return () => data.subscription.unsubscribe();
    },
  };

  return {
    entities,
    auth,
    raw: sb,
    resetDB() {
      throw new Error('resetDB is only available in localStorage-mode.');
    },
  };
}
