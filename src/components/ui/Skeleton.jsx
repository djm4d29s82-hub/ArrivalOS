/**
 * Skeleton — placeholder shapes during data loading.
 */
export function Skeleton({ className = '', circle = false }) {
  return (
    <div
      className={`bg-gradient-to-r from-black/5 via-black/[0.08] to-black/5 dark:from-white/[0.04] dark:via-white/[0.07] dark:to-white/[0.04] bg-[length:200%_100%] animate-shimmer ${circle ? 'rounded-full' : 'rounded-md'} ${className}`}
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`}
      style={{ background: 'var(--ds-card)', border: '1px solid var(--ds-card-border)' }}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10" circle />
        <div className="flex-1">
          <Skeleton className="h-3.5 w-1/2 mb-2" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={2} className="mt-4" />
    </div>
  );
}

export function SkeletonRow({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 px-5 py-4 ${className}`}>
      <Skeleton className="w-9 h-9" circle />
      <div className="flex-1">
        <Skeleton className="h-3 w-2/3 mb-1.5" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  );
}
