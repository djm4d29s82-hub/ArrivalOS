import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal — centered dialog. For mobile-heavy actions, prefer BottomSheet.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
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

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-3xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/35 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${sizes[size]} rounded-2xl shadow-[0_24px_64px_-16px_rgba(16,24,40,.30)] flex flex-col max-h-[90vh]`}
        style={{ background: 'var(--ds-card)' }}
      >
        {(title || description) && (
          <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3"
            style={{ borderBottom: '1px solid var(--ds-card-border)' }}>
            <div className="min-w-0">
              {title && <div className="font-serif text-[20px] font-bold" style={{ color: 'var(--ds-t1)' }}>{title}</div>}
              {description && <div className="text-[13px] mt-1" style={{ color: 'var(--ds-t2)' }}>{description}</div>}
            </div>
            <button onClick={onClose} className="w-8 h-8 -mr-1 rounded-lg grid place-items-center shrink-0 transition"
              style={{ color: 'var(--ds-t2)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-card-border)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 flex justify-end gap-2"
            style={{ borderTop: '1px solid var(--ds-card-border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
