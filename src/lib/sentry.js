// Sentry — Error-Tracking + Performance.
// Aktiviert sich nur wenn VITE_SENTRY_DSN gesetzt ist.
// Setzt User-Context automatisch nach Login.

import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.VITE_SENTRY_ENV || (import.meta.env.PROD ? 'production' : 'development');

export const SENTRY_ENABLED = !!DSN;

export function initSentry() {
  if (!SENTRY_ENABLED) return;
  Sentry.init({
    dsn: DSN,
    environment: ENV,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,        // keine User-Texte ans Sentry senden (DSGVO)
        blockAllMedia: true,
        maskAllInputs: true,
      }),
    ],
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,     // nur bei Errors
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // PII-Filter: Email aus URLs/Tags entfernen
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/email=[^&]+/gi, 'email=[redacted]');
      }
      return event;
    },
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
    ],
  });
  if (typeof window !== 'undefined') {
    console.info(`[ArrivalOS] Sentry: ${ENV}`);
  }
}

export function setSentryUser(user) {
  if (!SENTRY_ENABLED) return;
  if (!user) { Sentry.setUser(null); return; }
  Sentry.setUser({
    id: user.id,
    role: user.role,
    // Email/Name bewusst NICHT mitschicken (DSGVO)
  });
}

export const SentryErrorBoundary = SENTRY_ENABLED
  ? Sentry.ErrorBoundary
  : ({ children, fallback }) => children;
