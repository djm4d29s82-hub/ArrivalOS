// Sentry — Error-Tracking + Performance.
// Aktiviert sich nur wenn VITE_SENTRY_DSN gesetzt ist.
// Setzt User-Context automatisch nach Login.

import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.VITE_SENTRY_ENV || (import.meta.env.PROD ? 'production' : 'development');

export const SENTRY_ENABLED = !!DSN;

// Redact sensitive query params from any URL string before it reaches Sentry.
// Covers invite tokens (account-takeover vector), emails (PII) and OAuth codes.
const SENSITIVE_PARAMS = /(?:token|email|code|access_token|refresh_token)=[^&#]+/gi;
function scrubUrl(u) {
  return typeof u === 'string' ? u.replace(SENSITIVE_PARAMS, (m) => `${m.split('=')[0]}=[redacted]`) : u;
}

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
      // PII/Secret-Filter: token/email/code aus jeder URL entfernen, die Sentry serialisiert
      // (request.url, Referer-Header UND Navigation/Fetch/XHR-Breadcrumbs).
      if (event.request?.url) event.request.url = scrubUrl(event.request.url);
      const h = event.request?.headers;
      if (h) { if (h.Referer) h.Referer = scrubUrl(h.Referer); if (h.referer) h.referer = scrubUrl(h.referer); }
      if (Array.isArray(event.breadcrumbs)) {
        for (const b of event.breadcrumbs) {
          if (!b?.data) continue;
          if (b.data.url) b.data.url = scrubUrl(b.data.url);
          if (b.data.to) b.data.to = scrubUrl(b.data.to);
          if (b.data.from) b.data.from = scrubUrl(b.data.from);
        }
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
