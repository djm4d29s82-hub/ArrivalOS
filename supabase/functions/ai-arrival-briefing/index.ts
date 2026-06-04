// Supabase Edge Function: ai-arrival-briefing
//
// Zweck: erstellt für HR ein KI-Ankunfts-Briefing — Status, Risiken, nächste Schritte —
// aus den aktiven Ankünften, die das Unternehmensportal bereits geladen hat.
// KI für das Unternehmen (nicht für Kandidat:innen).
//
// Die Funktion bekommt eine kompakte Zusammenfassung vom Client (kein DB-Zugriff, keine
// RLS-Fragen) und ruft die Anthropic Messages API. Antwort: { summary, risks[], actions[] }.
//
// Deploy:
//   supabase functions deploy ai-arrival-briefing
//
// Secrets (Project Settings → Functions → Secrets):
//   ANTHROPIC_API_KEY = sk-ant-...
//
// Ohne Key antwortet die Funktion sauber mit { configured:false } — das UI zeigt das ruhig an.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const MODEL = Deno.env.get('ANTHROPIC_MODEL') || 'claude-haiku-4-5';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const SYSTEM = `Du bist die Operations-Assistenz von Arrival Germany, einer Plattform für die Ankunft internationaler Fachkräfte in Deutschland.
Du erstellst für ein HR-/Unternehmens-Team ein knappes, sachliches Briefing auf Deutsch über den Stand seiner laufenden Ankünfte ("Missionen").
Regeln:
- Antworte AUSSCHLIESSLICH mit JSON, exakt diesem Schema: {"summary": string, "risks": string[], "actions": string[]}.
- "summary": 2–3 ruhige Sätze zum Gesamtbild (wie viele Ankünfte, wie ist die Pünktlichkeit, generelle Lage).
- "risks": konkrete Risiken, die Aufmerksamkeit brauchen (überfällige Schritte, Ankünfte ohne Greeter, nahe Termine). Leeres Array, wenn alles im grünen Bereich.
- "actions": konkrete, umsetzbare nächste Schritte fürs HR-Team. Kurz, im Imperativ.
- Falls "services" je Mission vorhanden sind (Wohnung, Bankkonto, SIM, Krankenversicherung …): berücksichtige ihren Status und ihre Frist. Hebe als Risiko hervor, wenn ein Service als "ueberfaellig" markiert ist oder kurz vor der Ankunft noch "requested" (angefragt) ist; erwähne im Summary, was bereits aktiv orchestriert wird.
- Keine erfundenen Zahlen — nutze nur die gelieferten Daten. Keine Floskeln, keine Preise, keine Markennamen.
- Maximal 4 Einträge je Liste.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  if (!ANTHROPIC_API_KEY) {
    return json({ configured: false, error: 'KI ist nicht konfiguriert (ANTHROPIC_API_KEY fehlt).' });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const { missions = [], steps = {}, counts = {} } = payload || {};

    if (!Array.isArray(missions) || missions.length === 0) {
      return json({ configured: true, empty: true, error: 'Keine aktiven Ankünfte zum Auswerten.' });
    }

    const userContent =
      `Hier sind die aktuellen Daten des Unternehmens als JSON. Erstelle das Briefing.\n\n` +
      JSON.stringify({ counts, steps, missions }, null, 2);

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: SYSTEM,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Anthropic error:', err);
      return json({ configured: true, error: 'KI-Dienst nicht erreichbar.' }, 502);
    }

    const data = await resp.json();
    const text: string = data?.content?.[0]?.text ?? '';

    let parsed: { summary?: string; risks?: string[]; actions?: string[] } = {};
    try {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : text);
    } catch {
      // Fallback: liefere den Rohtext als Summary, damit nichts verloren geht.
      parsed = { summary: text.trim(), risks: [], actions: [] };
    }

    return json({
      configured: true,
      summary: parsed.summary || '',
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 4) : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 4) : [],
    });
  } catch (err) {
    console.error('ai-arrival-briefing error:', err);
    return json({ configured: true, error: String(err) }, 500);
  }
});
