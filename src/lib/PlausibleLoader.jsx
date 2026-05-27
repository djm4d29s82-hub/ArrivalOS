import { useEffect } from 'react';
import { FEATURES } from '@/lib/siteConfig';

// Lädt Plausible cookieless nur wenn VITE_PLAUSIBLE_DOMAIN gesetzt ist.
// DSGVO-konform, kein Consent-Banner nötig (kein Cookie, kein Fingerprint).
export default function PlausibleLoader() {
  useEffect(() => {
    if (!FEATURES.plausibleDomain) return;
    if (document.querySelector('script[data-plausible]')) return;
    const s = document.createElement('script');
    s.defer = true;
    s.setAttribute('data-plausible', '');
    s.setAttribute('data-domain', FEATURES.plausibleDomain);
    s.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(s);
  }, []);
  return null;
}
