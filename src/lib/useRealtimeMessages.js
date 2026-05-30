// useRealtimeMessages — Live-Messages mit Supabase Realtime,
// Fallback: React-Query Invalidation alle 5 s (localStorage-Modus).
//
// Vorteile:
//  - Identischer Hook in beiden Modi
//  - Unread-Counter automatisch
//  - Auto-Mark-Read sobald Thread sichtbar
//
// Usage:
//   const { messages, unreadByMission, markRead, send } = useRealtimeMessages({ missionId });

import { useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const Message = base44.entities.Message;
const isSupabase = !!base44.raw;

export function useRealtimeMessages({ missionId } = {}) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => Message.list('timestamp'),
    refetchInterval: isSupabase ? false : 5000, // Polling-Fallback nur im Demo-Modus
    staleTime: isSupabase ? Infinity : 0,
  });

  // Unique channel topic per hook instance — supabase-js dedupes channels by topic, so a fixed
  // name would return an already-subscribed channel to a second mounting instance (e.g. layout
  // unread badge + a thread panel), and chaining .on() after .subscribe() throws.
  const channelId = useMemo(() => `messages-stream-${Math.random().toString(36).slice(2)}`, []);

  // Supabase Realtime: bei jedem INSERT/UPDATE auf messages → Cache invalidieren
  useEffect(() => {
    if (!isSupabase) return;
    const channel = base44.raw
      .channel(channelId)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => qc.invalidateQueries({ queryKey: ['messages'] }),
      )
      .subscribe();
    return () => { base44.raw.removeChannel(channel); };
  }, [qc, channelId]);

  const thread = useMemo(
    () => (missionId ? messages.filter((m) => m.mission_id === missionId) : messages),
    [messages, missionId],
  );

  const unreadByMission = useMemo(() => {
    const map = {};
    for (const m of messages) {
      if (m.read) continue;
      if (m.sender_id === user?.id) continue; // eigene Nachrichten nie unread
      map[m.mission_id] = (map[m.mission_id] || 0) + 1;
    }
    return map;
  }, [messages, user?.id]);

  const totalUnread = useMemo(
    () => Object.values(unreadByMission).reduce((a, b) => a + b, 0),
    [unreadByMission],
  );

  const markRead = useCallback(async (mid = missionId) => {
    if (!mid) return;
    const unread = messages.filter((m) => m.mission_id === mid && !m.read && m.sender_id !== user?.id);
    if (unread.length === 0) return;
    await Promise.all(unread.map((m) => Message.update(m.id, { read: true })));
    qc.invalidateQueries({ queryKey: ['messages'] });
  }, [messages, missionId, user?.id, qc]);

  const send = useCallback(async ({ content, receiverId, missionId: mid }) => {
    const payload = {
      sender_id: user?.id,
      sender_name: user?.full_name || user?.email || 'User',
      receiver_id: receiverId || 'all',
      mission_id: mid || missionId,
      content: content.trim(),
      read: false,
      timestamp: new Date().toISOString(),
    };
    const created = await Message.create(payload);
    if (!isSupabase) {
      // im Demo-Modus optimistisch updaten
      qc.invalidateQueries({ queryKey: ['messages'] });
    }
    return created;
  }, [user, missionId, qc]);

  return { messages, thread, unreadByMission, totalUnread, markRead, send };
}
