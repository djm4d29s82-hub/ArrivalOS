import { forwardRef } from 'react';

/**
 * Card — Premium surface primitive.
 * Variants: default (subtle), elevated (more depth), glass, navy (dark on light).
 */
export const Card = forwardRef(function Card(
  { as: Tag = 'div', variant = 'default', interactive = false, className = '', children, ...rest },
  ref,
) {
  const base = 'rounded-2xl transition-all';
  const variants = {
    default: 'bg-white dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.06)] dark:shadow-none',
    elevated: 'bg-white dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.09] shadow-[0_8px_24px_-8px_rgba(16,24,40,.10),0_2px_6px_rgba(16,24,40,.04)] dark:shadow-none',
    glass: 'bg-white/70 dark:bg-white/[0.05] backdrop-blur-sm border border-white/40 dark:border-white/[0.10] dark:shadow-[0_8px_32px_rgba(0,0,0,.20)]',
    navy: 'bg-navy text-cream border border-white/10 shadow-[0_8px_24px_-8px_rgba(16,24,40,.30)]',
    flat: 'bg-cream-2/60 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]',
  };
  const hover = interactive
    ? 'hover:shadow-[0_20px_56px_-8px_rgba(16,24,40,.18),0_4px_16px_rgba(16,24,40,.08)] dark:hover:shadow-[0_20px_56px_rgba(0,0,0,.38),0_4px_16px_rgba(0,0,0,.20)] hover:-translate-y-[3px] hover:scale-[1.004] dark:hover:brightness-105 cursor-pointer'
    : '';
  return (
    <Tag ref={ref} className={`${base} ${variants[variant]} ${hover} ${className}`} {...rest}>
      {children}
    </Tag>
  );
});

export function CardHeader({ title, subtitle, action, icon: Icon, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 px-5 pt-5 pb-3 ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0"
            style={{ background: 'rgba(196,146,40,0.10)' }}>
            <Icon className="w-4 h-4" style={{ color: '#c49228' }} strokeWidth={2.2} />
          </div>
        )}
        <div className="min-w-0">
          {subtitle && <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--light)] font-semibold mb-0.5">{subtitle}</div>}
          <div className="font-semibold text-[15px] leading-tight truncate" style={{ color: 'var(--ds-t1)' }}>{title}</div>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className = '', children }) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}
