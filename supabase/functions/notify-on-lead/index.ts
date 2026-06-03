// Supabase Edge Function: notify-on-lead
//
// Trigger: Postgres webhook auf INSERT in `leads`.
// Aktionen:
//   1. Bestätigungs-Email an Lead schicken
//   2. Optional: Forward an externes CRM (Webhook-URL)
//
// Deploy:
//   supabase functions deploy notify-on-lead --no-verify-jwt
//
// Secrets:
//   RESEND_API_KEY, RESEND_FROM, APP_URL
//   CRM_FORWARD_URL  (optional — Zapier/Make/HubSpot)
//   SALES_INBOX      (z.B. sales@arrivalos.de)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'Arrival Germany <support@arrivalgermany.com>';
const APP_URL = Deno.env.get('APP_URL') || 'https://arrivalgermany.com';
const CRM_FORWARD_URL = Deno.env.get('CRM_FORWARD_URL') || '';
const SALES_INBOX = Deno.env.get('SALES_INBOX') || 'support@arrivalgermany.com';

serve(async (req) => {
  try {
    const { record: lead } = await req.json();
    if (!lead?.email) return new Response('no lead', { status: 200 });

    const tasks: Promise<unknown>[] = [];

    // 1. Bestätigung an Lead
    tasks.push(sendMail({
      to: lead.email,
      subject: 'Danke für deine Anfrage — Arrival Germany',
      html: `
        <h1 style="font-family:Georgia,serif;">Vielen Dank, ${escapeHtml(lead.name || '')}!</h1>
        <p>Wir haben deine Anfrage erhalten und melden uns innerhalb von 1 Werktag bei dir.</p>
        <p>Bei Rückfragen erreichst du uns direkt unter <a href="mailto:${SALES_INBOX}">${SALES_INBOX}</a>.</p>
        <p style="color:#999;font-size:12px;margin-top:32px;">Arrival Germany · Human Arrival Platform</p>
      `,
    }));

    // 2. Intern an Sales
    tasks.push(sendMail({
      to: SALES_INBOX,
      subject: `Neuer Lead: ${lead.company || lead.name || lead.email}`,
      html: `
        <h2>Neuer Lead via ${escapeHtml(lead.source || 'landing')}</h2>
        <table style="border-collapse:collapse;">
          ${row('Firma', lead.company)}
          ${row('Name', lead.name)}
          ${row('Email', lead.email)}
          ${row('Telefon', lead.phone)}
          ${row('Rolle/Anliegen', lead.role_type)}
          ${row('Volumen', lead.volume)}
          ${row('Nachricht', lead.message)}
        </table>
        <p style="margin-top:16px;"><a href="${APP_URL}/admin">Im Admin-Portal öffnen</a></p>
      `,
    }));

    // 3. CRM-Forward (optional)
    if (CRM_FORWARD_URL) {
      tasks.push(fetch(CRM_FORWARD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      }));
    }

    await Promise.allSettled(tasks);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('notify-on-lead error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});

async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  });
}

function row(k: string, v: unknown) {
  if (!v) return '';
  return `<tr><td style="padding:4px 12px;color:#666;">${k}</td><td style="padding:4px 12px;">${escapeHtml(String(v))}</td></tr>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]!);
}
