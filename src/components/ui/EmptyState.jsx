/**
 * EmptyState — replaces sad "no data" rows everywhere.
 */
export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center text-center px-6 py-14 ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl grid place-items-center mb-4"
          style={{ background: 'var(--ds-card-border)' }}>
          <Icon className="w-5 h-5" style={{ color: 'var(--ds-t3)' }} strokeWidth={1.8} />
        </div>
      )}
      <div className="font-semibold text-[15px]" style={{ color: 'var(--ds-t1)' }}>{title}</div>
      {description && <div className="text-[13px] text-[var(--mid)] mt-1.5 max-w-xs leading-relaxed">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
