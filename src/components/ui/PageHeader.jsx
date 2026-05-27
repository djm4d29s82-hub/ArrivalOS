/**
 * PageHeader — consistent screen headline with optional eyebrow/actions.
 */
export function PageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <div className={`flex items-end justify-between gap-6 flex-wrap ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-gold font-bold mb-2">{eyebrow}</div>
        )}
        <h1 className="font-serif text-[28px] md:text-[34px] leading-[1.1] font-bold" style={{ color: 'var(--ds-t1)' }}>{title}</h1>
        {description && (
          <p className="text-[14px] text-[var(--mid)] mt-2 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/**
 * SectionHeader — secondary headline between blocks on the same page.
 */
export function SectionHeader({ title, count, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <div className="flex items-baseline gap-2">
        <h2 className="font-semibold text-[15px]" style={{ color: 'var(--ds-t1)' }}>{title}</h2>
        {count !== undefined && (
          <span className="text-[12px] text-[var(--light)] tabular-nums">{count}</span>
        )}
      </div>
      {action}
    </div>
  );
}
