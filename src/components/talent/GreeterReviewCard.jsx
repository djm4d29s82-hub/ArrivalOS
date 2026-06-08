import { useEffect, useState } from 'react';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/LangContext';

/**
 * GreeterReviewCard — post-mission rating. Shows up when the talent has a COMPLETED mission
 * with a greeter that they haven't reviewed yet. Writes a real `reviews` row; the DB trigger
 * recomputes greeter_profiles.rating server-side (the talent can't update greeter rows under RLS).
 * Best-effort client recompute keeps localStorage/dev in sync. Renders nothing when there's
 * nothing to rate. Read it as: "the ★ everyone sees finally comes from real people."
 */
export default function GreeterReviewCard({ candidateId, createdBy }) {
  const { t } = useLang();
  const [target, setTarget] = useState(null); // { mission, greeter }
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!candidateId) return;
      try {
        const missions = await base44.entities.Mission.filter({ candidate_id: candidateId });
        const completed = (missions || []).filter((m) => m.status === 'completed' && m.greeter_id);
        if (!completed.length) return;
        let reviewed = new Set();
        try {
          const mine = await base44.entities.Review.filter({ candidate_id: candidateId });
          reviewed = new Set((mine || []).map((r) => r.mission_id));
        } catch { /* table optional */ }
        const m = completed.find((x) => !reviewed.has(x.id));
        if (!m) return;
        const greeter = await base44.entities.GreeterProfile.get(m.greeter_id).catch(() => null);
        if (!cancelled) setTarget({ mission: m, greeter });
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [candidateId]);

  if (!target || done) return null;

  const submit = async () => {
    if (!rating || busy) return;
    setBusy(true);
    try {
      await base44.entities.Review.create({
        mission_id: target.mission.id,
        greeter_id: target.mission.greeter_id,
        candidate_id: candidateId,
        company_id: target.mission.company_id || null,
        rating,
        comment: comment.trim() || null,
        created_by: createdBy || null,
      });
      // Best-effort client recompute (works in dev/localStorage; in Supabase the trigger does it).
      try {
        const all = await base44.entities.Review.filter({ greeter_id: target.mission.greeter_id });
        if (all?.length) {
          const avg = all.reduce((s, r) => s + (r.rating || 0), 0) / all.length;
          await base44.entities.GreeterProfile.update(target.mission.greeter_id, { rating: Math.round(avg * 10) / 10 });
        }
      } catch { /* RLS blocks talent in prod, trigger handles it */ }
      setDone(true);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="rounded-2xl p-5" style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
        <div className="font-serif text-[17px] font-bold" style={{ color: 'var(--ds-t1)' }}>{t('review.title')}</div>
        <div className="text-[12.5px] mt-1" style={{ color: 'var(--ds-t2)' }}>
          {target.greeter?.full_name ? `${target.greeter.full_name} · ` : ''}{t('review.sub')}
        </div>

        <div className="flex items-center gap-1.5 mt-4">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n;
            return (
              <button
                key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n}`}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star className="w-7 h-7" style={{ color: active ? '#c49228' : 'var(--ds-t3)' }} fill={active ? '#c49228' : 'none'} />
              </button>
            );
          })}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder={t('review.placeholder')}
          className="mt-3 w-full px-3 py-2.5 text-[13px] rounded-lg resize-none placeholder:text-[var(--ds-t3)]"
          style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
        />

        <button
          onClick={submit}
          disabled={!rating || busy}
          className="mt-3 inline-flex items-center gap-2 bg-navy text-cream px-4 py-2.5 rounded-lg text-[13px] font-semibold disabled:opacity-50 hover:bg-navy/90 transition"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {t('review.submit')}
        </button>
      </div>
    </section>
  );
}
