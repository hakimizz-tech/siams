import type { RouteObject } from 'react-router-dom';

/** Shown while the first (lazy) route loads, instead of a blank page. */
export function HydrateFallback() {
  return (
    <div role="status" aria-live="polite" className="p-6 text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

/** Wraps a route tree in a pathless root route that carries the fallback. Paths are unchanged. */
// eslint-disable-next-line react-refresh/only-export-components
export function withHydrateFallback(routes: RouteObject[]): RouteObject[] {
  return [{ HydrateFallback, children: routes }];
}
