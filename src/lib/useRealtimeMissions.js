// useRealtimeMissions — Live-Mission-Status mit Supabase Realtime,
// Fallback: Polling alle 6 s (localStorage-Modus).
//
// Damit Greeter, Talent und Admin in Echtzeit sehen, wenn sich
// status / greeter_stage / eta_at / checked_in_at ändern.

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const Mission = base44.entities.Mission;
const isSupabase = !!base44.raw;

export function useRealtimeMissions({ id } = {}) {
  const qc = useQueryClient();

  const single = useQuery({
    queryKey: ['mission', id],
    enabled: !!id,
    queryFn: () => Mission.get(id),
    refetchInterval: isSupabase ? false : 6000,
  });

  const list = useQuery({
    queryKey: ['missions'],
    queryFn: () => Mission.list('-datetime'),
    refetchInterval: isSupabase ? false : 6000,
    staleTime: isSupabase ? Infinity : 0,
  });

  useEffect(() => {
    if (!isSupabase) return;
    const channel = base44.raw
      .channel('missions-stream')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'missions' },
        (payload) => {
          qc.invalidateQueries({ queryKey: ['missions'] });
          if (payload.new?.id) qc.invalidateQueries({ queryKey: ['mission', payload.new.id] });
        },
      )
      .subscribe();
    return () => { base44.raw.removeChannel(channel); };
  }, [qc]);

  return { mission: single.data, missions: list.data || [], isLoading: single.isLoading || list.isLoading };
}
