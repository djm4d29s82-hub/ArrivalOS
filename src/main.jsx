import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initSentry } from '@/lib/sentry';
import { validateEnv, getEnvSummary } from '@/lib/envGuard';

const root = ReactDOM.createRoot(document.getElementById('root'));

try {
  // Fail fast in production if required env vars are missing.
  validateEnv();
  initSentry();
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  // Misconfigured deploy — show a clear diagnostic instead of a blank white page.
  let summary = null;
  try { summary = getEnvSummary(); } catch { /* noop */ }
  root.render(
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0d1420', color: '#f0ebe0', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 540 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c49228', fontWeight: 700, marginBottom: 14 }}>Konfiguration unvollständig</div>
        <h1 style={{ fontSize: 26, margin: '0 0 14px', fontWeight: 700 }}>Arrival Germany kann nicht starten</h1>
        <p style={{ color: 'rgba(240,235,224,0.72)', lineHeight: 1.65, margin: '0 0 18px' }}>{String(err?.message || err)}</p>
        <p style={{ color: 'rgba(240,235,224,0.5)', fontSize: 13.5, lineHeight: 1.65 }}>
          Bitte <code>VITE_SUPABASE_URL</code> und <code>VITE_SUPABASE_ANON_KEY</code> in den
          Environment-Variablen des Hosts setzen und neu deployen.
        </p>
        {summary && (
          <pre style={{ marginTop: 18, fontSize: 11, color: 'rgba(240,235,224,0.4)', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(summary, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
