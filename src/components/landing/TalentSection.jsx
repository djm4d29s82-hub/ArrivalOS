import { ShieldCheck, MessagesSquare, MapPinned, Users } from 'lucide-react';

const REASSURE = [
  { i: ShieldCheck, t: 'Ein bekannter Ansprechpartner', s: 'Ihr Greeter ist eine echte Person. Mit Namen, Foto, Telefonnummer.' },
  { i: MessagesSquare, t: 'In Ihrer Sprache', s: 'Greeter sprechen oft Ihre Muttersprache — oder wir matchen jemanden, der das tut.' },
  { i: MapPinned, t: 'Lokales Wissen', s: 'Wie funktioniert das Bürgeramt? Welche Bank ist anfängerfreundlich? Wir wissen es.' },
  { i: Users, t: 'Community von Anfang an', s: 'Greeter sind Brücken — zu Freunden, Vereinen, Alltag.' },
];

const STORIES = [
  { name: 'Amara', from: 'Lagos → München', role: 'Pflegefachkraft', quote: '„Ich hatte am dritten Tag schon ein Konto und eine SIM. Allein hätte ich Wochen gebraucht."' },
  { name: 'Rafael', from: 'Buenos Aires → Berlin', role: 'Software-Ingenieur', quote: '„Mein Greeter Tomás kam zum Bürgeramt mit. Ohne ihn wäre der Termin gescheitert."' },
  { name: 'Linh', from: 'Hanoi → Hamburg', role: 'Labortechnikerin', quote: '„Beim ersten Wochenende hat mich Anna zu einem vietnamesischen Café mitgenommen. Heimweh halbiert."' },
];

export default function TalentSection() {
  return (
    <section id="talente" className="py-24" style={{ background: 'var(--ds-bg)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-0.5 bg-gold" />
          <span className="text-[11px] tracking-widest uppercase text-gold font-bold">Für Talente</span>
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight max-w-3xl" style={{ color: 'var(--ds-t1)' }}>
          Du landest. Wir holen dich ab. Wirklich.
        </h2>
        <p className="text-[var(--mid)] mt-5 max-w-2xl leading-relaxed">
          Internationaler Job-Wechsel ist mehr als ein Vertrag. Es ist eine neue Sprache, neue Behörden, ein neues Leben.
          Arrival Germany sorgt dafür, dass du nicht allein bist — vom Flughafen bis zum ersten Geburtstag in Deutschland.
        </p>

        <div className="grid md:grid-cols-4 gap-4 mt-14">
          {REASSURE.map((r) => (
            <div key={r.t} className="rounded-2xl p-6 transition" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
              <div className="w-10 h-10 rounded-lg bg-gold/10 grid place-items-center mb-4">
                <r.i className="w-4 h-4 text-gold" />
              </div>
              <div className="font-semibold text-[14.5px]" style={{ color: 'var(--ds-t1)' }}>{r.t}</div>
              <div className="text-[12.5px] text-[var(--mid)] mt-1.5 leading-relaxed">{r.s}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-16">
          {STORIES.map((s, i) => (
            <div key={s.name} className="p-5 pb-6 rounded-2xl" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)', transform: `rotate(${[-1.5, 0.8, -0.6][i]}deg)` }}>
              <div className="aspect-[5/4] rounded-sm mb-4 grid place-items-center" style={{ background: 'var(--ds-input)' }}>
                <div className="w-20 h-20 rounded-full bg-gold/20 grid place-items-center">
                  <span className="font-serif text-3xl font-bold" style={{ color: 'var(--ds-t1)' }}>{s.name[0]}</span>
                </div>
              </div>
              <div className="font-serif text-lg font-bold" style={{ color: 'var(--ds-t1)' }}>{s.name}</div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--light)]">{s.from} · {s.role}</div>
              <div className="font-serif italic text-[13.5px] text-[var(--mid)] mt-3 leading-relaxed">{s.quote}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
