// Supabase Edge Function: partner-referral
//
// Invoked by the talent client after they CONSENT to share data with a partner:
//   base44.raw.functions.invoke('partner-referral', { body: { missionServiceId } })
// Sends a structured lead to the partner (Resend) with the minimum consented data, exactly once.
//
// Deploy:   supabase functions deploy partner-referral
// Secrets:  RESEND_API_KEY, RESEND_FROM (already set); SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (auto).
//
// Guards (all server-side, service role): provider_type='ag_partner' + partner_id + consent_at set +
// referral_sent_at null. No consent → no send. Sets referral_sent_at so a partner is never emailed twice.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'Arrival Germany <support@arrivalgermany.com>';
const APP_URL = Deno.env.get('APP_URL') || 'https://arrivalgermany.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { missionServiceId } = await req.json().catch(() => ({}));
    if (!missionServiceId) return json({ ok: false, error: 'missionServiceId required' }, 400);

    const { data: svc } = await sb.from('mission_services').select('*').eq('id', missionServiceId).maybeSingle();
    if (!svc) return json({ ok: false, error: 'service not found' }, 404);

    // Guards: only a consented Arrival-partner service, never twice.
    if (svc.provider_type !== 'ag_partner' || !svc.partner_id) return json({ ok: true, skipped: 'not an ag_partner service' });
    if (!svc.consent_at) return json({ ok: true, skipped: 'no consent' });
    if (svc.referral_sent_at) return json({ ok: true, skipped: 'already sent' });

    const { data: partner } = await sb.from('partners').select('name, contact_email').eq('id', svc.partner_id).maybeSingle();
    if (!partner?.contact_email) {
      // mark as sent anyway so we don't retry a partner with no email each time
      await sb.from('mission_services').update({ referral_sent_at: new Date().toISOString() }).eq('id', svc.id);
      return json({ ok: true, skipped: 'partner has no contact email' });
    }

    // Minimal consented data only.
    const { data: mission } = await sb.from('missions').select('city, datetime, candidate_id').eq('id', svc.mission_id).maybeSingle();
    const { data: cand } = mission?.candidate_id
      ? await sb.from('candidates').select('full_name').eq('id', mission.candidate_id).maybeSingle()
      : { data: null };

    if (!RESEND_API_KEY) return json({ ok: false, error: 'RESEND_API_KEY not set' }, 500);

    const subject = `Arrival Germany — Service-Anfrage (${esc(svc.category)})`;
    const html = `
      <!DOCTYPE html><html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#16243F;background:#F4EFE6;">
        <h1 style="font-family:Georgia,serif;">Neue Service-Anfrage</h1>
        <p>Hallo ${esc(partner.name)},</p>
        <p>für eine internationale Fachkraft, die wir begleiten, möchten wir euren Service anfragen
        (mit Einwilligung der betreffenden Person):</p>
        <table style="border-collapse:collapse;margin:12px 0;">
          <tr><td style="padding:4px 12px 4px 0;color:#555;">Kategorie</td><td style="padding:4px 0;"><strong>${esc(svc.category)}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#555;">Talent</td><td style="padding:4px 0;">${esc(cand?.full_name || '—')}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#555;">Stadt</td><td style="padding:4px 0;">${esc(mission?.city || '—')}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#555;">Ankunft</td><td style="padding:4px 0;">${esc(mission?.datetime ? new Date(mission.datetime).toLocaleDateString('de-DE') : '—')}</td></tr>
        </table>
        <p>Bitte meldet euch zur Abstimmung der Details. Danke!</p>
        <p style="color:#999;font-size:12px;margin-top:32px;">Arrival Germany · ${esc(APP_URL)}</p>
      </body></html>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to: partner.contact_email, subject, html }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error('Resend error:', err);
      return json({ ok: false, error: 'resend failed' }, 502);
    }

    await sb.from('mission_services').update({ referral_sent_at: new Date().toISOString() }).eq('id', svc.id);
    return json({ ok: true, sent: true });
  } catch (err) {
    console.error('partner-referral error:', err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
