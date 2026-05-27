import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/toaster';
import { Star, Award, MapPin, Save } from 'lucide-react';

export default function GreeterProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: '', city: '', languages: '', availability: 'flexible', bio: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.GreeterProfile.filter({ email: user.email }).then((p) => {
      const pr = p[0];
      setProfile(pr);
      if (pr) {
        setForm({
          full_name: pr.full_name || '',
          city: pr.city || '',
          languages: (pr.languages || []).join(', '),
          availability: pr.availability || 'flexible',
          bio: pr.bio || '',
        });
      }
    });
  }, [user?.email]);

  const save = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    const updated = await base44.entities.GreeterProfile.update(profile.id, {
      full_name: form.full_name,
      city: form.city,
      languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
      availability: form.availability,
      bio: form.bio,
    });
    setProfile(updated);
    setBusy(false);
    toast({ title: 'Profil gespeichert' });
  };

  if (!profile) return <div className="p-8 text-sm text-[var(--mid)]">Profil wird geladen…</div>;

  const inp = 'w-full px-3.5 py-2 rounded-md text-sm focus:outline-none focus:border-gold';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold" style={{ color: 'var(--ds-t1)' }}>Mein Profil</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--ds-t2)' }}>Halte dein Profil aktuell — bessere Matches.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Star} label="Bewertung" value={profile.rating?.toFixed(1) || '—'} />
        <Stat icon={Award} label="Einsätze" value={profile.completed_missions || 0} />
        <Stat icon={MapPin} label="Stadt" value={profile.city} />
      </div>

      <form onSubmit={save} className="rounded-xl p-6 space-y-4" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <Field label="Name"><input className={inp} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
        <Field label="Stadt">
          <select className={inp} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
            {['München', 'Berlin', 'Hamburg', 'Köln', 'Frankfurt', 'Stuttgart'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Sprachen (kommagetrennt)"><input className={inp} value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} /></Field>
        <Field label="Verfügbarkeit">
          <select className={inp} value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}>
            <option value="flexible">flexibel</option>
            <option value="weekends">Wochenenden</option>
            <option value="evenings">Abends</option>
            <option value="mornings">Vormittags</option>
          </select>
        </Field>
        <Field label="Über mich"><textarea rows="4" className={inp} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Was macht dich zum perfekten Greeter?" /></Field>
        <button type="submit" disabled={busy} className="btn-primary inline-flex items-center gap-2"><Save className="w-4 h-4" /> {busy ? 'Speichern…' : 'Speichern'}</button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ds-t2)' }}>{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
      <div className="w-10 h-10 rounded-lg grid place-items-center" style={{ background: 'rgba(196,146,40,0.10)' }}>
        <Icon className="w-4 h-4" style={{ color: '#c49228' }} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ds-t3)' }}>{label}</div>
        <div className="font-serif text-xl font-bold" style={{ color: 'var(--ds-t1)' }}>{value}</div>
      </div>
    </div>
  );
}
