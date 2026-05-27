import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, ...t }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), t.duration || 3500);
  }, []);
  window.__toast = push;
  return (
    <ToastCtx.Provider value={{ toast: push }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[999] flex flex-col gap-2 max-w-sm">
        {items.map((t) => {
          const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'error' ? AlertCircle : Info;
          const iconColor = t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : '#c49228';
          return (
            <div key={t.id} className="rounded-xl shadow-s2 px-4 py-3 flex items-start gap-3 animate-fade-in"
              style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
              <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: iconColor }} />
              <div className="flex-1 min-w-0">
                {t.title && <div className="font-medium text-sm" style={{ color: 'var(--ds-t1)' }}>{t.title}</div>}
                {t.description && <div className="text-xs mt-0.5" style={{ color: 'var(--ds-t2)' }}>{t.description}</div>}
              </div>
              <button onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}
                style={{ color: 'var(--ds-t3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ds-t1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ds-t3)'; }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  return ctx || { toast: (t) => window.__toast?.(t) };
}

export function Toaster() {
  // Toaster is rendered by ToastProvider; mount as no-op wrapper if not wrapped.
  return null;
}

export function toast(t) {
  window.__toast?.(t);
}
