import { forwardRef } from 'react';
import { Search } from 'lucide-react';

/**
 * Input — premium text input with optional icon.
 */
export const Input = forwardRef(function Input(
  { icon: Icon, className = '', size = 'md', ...rest }, ref,
) {
  const sizes = {
    sm: 'h-8 text-[12.5px]',
    md: 'h-10 text-[13.5px]',
    lg: 'h-12 text-[14px]',
  };
  return (
    <div className={`relative ${className}`}>
      {Icon && (
        <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--light)] pointer-events-none" />
      )}
      <input
        ref={ref}
        className={`${sizes[size]} ${Icon ? 'pl-9' : 'pl-3.5'} pr-3.5 w-full ds-input rounded-lg transition-all placeholder:text-[var(--ds-t3)]`}
        style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
        {...rest}
      />
    </div>
  );
});

/**
 * SearchInput — convenience pre-iconed input.
 */
export function SearchInput(props) {
  return <Input icon={Search} placeholder="Suchen…" {...props} />;
}

/**
 * Select — styled native select.
 */
export function Select({ size = 'md', className = '', children, ...rest }) {
  const sizes = { sm: 'h-8 text-[12.5px]', md: 'h-10 text-[13.5px]', lg: 'h-12 text-[14px]' };
  return (
    <select
      className={`${sizes[size]} px-3 pr-8 ds-input rounded-lg transition cursor-pointer ${className}`}
      style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
      {...rest}
    >
      {children}
    </select>
  );
}

/**
 * Textarea — styled textarea with consistent borders.
 */
export const Textarea = forwardRef(function Textarea({ className = '', rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`w-full px-3.5 py-2.5 ds-input rounded-lg transition placeholder:text-[var(--ds-t3)] text-[13.5px] leading-relaxed resize-none ${className}`}
      style={{ background: 'var(--ds-input)', border: '1px solid var(--ds-input-border)', color: 'var(--ds-t1)' }}
      {...rest}
    />
  );
});

/**
 * Field — labelled wrapper.
 */
export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block text-[11px] uppercase tracking-[0.12em] text-[var(--mid)] font-semibold mb-1.5">{label}</span>
      )}
      {children}
      {hint && !error && <span className="block text-[11.5px] text-[var(--light)] mt-1.5">{hint}</span>}
      {error && <span className="block text-[11.5px] text-red-600 mt-1.5">{error}</span>}
    </label>
  );
}
