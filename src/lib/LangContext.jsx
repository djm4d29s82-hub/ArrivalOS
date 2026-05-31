import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translate, LANGS } from '@/lib/i18n';

const LangCtx = createContext({ lang: 'de', setLang: () => {}, toggle: () => {}, t: (k) => k });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('arrival-lang');
    return LANGS.includes(saved) ? saved : 'de';
  });

  useEffect(() => {
    localStorage.setItem('arrival-lang', lang);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const setLang = useCallback((l) => { if (LANGS.includes(l)) setLangState(l); }, []);
  const toggle = useCallback(() => setLangState((l) => (l === 'de' ? 'en' : 'de')), []);
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  return (
    <LangCtx.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LangCtx.Provider>
  );
}

export const useLang = () => useContext(LangCtx);
