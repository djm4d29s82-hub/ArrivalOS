// Supabase Edge Function: flight-tracker
// ---------------------------------------------------------------------------
// Runs daily (scheduled via pg_cron — see ../CRON_SETUP.sql). For every mission
// arriving today that has a flight_number, it polls AviationStack and notifies
// the assigned greeter once the flight has landed.
//
// Deploy:   supabase functions deploy flight-tracker
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto), AVIATIONSTACK_API_KEY
//           (supabase secrets set AVIATIONSTACK_API_KEY=...)
// AviationStack free tier: 500 requests/month (~20 missions/month).
// ---------------------------------------------------------------------------
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const apiKey = Deno.env.get('AVIATIONSTACK_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AVIATIONSTACK_API_KEY not set' }), { status: 500 });
  }

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  const { data: missions = [] } = await supabase
    .from('missions')
    .select('id, title, flight_number, greeter_id, datetime')
    .not('flight_number', 'is', null)
    .gte('datetime', dayStart)
    .lte('datetime', dayEnd);

  const DELAY_THRESHOLD_MIN = 30;
  let landed = 0;
  let delayed = 0;
  for (const m of missions ?? []) {
    if (!m.flight_number) continue;
    const res = await fetch(
      `https://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(m.flight_number)}`,
    );
    const json = await res.json().catch(() => null);
    const flight = json?.data?.[0];
    if (!flight) continue;

    const delayMin = Number(flight.departure?.delay ?? flight.arrival?.delay ?? 0) || 0;
    const isLanded = flight.flight_status === 'landed';
    const isDelayed = !isLanded && delayMin >= DELAY_THRESHOLD_MIN;
    if (!isLanded && !isDelayed) continue;

    const { data: g } = await supabase
      .from('greeter_profiles')
      .select('email')
      .eq('id', m.greeter_id)
      .maybeSingle();

    if (isLanded) {
      await supabase.from('missions').update({ flight_status: 'landed' }).eq('id', m.id);
      const airport = flight.arrival?.airport ?? '';
      const terminal = flight.arrival?.terminal ? ` T${flight.arrival.terminal}` : '';
      if (g?.email) {
        await supabase.from('notifications').insert({
          user_email: g.email,
          title: `${m.flight_number} gelandet`,
          message: `${m.flight_number} ist gelandet${airport ? ` — ${airport}${terminal}` : ''}.`,
          type: 'success',
          link: `/greeter-dashboard/missions/${m.id}`,
          read: false,
        });
      }
      landed++;
    } else {
      // delayed — only act on a change to avoid repeat notifications
      const note = `${delayMin} Min Verspätung (automatisch erkannt)`;
      await supabase.from('missions').update({ flight_status: 'delayed', flight_delay_note: note }).eq('id', m.id);
      if (g?.email) {
        await supabase.from('notifications').insert({
          user_email: g.email,
          title: `${m.flight_number} verspätet`,
          message: `${m.flight_number}: ${note}.`,
          type: 'warning',
          link: `/greeter-dashboard/missions/${m.id}`,
          read: false,
        });
      }
      delayed++;
    }
  }

  return new Response(
    JSON.stringify({ checked: missions?.length ?? 0, landed, delayed }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
