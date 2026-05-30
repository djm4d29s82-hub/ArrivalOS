import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * BottomSheet — mobile-native action surface. Slides up from the bottom on small screens,
 * falls back to centered dialog on tablet+.
 */
export function BottomSheet({ open, onClose, title, description, children, footer, maxHeight = '80vh' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy/35 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(16,24,40,.25)] flex flex-col"
        style={{ maxHeight, background: 'var(--ds-card)' }}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden pt-2.5 pb-1 grid place-items-center">
          <div className="w-9 h-1 rounded-full bg-black/15" />
        </div>

        {(title || description) && (
          <div className="px-5 pt-3 pb-3 sm:pt-5 flex items-start justify-between gap-3"
            style={{ borderBottom: '1px solid var(--ds-card-border)' }}>
            <div className="min-w-0">
              {title && <div className="font-semibold text-[15px]" style={{ color: 'var(--ds-t1)' }}>{title}</div>}
              {description && <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ds-t2)' }}>{description}</div>}
            </div>
            <button onClick={onClose} className="w-8 h-8 -mr-1 rounded-lg grid place-items-center shrink-0 transition"
              style={{ color: 'var(--ds-t2)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-card-border)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-5 pb-[max(env(safe-area-inset-bottom),20px)]">
          {children}
        </div>

        {footer && (
          <div className="px-5 py-4 pb-[max(env(safe-area-inset-bottom),16px)]"
            style={{ borderTop: '1px solid var(--ds-card-border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
