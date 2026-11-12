/** staleTime (ms) per kind of query. Dashboards match the backend's 30 s dashboard cache. */
export const STALE = {
    dashboard: 30_000,
    list: 30_000,
    detail: 60_000,
    reference: 5 * 60_000,
    blob: 5 * 60_000,
} as const;
