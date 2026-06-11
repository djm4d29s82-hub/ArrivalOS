// Supabase Edge Function: send-push
//
// Trigger: Postgres webhook on INSERT into `notifications`. Delivers the notification as a Web Push
// to every device the recipient (notifications.user_email) has subscribed (push_subscriptions).
// So every in-app notification (assignment, flight landed/delayed, new message, …) also becomes a push.
//
// Deploy:   supabase functions deploy send-push --no-verify-jwt
// Secrets:  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (from scripts/gen-vapid.mjs / .vapid.local),
//           VAPID_SUBJECT (e.g. mailto:support@arrivalgermany.com); SUPABASE_URL + SERVICE_ROLE auto.
// Webhook:  Database → Webhooks → table notifications, event INSERT, URL .../functions/v1/send-push.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@arrivalgermany.com';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

Deno.serve(async (req) => {
  // Security-Audit 2026-06-11, P0-4: nur der DB-Webhook (Authorization: Bearer <service_role_key>)
  // darf rufen — sonst kann jeder Push-Spam an alle Geräte eines Nutzers auslösen.
  if (req.headers.get('Authorization') !== `Bearer ${SERVICE_KEY}`) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return json({ ok: false, error: 'VAPID keys not set' }, 500);
  try {
    const payload = await req.json().catch(() => ({}));
    if (payload.type !== 'INSERT' || payload.table !== 'notifications') return json({ ok: true, skipped: 'ignored' });
    const n = payload.record;
    if (!n?.user_email) return json({ ok: true, skipped: 'no recipient' });

    const { data: subs = [] } = await sb.from('push_subscriptions').select('id, subscription').eq('user_email', n.user_email);
    if (!subs.length) return json({ ok: true, sent: 0 });

    const body = JSON.stringify({ title: n.title || 'Arrival Germany', message: n.message || '', link: n.link || '/', tag: n.id });
    let sent = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(s.subscription, body);
        sent++;
      } catch (err) {
        // 404/410 → subscription is dead; prune it.
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) await sb.from('push_subscriptions').delete().eq('id', s.id);
        else console.error('push send error', code, err);
      }
    }
    return json({ ok: true, sent });
  } catch (err) {
    console.error('send-push error:', err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
