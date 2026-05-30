import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';
  return date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function relativeTime(d) {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  return `vor ${Math.floor(diff / 86400)} Tagen`;
}

export function uid() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

/**
 * Relative due-date label for a scheduled journey step (German).
 * "heute" / "morgen" / "in N Tagen" / "gestern fällig" / "N Tage überfällig".
 * Returns '' when no date is set, so callers can conditionally render.
 */
export function relativeStepDate(scheduledAt) {
  if (!scheduledAt) return '';
  const date = new Date(scheduledAt);
  if (isNaN(date)) return '';
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
  if (diff === 0) return 'heute';
  if (diff === 1) return 'morgen';
  if (diff > 1) return `in ${diff} Tagen`;
  if (diff === -1) return 'gestern fällig';
  return `${Math.abs(diff)} Tage überfällig`;
}

export const STATUS_COLORS = {
  open:        'bg-navy/10 text-navy dark:bg-white/[0.08] dark:text-white/70',
  matched:     'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  assigned:    'bg-gold/20 text-gold',
  in_progress: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  completed:   'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  cancelled:   'bg-red-500/15 text-red-700 dark:text-red-400',
};

export const STATUS_LABELS = {
  open: 'Offen',
  matched: 'Gematcht',
  assigned: 'Zugewiesen',
  in_progress: 'Läuft',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
};
