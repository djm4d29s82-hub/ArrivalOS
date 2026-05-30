// Supabase Edge Function: step-reminders
// ---------------------------------------------------------------------------
// Runs daily (scheduled via pg_cron — see ../CRON_SETUP.sql). Proactively:
//   • notifies the assigned greeter of journey steps due within the next 3 days
//   • escalates overdue steps (scheduled in the past, not completed) to admin
//
// Deploy:   supabase functions deploy step-reminders
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (set automatically by Supabase)
// ---------------------------------------------------------------------------
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NIL = '00000000-0000-0000-0000-000000000000';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const in3 = new Date(now.getTime() + 3 * 86400000).toISOString();

  const { data: upcoming = [] } = await supabase
    .from('journey_steps')
    .select('id, title, mission_id, scheduled_at, status')
    .neq('status', 'completed')
    .gte('scheduled_at', todayStart)
    .lte('scheduled_at', in3);

  const { data: overdue = [] } = await supabase
    .from('journey_steps')
    .select('id, title, mission_id, scheduled_at, status')
    .neq('status', 'completed')
    .lt('scheduled_at', todayStart);

  // Resolve greeter email for each affected mission.
  const missionIds = [...new Set([...(upcoming ?? []), ...(overdue ?? [])].map((s) => s.mission_id))];
  const { data: missions = [] } = await supabase
    .from('missions')
    .select('id, title, greeter_id')
    .in('id', missionIds.length ? missionIds : [NIL]);
  const missionById = Object.fromEntries((missions ?? []).map((m) => [m.id, m]));

  const greeterIds = [...new Set((missions ?? []).map((m) => m.greeter_id).filter(Boolean))];
  const { data: greeters = [] } = await supabase
    .from('greeter_profiles')
    .select('id, email')
    .in('id', greeterIds.length ? greeterIds : [NIL]);
  const emailFor = (gid: string) => (greeters ?? []).find((g) => g.id === gid)?.email;

  const notifications: Record<string, unknown>[] = [];

  for (const s of upcoming ?? []) {
    const m = missionById[s.mission_id];
    const email = m && emailFor(m.greeter_id);
    if (!email) continue;
    const days = Math.ceil((new Date(s.scheduled_at).getTime() - now.getTime()) / 86400000);
    notifications.push({
      user_email: email,
      title: `Bald fällig: ${s.title}`,
      message: days <= 0 ? `„${s.title}“ ist heute fällig.` : `„${s.title}“ ist in ${days} ${days === 1 ? 'Tag' : 'Tagen'} fällig.`,
      type: 'info',
      link: `/greeter-dashboard/missions/${s.mission_id}`,
      read: false,
    });
  }

  for (const s of overdue ?? []) {
    notifications.push({
      user_email: 'admin@neuland.de',
      title: `Überfällig: ${s.title}`,
      message: `Schritt „${s.title}“ ist überfällig (geplant ${new Date(s.scheduled_at).toLocaleDateString('de-DE')}).`,
      type: 'alert',
      link: `/admin/missions/${s.mission_id}`,
      read: false,
    });
  }

  if (notifications.length) {
    await supabase.from('notifications').insert(notifications);
  }

  return new Response(
    JSON.stringify({ upcoming: upcoming?.length ?? 0, overdue: overdue?.length ?? 0, sent: notifications.length }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
