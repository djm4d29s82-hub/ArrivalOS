// Supabase Edge Function: notify-on-message
//
// Trigger: Postgres webhook auf INSERT in `messages` (im Supabase-Dashboard konfigurieren).
// Aktion: schickt eine E-Mail an den Empfänger via Resend.
//
// Deploy:
//   supabase functions deploy notify-on-message --no-verify-jwt
//
// Environment-Variablen (Project Settings → Functions → Secrets):
//   RESEND_API_KEY     = re_...
//   RESEND_FROM        = ArrivalOS <noreply@arrivalos.de>
//   APP_URL            = https://arrivalos.de
//
// Webhook-Setup (Supabase Dashboard):
//   Database → Webhooks → Create new
//   Table: messages
//   Events: INSERT
//   Type: HTTP Request
//   URL: https://<project>.supabase.co/functions/v1/notify-on-message
//   Headers: Authorization: Bearer <service_role_key>

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'ArrivalOS <support@arrivalgermany.com>';
const APP_URL = Deno.env.get('APP_URL') || 'https://arrivalgermany.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

serve(async (req) => {
  try {
    const payload = await req.json();
    // Supabase Webhook-Payload: { type, table, record, old_record }
    if (payload.type !== 'INSERT' || payload.table !== 'messages') {
      return new Response('ignored', { status: 200 });
    }

    const msg = payload.record;
    if (!msg.receiver_id || msg.receiver_id === 'all') {
      return new Response('no specific receiver', { status: 200 });
    }

    // Receiver-Email aus public.users
    const { data: receiver } = await sb.from('users').select('email, full_name').eq('id', msg.receiver_id).maybeSingle();
    if (!receiver?.email) return new Response('no email', { status: 200 });

    // Mission-Titel für Subject
    const { data: mission } = msg.mission_id
      ? await sb.from('missions').select('title').eq('id', msg.mission_id).maybeSingle()
      : { data: null };

    const subject = mission?.title
      ? `Neue Nachricht zu „${mission.title}"`
      : `Neue Nachricht in ArrivalOS`;

    const html = `
      <!DOCTYPE html>
      <html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#16243F;background:#F4EFE6;">
        <h1 style="font-family:Georgia,serif;color:#16243F;">Neue Nachricht</h1>
        <p style="color:#555;">Du hast eine neue Nachricht von <strong>${msg.sender_name || 'einem Teilnehmer'}</strong>:</p>
        <blockquote style="border-left:3px solid #C9A961;padding:8px 16px;margin:16px 0;background:white;color:#16243F;">
          ${escapeHtml(msg.content)}
        </blockquote>
        <p><a href="${APP_URL}" style="background:#16243F;color:#F4EFE6;padding:10px 20px;border-radius:999px;text-decoration:none;display:inline-block;">Im Portal öffnen</a></p>
        <p style="color:#999;font-size:12px;margin-top:32px;">ArrivalOS · Human Arrival Platform</p>
      </body></html>
    `;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: receiver.email,
        subject,
        html,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ ok: false, error: err }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('notify-on-message error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
