import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Dialog({ open, onOpenChange, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onOpenChange?.(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/35 backdrop-blur-[2px] p-4 animate-fade-in">
      <div className="absolute inset-0" onClick={() => onOpenChange?.(false)} />
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children, className = '' }) {
  return (
    <div
      className={`w-full rounded-2xl shadow-[0_24px_64px_-16px_rgba(16,24,40,.30)] flex flex-col max-h-[90vh] overflow-y-auto ${className}`}
      style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-6 py-6 space-y-4">{children}</div>
    </div>
  );
}

export function DialogHeader({ children }) {
  return <div className="space-y-1">{children}</div>;
}

export function DialogTitle({ children, className = '' }) {
  return <h2 className={`font-serif text-[20px] font-bold leading-tight ${className}`} style={{ color: 'var(--ds-t1)' }}>{children}</h2>;
}

export function DialogDescription({ children }) {
  return <p className="text-[13px] text-[var(--mid)]">{children}</p>;
}

export function Label({ children, htmlFor, className = '' }) {
  return (
    <label htmlFor={htmlFor} className={`block text-[12.5px] font-semibold ${className}`} style={{ color: 'var(--ds-t2)' }}>
      {children}
    </label>
  );
}
