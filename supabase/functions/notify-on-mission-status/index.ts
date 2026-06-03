// Supabase Edge Function: notify-on-mission-status
//
// Trigger: Postgres webhook auf UPDATE in `missions` (im Supabase-Dashboard konfigurieren).
// Aktion: schickt bei einem Status-Meilenstein eine E-Mail an den Company-Kontakt via Resend,
//         damit HR den Fortschritt sieht, ohne sich einzuloggen.
//
// Nur Meilensteine lösen eine Mail aus (assigned/on_the_way/arrived/in_progress/completed/cancelled).
// Interne Zwischenzustände (open/matched/met_talent/eta/issue_*) werden bewusst ignoriert.
//
// Deploy:
//   supabase functions deploy notify-on-mission-status --no-verify-jwt
//
// Environment-Variablen (Project Settings → Functions → Secrets):
//   RESEND_API_KEY     = re_...
//   RESEND_FROM        = Arrival Germany <noreply@arrivalos.de>   (verifizierte Absender-Domain nötig)
//   APP_URL            = https://arrival-os-ten.vercel.app
//
// Webhook-Setup (Supabase Dashboard):
//   Database → Webhooks → Create new
//   Table: missions
//   Events: UPDATE
//   Type: HTTP Request
//   URL: https://<project>.supabase.co/functions/v1/notify-on-mission-status
//   Headers: Authorization: Bearer <service_role_key>

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'Arrival Germany <support@arrivalgermany.com>';
const APP_URL = Deno.env.get('APP_URL') || 'https://arrivalgermany.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Nur diese Status-Meilensteine werden an die Company gemeldet.
const MILESTONES: Record<string, { label: string; message: string }> = {
  assigned: { label: 'Greeter zugewiesen', message: 'Ein Greeter wurde der Ankunft zugewiesen und bereitet sich vor.' },
  on_the_way: { label: 'Greeter unterwegs', message: 'Der Greeter ist auf dem Weg zum Treffpunkt.' },
  arrived: { label: 'Greeter vor Ort', message: 'Der Greeter ist am Treffpunkt eingetroffen.' },
  in_progress: { label: 'Onboarding gestartet', message: 'Der Greeter hat das Talent getroffen — das Onboarding läuft.' },
  completed: { label: 'Onboarding abgeschlossen', message: 'Das Onboarding ist erfolgreich abgeschlossen. Willkommen im Team!' },
  cancelled: { label: 'Ankunft abgebrochen', message: 'Diese Ankunft wurde abgebrochen. Bitte im Portal prüfen.' },
};

serve(async (req) => {
  try {
    const payload = await req.json();
    // Supabase Webhook-Payload: { type, table, record, old_record }
    if (payload.type !== 'UPDATE' || payload.table !== 'missions') {
      return new Response('ignored', { status: 200 });
    }

    const mission = payload.record;
    const prev = payload.old_record;
    // Nur bei echtem Status-Wechsel.
    if (!mission?.status || mission.status === prev?.status) {
      return new Response('no status change', { status: 200 });
    }

    const milestone = MILESTONES[mission.status];
    if (!milestone) {
      return new Response('ignored', { status: 200 }); // kein Meilenstein → keine Mail
    }

    if (!mission.company_id) return new Response('no company', { status: 200 });

    // Company-Email auflösen.
    const { data: company } = await sb
      .from('companies')
      .select('email, name')
      .eq('id', mission.company_id)
      .maybeSingle();
    if (!company?.email) return new Response('no company email', { status: 200 });

    // Kandidatenname für schönere Copy (best-effort).
    const { data: candidate } = mission.candidate_id
      ? await sb.from('candidates').select('full_name').eq('id', mission.candidate_id).maybeSingle()
      : { data: null };
    const who = candidate?.full_name || mission.title || 'Eine Ankunft';

    const subject = `„${mission.title || who}" — ${milestone.label}`;

    const html = `
      <!DOCTYPE html>
      <html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#16243F;background:#F4EFE6;">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C9A961;font-weight:bold;">Status-Update</div>
        <h1 style="font-family:Georgia,serif;color:#16243F;margin:8px 0 4px;">${escapeHtml(milestone.label)}</h1>
        <p style="color:#555;margin:0 0 16px;">${escapeHtml(who)}${company?.name ? ' · ' + escapeHtml(company.name) : ''}</p>
        <blockquote style="border-left:3px solid #C9A961;padding:8px 16px;margin:16px 0;background:white;color:#16243F;">
          ${escapeHtml(milestone.message)}
        </blockquote>
        <p><a href="${APP_URL}/company" style="background:#16243F;color:#F4EFE6;padding:10px 20px;border-radius:999px;text-decoration:none;display:inline-block;">Im Portal ansehen</a></p>
        <p style="color:#999;font-size:12px;margin-top:32px;">Arrival Germany · Human Arrival Platform</p>
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
        to: company.email,
        subject,
        html,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ ok: false, error: err }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, status: mission.status, to: company.email }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('notify-on-mission-status error:', err);
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
