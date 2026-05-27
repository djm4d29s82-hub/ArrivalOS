/**
 * Avatar — initials-based avatar, used everywhere a person is rendered.
 */
const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-[13px]',
  lg: 'w-12 h-12 text-[15px]',
  xl: 'w-16 h-16 text-[18px]',
};

const PALETTE = [
  'bg-[#1a2340] text-cream',         // navy
  'bg-[#c49228] text-navy',          // gold
  'bg-[#2d5a2d] text-cream',         // forest
  'bg-[#8b3e3e] text-cream',         // wine
  'bg-[#3e5a8b] text-cream',         // blue
  'bg-[#6a3e8b] text-cream',         // purple
];

function hashIndex(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) % PALETTE.length;
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export function Avatar({ name, size = 'md', src, className = '', ringed = false }) {
  const color = PALETTE[hashIndex(name)];
  const ring = ringed ? 'ring-2 ring-white' : '';
  if (src) {
    return <img src={src} alt={name} className={`${SIZES[size]} rounded-full object-cover ${ring} ${className}`} />;
  }
  return (
    <div className={`${SIZES[size]} ${color} ${ring} ${className} rounded-full grid place-items-center font-semibold shrink-0 tracking-wide`}>
      {initials(name)}
    </div>
  );
}
