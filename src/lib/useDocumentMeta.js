import { useEffect } from 'react';

// Lightweight document meta updater — keine react-helmet-Dependency.
// Setzt Title + Description nur per <head>-Update; SEO-Crawler sehen das (CSR-Render).
export function useDocumentMeta({ title, description }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute('name', 'description');
        document.head.appendChild(m);
      }
      m.setAttribute('content', description);
    }
  }, [title, description]);
}
