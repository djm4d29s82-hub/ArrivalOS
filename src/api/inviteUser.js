import { base44, BACKEND_MODE } from '@/api/base44Client';

/**
 * Invite → User → Approval — production-safe Onboarding.
 *
 * Invite ist ein Pre-User-State (eigene `invites`-Zeile, KEIN Auth-User vorab).
 * Rolle + company_id + candidate_id kommen IMMER aus der Invite-Zeile, nie aus Client-Input
 * (kein Tenant-Leak). Token-Validierung + Auth-User-Anlage laufen im Supabase-Modus serverseitig
 * (Edge Functions, service_role). localStorage simuliert den Flow vollständig.
 */

const PRIVILEGED = ['admin', 'company', 'greeter'];

function genToken() {
  const bytes = new Uint8Array(32);
  (globalThis.crypto || window.crypto).getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function logEvent(entity_id, action, description, entity_type = 'Invite') {
  try {
    await base44.entities.ActivityLog.create({
      entity_type, entity_id, action, old_value: '', new_value: '',
      created_by: 'system', description, timestamp: new Date().toISOString(),
    });
  } catch { /* best-effort */ }
}

/** Admin/Company erstellt einen Invite. mode: 'email' | 'link'. */
export async function createInvite({ email, full_name, role, company_id, candidate_id, city, languages, mode = 'link' }) {
  if (!['admin', 'company', 'greeter', 'talent'].includes(role)) throw new Error('Ungültige Rolle.');
  const cleanEmail = (email || '').trim().toLowerCase() || null;
  if (mode === 'email' && !cleanEmail) throw new Error('Für den Mail-Invite ist eine E-Mail nötig.');

  if (BACKEND_MODE === 'supabase') {
    const { data, error } = await base44.raw.functions.invoke('admin-invite', {
      body: { mode, email: cleanEmail, full_name: full_name || null, role, company_id: company_id || null, candidate_id: candidate_id || null, city: city || null, languages: languages || [] },
    });
    if (error) throw new Error(error.message || 'Invite fehlgeschlagen.');
    if (data?.error) throw new Error(data.error);
    return { mode: 'supabase', ...data };
  }

  // localStorage: Invite-Zeile direkt anlegen (Roh-Token lokal gespeichert)
  const token = genToken();
  const invite = await base44.entities.Invite.create({
    token_hash: token, email: cleanEmail, full_name: full_name || null, role,
    company_id: company_id || null, candidate_id: candidate_id || null,
    city: city || null, languages: languages || [], status: 'pending',
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  await logEvent(invite.id, 'invite.created', `Invite (${role}) erstellt`);
  return {
    mode: 'localStorage',
    invite,
    link: `${window.location.origin}/register?token=${token}`,
    emailSent: mode === 'email',
  };
}

/** Liest minimale, unkritische Invite-Infos für die Register-Seite (Prefill). */
export async function peekInvite(token) {
  if (!token) return null;
  if (BACKEND_MODE === 'supabase') return null; // kein Peek: generische Anzeige, Validierung serverseitig
  const [inv] = await base44.entities.Invite.filter({ token_hash: token });
  if (!inv || inv.status !== 'pending') return { valid: false };
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) return { valid: false };
  return { valid: true, email: inv.email, role: inv.role, full_name: inv.full_name, emailLocked: !!inv.email };
}

/** Talent/Nutzer registriert sich über den Invite. */
export async function acceptInvite({ token, full_name, password, email }) {
  if (!token) throw new Error('Kein Einladungs-Token.');

  if (BACKEND_MODE === 'supabase') {
    const { data, error } = await base44.raw.functions.invoke('accept-invite', {
      body: { token, full_name: full_name || null, password, email: (email || '').trim().toLowerCase() || null },
    });
    if (error) throw new Error(error.message || 'Registrierung fehlgeschlagen.');
    if (data?.error) throw new Error(data.error);
    // Auth-User wurde serverseitig angelegt → Login macht die Register-Seite über den Context.
    return { mode: 'supabase', status: data.status, email: data.email };
  }

  // localStorage
  const [inv] = await base44.entities.Invite.filter({ token_hash: token });
  if (!inv || inv.status !== 'pending') throw new Error('Einladung ungültig oder bereits genutzt.');
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) throw new Error('Einladung abgelaufen.');
  const acctEmail = inv.email || (email || '').trim().toLowerCase();
  if (inv.email && email && email.trim().toLowerCase() !== inv.email) throw new Error('E-Mail passt nicht zur Einladung.');
  if (!acctEmail) throw new Error('E-Mail erforderlich.');

  const status = inv.role === 'talent' ? 'active' : 'pending_approval';
  if (inv.role === 'greeter') {
    await base44.entities.GreeterProfile.create({
      email: acctEmail, full_name: full_name || acctEmail, city: inv.city || '',
      languages: inv.languages || [], availability: 'flexible', status: 'available', rating: null, completed_missions: 0,
    });
  }
  const user = await base44.entities.User.create({
    email: acctEmail, full_name: full_name || acctEmail, role: inv.role,
    company_id: inv.company_id || null, candidate_id: inv.candidate_id || null, status,
  });
  await base44.entities.Invite.update(inv.id, { status: 'accepted', accepted_at: new Date().toISOString(), accepted_user_id: user.id });
  await logEvent(inv.id, 'invite.accepted', `${acctEmail} registriert`);
  await logEvent(user.id, status === 'active' ? 'access.granted' : 'registration.started', status === 'active' ? 'Zugang erteilt' : 'Wartet auf Freigabe', 'User');

  return { mode: 'localStorage', status, email: acctEmail };
}

/** Admin-Approval für privilegierte Rollen. */
export async function listPendingApprovals() {
  return base44.entities.User.filter({ status: 'pending_approval' });
}
export async function approveUser(id) {
  const u = await base44.entities.User.update(id, { status: 'active' });
  await logEvent(id, 'access.approved', 'Zugang freigegeben', 'User');
  return u;
}
export async function rejectUser(id) {
  await logEvent(id, 'access.rejected', 'Zugang abgelehnt', 'User');
  return base44.entities.User.delete(id);
}
