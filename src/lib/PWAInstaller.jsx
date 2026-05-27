import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

/**
 * PWA: registriert Service Worker und zeigt einen dezenten Install-Banner,
 * wenn der Browser `beforeinstallprompt` feuert (Chrome/Edge/Android).
 * iOS: kein Prompt, dafür Hinweis „Zum Home-Bildschirm hinzufügen" via Share-Menü.
 */
export default function PWAInstaller() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      if (!sessionStorage.getItem('arrivalos-pwa-dismissed')) {
        setVisible(true);
      }
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS-Detection: kein beforeinstallprompt, manueller Hinweis
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isIOS && !isStandalone && !sessionStorage.getItem('arrivalos-pwa-dismissed')) {
      setTimeout(() => setIosHint(true), 8000);
    }

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  const dismiss = () => {
    sessionStorage.setItem('arrivalos-pwa-dismissed', '1');
    setVisible(false);
    setIosHint(false);
  };

  if (!visible && !iosHint) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[100]">
      <div className="bg-navy text-cream rounded-xl shadow-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-gold/15 grid place-items-center shrink-0">
          <Download className="w-4 h-4 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[14px] font-semibold">ArrivalOS als App installieren</div>
          {visible && deferred && (
            <p className="text-[12px] text-cream/70 mt-1 leading-relaxed">
              Schneller Zugriff auf dein Onboarding — direkt vom Home-Bildschirm.
            </p>
          )}
          {iosHint && (
            <p className="text-[12px] text-cream/70 mt-1 leading-relaxed">
              Tippe auf <strong>Teilen</strong> und dann „Zum Home-Bildschirm".
            </p>
          )}
          <div className="flex gap-2 mt-3">
            {visible && deferred && (
              <button onClick={install} className="bg-gold text-navy px-3 py-1.5 rounded-md text-[12px] font-semibold hover:bg-gold-2 transition">
                Installieren
              </button>
            )}
            <button onClick={dismiss} className="text-[12px] text-cream/60 hover:text-cream transition">
              Später
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Schließen" className="text-cream/40 hover:text-cream transition shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
