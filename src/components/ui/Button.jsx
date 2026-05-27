import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-navy text-cream hover:bg-navy-2 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(26,35,64,0.28)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.40)] active:bg-navy-3 active:translate-y-0 disabled:bg-navy/40',
  gold: 'bg-gold text-navy hover:bg-gold-2 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(196,146,40,0.38)] active:bg-gold-2 active:translate-y-0 disabled:bg-gold/40',
  outline: 'bg-transparent text-navy border border-navy/15 hover:border-navy/30 hover:bg-cream-2 dark:text-white/75 dark:border-white/15 dark:hover:border-white/25 dark:hover:bg-white/[0.07] disabled:opacity-40',
  ghost: 'bg-transparent text-navy hover:bg-cream-2 dark:text-white/65 dark:hover:bg-white/[0.07] disabled:opacity-40',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300',
};

const SIZES = {
  xs: 'h-7 px-2.5 text-[12px] gap-1 rounded-md',
  sm: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-md',
  md: 'h-10 px-4 text-[13.5px] gap-2 rounded-lg',
  lg: 'h-12 px-6 text-[14.5px] gap-2 rounded-xl',
};

/**
 * Button — single source of truth for all clickable actions.
 */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading = false, fullWidth = false, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all select-none disabled:cursor-not-allowed shrink-0 ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.4} />}
      {children}
      {IconRight && !loading && <IconRight className="w-3.5 h-3.5" strokeWidth={2.4} />}
    </button>
  );
});

/**
 * IconButton — square button for icon-only actions.
 */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, size = 'md', variant = 'ghost', label, className = '', ...rest },
  ref,
) {
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={`grid place-items-center rounded-lg transition ${VARIANTS[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      <Icon className="w-4 h-4" strokeWidth={2.2} />
    </button>
  );
});
