import { Skeleton } from '@/components/ui/skeleton';

export function LoadingState({
  variant = 'page',
  rows = 5,
}: {
  variant?: 'page' | 'table' | 'card' | 'form';
  rows?: number;
}) {
  const n = variant === 'card' ? 3 : rows;
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-3">
      <span className="sr-only">Loading</span>
      {variant === 'page' && <Skeleton className="h-8 w-1/3" />}
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className={variant === 'form' ? 'h-10 w-full' : 'h-12 w-full'} />
      ))}
    </div>
  );
}
