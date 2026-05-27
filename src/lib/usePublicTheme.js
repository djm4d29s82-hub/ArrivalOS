import { useEffect } from 'react';

/**
 * Public / marketing pages (Landing, legal, Login) render in the fixed light brand
 * palette — they must NOT follow the portal's dark/light preference (ThemeProvider).
 *
 * Forces data-theme="light" on <html> while mounted; restores the saved portal
 * preference on unmount (so navigating into the app honors the toggle again).
 *
 * The requestAnimationFrame re-assert wins over ThemeProvider's own mount effect on the
 * very first load: child effects run before the parent provider's effect, so a single
 * synchronous set would be clobbered — the rAF runs after passive effects, before paint.
 */
export function usePublicTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => root.setAttribute('data-theme', 'light');
    apply();
    const raf = requestAnimationFrame(apply);
    return () => {
      cancelAnimationFrame(raf);
      const saved = localStorage.getItem('arrival-theme');
      root.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
    };
  }, []);
}

export default usePublicTheme;
