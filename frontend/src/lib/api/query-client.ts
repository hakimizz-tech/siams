import { QueryClient } from '@tanstack/react-query';
import { isApiError } from './errors';

/** Never retry 4xx (the answer will not change). Retry network and 5xx failures twice. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
    if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
    return failureCount < 2;
}

export function createQueryClient(overrides: { retry?: boolean } = {}): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: overrides.retry === false ? false : shouldRetry,
                staleTime: 30_000,
                gcTime: 5 * 60_000,
                refetchOnWindowFocus: true,
            },
            mutations: { retry: false }, // mutations are never retried automatically
        },
    });
}
