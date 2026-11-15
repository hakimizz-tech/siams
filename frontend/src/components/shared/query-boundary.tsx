import type { ReactNode } from 'react';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';

interface QueryLike<T> {
  data?: T;
  isPending: boolean;
  error: unknown;
  refetch: () => unknown;
}

export function QueryBoundary<T>({
  query,
  loading,
  empty,
  emptyState,
  children,
}: {
  query: QueryLike<T>;
  loading?: ReactNode;
  empty?: (data: T) => boolean;
  emptyState?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <>{loading ?? <LoadingState />}</>;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const data = query.data as T;
  if (empty?.(data)) return <>{emptyState ?? <EmptyState title="Nothing here yet" />}</>;
  return <>{children(data)}</>;
}
