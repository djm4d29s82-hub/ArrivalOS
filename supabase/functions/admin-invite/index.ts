// Supabase Edge Function: admin-invite
//
// Vom Admin/Company-Portal aufgerufen (Authorization = JWT des Eingeloggten).
// Erzeugt eine `invites`-Zeile (Pre-User-State) mit gehashtem Token + Expiry und gibt den
// Registrierungs-Link `/register?token=…` zurück. Im Mail-Modus wird der Link zusätzlich
// per Resend verschickt. KEIN Auth-User wird hier angelegt (Invite ≠ User).
//
// Sicherheit: nur Aufrufer mit Rolle 'admin' (oder 'company' für eigene company_id).
// Deploy: supabase functions deploy admin-invite   (JWT-Verify an)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'https://arrivalgermany.com';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'ArrivalOS <support@arrivalgermany.com>';

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
function genToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    if (!jwt) return json({ error: 'Nicht authentifiziert.' }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: caller, error: cErr } = await admin.auth.getUser(jwt);
    if (cErr || !caller?.user) return json({ error: 'Nicht authentifiziert.' }, 401);
    const { data: me } = await admin.from('users').select('role, company_id').eq('id', caller.user.id).maybeSingle();
    if (!me || !['admin', 'company'].includes(me.role)) return json({ error: 'Keine Berechtigung zum Einladen.' }, 403);

    const { mode, email, full_name, role, company_id, candidate_id, city, languages } = await req.json();
    if (!['admin', 'company', 'greeter', 'talent'].includes(role)) return json({ error: 'Ungültige Rolle.' }, 400);
    // Company darf nur in die eigene Firma + nur talent/greeter einladen
    const finalCompany = me.role === 'company' ? me.company_id : (company_id || null);
    if (me.role === 'company' && !['talent', 'greeter'].includes(role)) return json({ error: 'Company darf nur Talent/Greeter einladen.' }, 403);

    // R1: candidate_id muss zur Ziel-Firma gehören — sonst würde das eingeladene Talent via RLS
    // (current_candidate_id()) Daten einer fremden Firma lesen (Tenant-Leak).
    if (candidate_id) {
      const { data: cand, error: candErr } = await admin.from('candidates').select('company_id').eq('id', candidate_id).maybeSingle();
      if (candErr || !cand) return json({ error: 'Kandidat nicht gefunden.' }, 400);
      // Company: Kandidat muss der eigenen Firma gehören. Admin: company_id (falls gesetzt) muss zum Kandidaten passen.
      if (me.role === 'company' && cand.company_id !== finalCompany) {
        return json({ error: 'Kandidat gehört nicht zur eigenen Firma.' }, 403);
      }
      if (me.role === 'admin' && finalCompany && cand.company_id !== finalCompany) {
        return json({ error: 'Kandidat passt nicht zur angegebenen Firma.' }, 400);
      }
    }

    const raw = genToken();
    const token_hash = await sha256hex(raw);
    const { data: invite, error: insErr } = await admin.from('invites').insert({
      token_hash, email: email || null, full_name: full_name || null, role,
      company_id: finalCompany, candidate_id: candidate_id || null, city: city || null,
      languages: languages || [], status: 'pending', invited_by: caller.user.id,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }).select().single();
    if (insErr) return json({ error: insErr.message }, 400);

    await admin.from('activity_logs').insert({
      entity_type: 'Invite', entity_id: invite.id, action: 'invite.created',
      created_by: caller.user.email, description: `Invite (${role}) erstellt`, timestamp: new Date().toISOString(),
    });

    const link = `${APP_URL}/register?token=${raw}`;
    let emailSent = false;
    if (mode === 'email' && email && RESEND_API_KEY) {
      // Report the REAL outcome — a swallowed failure used to return emailSent:true, so the
      // caller never fell back to the copy-link flow and the invitee got nothing.
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: RESEND_FROM, to: email, subject: 'Du wurdest zu ArrivalOS eingeladen',
            html: `<h1 style="font-family:Georgia,serif;">Du wurdest eingeladen.</h1>
                   <p>Leg dein Konto an — es dauert eine Minute:</p>
                   <p><a href="${link}">${link}</a></p>
                   <p style="color:#999;font-size:12px;margin-top:24px;">ArrivalOS · Ankunft, menschlich gemacht.</p>`,
          }),
        });
        emailSent = r.ok;
      } catch {
        emailSent = false;
      }
    }

    return json({ ok: true, invite_id: invite.id, link, emailSent });
  } catch (err) {
    console.error('admin-invite error:', err);
    return json({ error: String(err) }, 500);
  }
});
