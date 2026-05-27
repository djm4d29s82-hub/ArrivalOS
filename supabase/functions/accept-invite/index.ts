// Supabase Edge Function: accept-invite
//
// Vom öffentlichen /register?token=… aufgerufen (der Registrant hat noch kein Konto).
// Validiert den Token (Hash + Expiry + Status + optionaler E-Mail-Lock), legt den Auth-User
// mit Passwort an, setzt Rolle/Verknüpfung/Status AUS DER INVITE-Zeile (nie aus Client-Input),
// markiert die Invite als accepted und schreibt Events.
//
// Sicherheit: läuft mit service_role; Schutz = der Token. KEINE Rolle/Tenant aus dem Body.
// Deploy: supabase functions deploy accept-invite --no-verify-jwt   (Aufrufer ist nicht eingeloggt)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function sha256hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { token, full_name, password, email } = await req.json();
    if (!token || !password) return json({ error: 'Token und Passwort erforderlich.' }, 400);
    if (String(password).length < 8) return json({ error: 'Passwort zu kurz (min. 8 Zeichen).' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

    const token_hash = await sha256hex(token);
    const { data: invite } = await admin.from('invites').select('*').eq('token_hash', token_hash).maybeSingle();
    if (!invite || invite.status !== 'pending') return json({ error: 'Einladung ungültig oder bereits genutzt.' }, 400);
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) return json({ error: 'Einladung abgelaufen.' }, 400);

    const acctEmail = (invite.email || email || '').trim().toLowerCase();
    if (invite.email && email && email.trim().toLowerCase() !== invite.email) return json({ error: 'E-Mail passt nicht zur Einladung.' }, 400);
    if (!acctEmail) return json({ error: 'E-Mail erforderlich.' }, 400);

    // Auth-User anlegen (Passwort jetzt gesetzt → E-Mail gilt als bestätigt)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: acctEmail, password, email_confirm: true, user_metadata: { full_name: full_name || null },
    });
    if (createErr || !created?.user) return json({ error: createErr?.message || 'Konto konnte nicht angelegt werden.' }, 400);
    const uid = created.user.id;

    // R2: Schlägt ein Schritt nach createUser fehl, würde ein Auth-User OHNE Profil zurückbleiben
    // (me() fiele auf role:'talent' zurück → falsche Identität). Daher bei jedem Fehler den
    // Auth-User (und eine evtl. angelegte users-Zeile) wieder entfernen und sauber abbrechen.
    const rollback = async () => {
      await admin.from('users').delete().eq('id', uid).then(() => {}, () => {});
      await admin.auth.admin.deleteUser(uid).then(() => {}, () => {});
    };

    const status = invite.role === 'talent' ? 'active' : 'pending_approval';
    const { error: upErr } = await admin.from('users').upsert({
      id: uid, email: acctEmail, full_name: full_name || acctEmail, role: invite.role,
      company_id: invite.company_id || null, candidate_id: invite.candidate_id || null, status,
    }, { onConflict: 'id' });
    if (upErr) { await rollback(); return json({ error: upErr.message }, 400); }

    if (invite.role === 'greeter') {
      const { error: gpErr } = await admin.from('greeter_profiles').insert({
        user_id: uid, email: acctEmail, full_name: full_name || acctEmail,
        city: invite.city || '', languages: invite.languages || [], status: 'available',
      });
      if (gpErr) { await rollback(); return json({ error: gpErr.message }, 400); }
    }

    // Erst nach erfolgreicher Profil-Anlage die Invite verbrauchen (Einmal-Nutzung).
    await admin.from('invites').update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_user_id: uid }).eq('id', invite.id);
    await admin.from('activity_logs').insert({
      entity_type: 'User', entity_id: uid,
      action: status === 'active' ? 'access.granted' : 'registration.started',
      created_by: acctEmail, description: status === 'active' ? 'Zugang erteilt' : 'Wartet auf Freigabe',
      timestamp: new Date().toISOString(),
    });

    return json({ ok: true, email: acctEmail, status });
  } catch (err) {
    console.error('accept-invite error:', err);
    return json({ error: String(err) }, 500);
  }
});
