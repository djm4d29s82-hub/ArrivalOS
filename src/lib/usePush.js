import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

// Public VAPID key (NOT secret — safe in the frontend). Override via VITE_VAPID_PUBLIC_KEY.
// Matches the VAPID_PRIVATE_KEY the send-push edge function uses.
const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BFvsp99YyFpw1CzGQmG0XfRGitqpcvQFrfRYaREB5q8RBML7naLzyGbRJc1gqpARWxatEZr9-J8wUsLShgxFDsE';

const SUPPORTED = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function urlB64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * usePush — opt-in Web Push. Subscribes the browser, stores the subscription against the user's email
 * (push_subscriptions). The send-push edge function then delivers every in-app notification as a push.
 * Returns { supported, status: 'on'|'off'|'denied'|'busy', enable, disable }.
 */
export function usePush() {
  const { user } = useAuth();
  const [status, setStatus] = useState('off');

  useEffect(() => {
    if (!SUPPORTED) return;
    if (Notification.permission === 'denied') { setStatus('denied'); return; }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? 'on' : 'off'))
      .catch(() => {});
  }, []);

  const enable = useCallback(async () => {
    if (!SUPPORTED || !user?.email) return;
    setStatus('busy');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus(perm === 'denied' ? 'denied' : 'off'); return; }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) });
      }
      const json = sub.toJSON();
      await base44.entities.PushSubscription.create({ user_email: user.email, endpoint: sub.endpoint, subscription: json });
      setStatus('on');
    } catch (e) {
      console.error('push enable failed', e);
      setStatus('off');
    }
  }, [user?.email]);

  const disable = useCallback(async () => {
    if (!SUPPORTED) return;
    setStatus('busy');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        try {
          const rows = await base44.entities.PushSubscription.filter({ endpoint: sub.endpoint });
          for (const r of rows || []) await base44.entities.PushSubscription.delete(r.id);
        } catch { /* best-effort cleanup */ }
        await sub.unsubscribe();
      }
      setStatus('off');
    } catch (e) {
      console.error('push disable failed', e);
      setStatus('on');
    }
  }, []);

  return { supported: SUPPORTED, status, enable, disable };
}
