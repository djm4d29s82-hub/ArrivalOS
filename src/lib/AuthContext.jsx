import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { setSentryUser } from '@/lib/sentry';

const AuthContext = createContext(null);

// Boot-Failsafe: ein hängender Supabase-Aufruf (alter SW, navigator.locks etc.) darf den
// App-Start nicht ewig blockieren. Nach `ms` wird mit `fallback` aufgelöst.
function withTimeout(promise, ms = 8000, fallback = null) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [publicSettings, setPublicSettings] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await withTimeout(base44.entities.Settings.filter({ key: 'public' }), 8000, []);
        const s = Array.isArray(rows) ? rows[0] : null;
        setPublicSettings(s?.value || null);
      } catch (e) {
        setPublicSettings(null);
      } finally {
        setIsLoadingPublicSettings(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await withTimeout(base44.auth.me(), 8000, null);
        setUser(me);
        setSentryUser(me);
      } catch (e) {
        setAuthError({ type: 'auth_required' });
      } finally {
        setIsLoadingAuth(false);
      }
    })();
  }, []);

  // Keep user/role in sync with Supabase auth events (magic-link redirect, token refresh,
  // cross-tab sign-out). Guarded: the localStorage mock has no onChange.
  useEffect(() => {
    if (typeof base44.auth?.onChange !== 'function') return undefined;
    const unsub = base44.auth.onChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSentryUser(null);
        return;
      }
      try {
        const me = await base44.auth.me();
        setUser(me);
        setSentryUser(me);
      } catch {
        setUser(null);
      }
    });
    return () => { try { unsub?.(); } catch { /* noop */ } };
  }, []);

  const login = useCallback(async (email) => {
    const u = await base44.auth.login(email);
    setUser(u);
    setSentryUser(u);
    return u;
  }, []);

  const loginWithPassword = useCallback(async (email, password) => {
    const u = await base44.auth.loginWithPassword(email, password);
    setUser(u);
    setSentryUser(u);
    return u;
  }, []);

  const switchRole = useCallback(async (role) => {
    const u = await base44.auth.switchRole(role);
    setUser(u);
    setSentryUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await base44.auth.logout();
    setUser(null);
    setSentryUser(null);
  }, []);

  const navigateToLogin = useCallback(() => {
    window.location.hash = '#/';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        publicSettings,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        login,
        loginWithPassword,
        switchRole,
        logout,
        navigateToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
