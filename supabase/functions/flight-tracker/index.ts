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

  let landed = 0;
  for (const m of missions ?? []) {
    if (!m.flight_number) continue;
    const res = await fetch(
      `https://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(m.flight_number)}`,
    );
    const json = await res.json().catch(() => null);
    const flight = json?.data?.[0];
    if (!flight || flight.flight_status !== 'landed') continue;

    const { data: g } = await supabase
      .from('greeter_profiles')
      .select('email')
      .eq('id', m.greeter_id)
      .maybeSingle();
    if (!g?.email) continue;

    const airport = flight.arrival?.airport ?? '';
    const terminal = flight.arrival?.terminal ? ` T${flight.arrival.terminal}` : '';
    await supabase.from('notifications').insert({
      user_email: g.email,
      title: `${m.flight_number} gelandet`,
      message: `${m.flight_number} ist gelandet${airport ? ` — ${airport}${terminal}` : ''}.`,
      type: 'success',
      link: `/greeter-dashboard/missions/${m.id}`,
      read: false,
    });
    landed++;
  }

  return new Response(
    JSON.stringify({ checked: missions?.length ?? 0, landed }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
