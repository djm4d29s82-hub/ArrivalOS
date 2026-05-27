/**
 * Pill — status indicator. Single visual language for all status displays.
 */
const TONES = {
  neutral: 'bg-cream-2 text-[var(--mid)] dark:bg-white/[0.08] dark:text-white/60',
  navy:    'bg-navy/8 text-navy dark:bg-white/[0.10] dark:text-white/75',
  gold:    'bg-gold/15 text-[#8a6818] dark:bg-gold/20 dark:text-[#d4a83a]',
  green:   'bg-green-50 text-green-800 dark:bg-green-500/15 dark:text-green-400',
  red:     'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  amber:   'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  blue:    'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  violet:  'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
};

const SIZES = {
  xs: 'text-[10px] px-1.5 py-0.5 gap-1',
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-[12px] px-2.5 py-1 gap-1.5',
};

export function Pill({ tone = 'neutral', size = 'sm', dot = false, icon: Icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${TONES[tone]} ${SIZES[size]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {Icon && <Icon className="w-3 h-3" strokeWidth={2.4} />}
      {children}
    </span>
  );
}

/**
 * Mission status → Pill tone mapping (single source of truth).
 */
export const STATUS_TONES = {
  pending: 'amber',
  open: 'amber',
  matched: 'blue',
  assigned: 'violet',
  in_progress: 'gold',
  completed: 'green',
  cancelled: 'red',
  arrived: 'green',
  delayed: 'red',
  online: 'green',
  offline: 'neutral',
  draft: 'neutral',
};

export const STATUS_LABELS_DE = {
  pending: 'Ausstehend',
  open: 'Offen',
  matched: 'Matched',
  assigned: 'Zugewiesen',
  in_progress: 'Läuft',
  completed: 'Abgeschlossen',
  cancelled: 'Abgesagt',
  arrived: 'Angekommen',
  delayed: 'Verzögert',
  online: 'Online',
  offline: 'Offline',
  draft: 'Entwurf',
};

export function StatusPill({ status, size = 'sm' }) {
  return (
    <Pill tone={STATUS_TONES[status] || 'neutral'} size={size} dot>
      {STATUS_LABELS_DE[status] || status}
    </Pill>
  );
}
