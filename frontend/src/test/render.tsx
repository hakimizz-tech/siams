import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { createQueryClient } from '@/lib/api/query-client';
import { AuthContext, type AuthContextValue } from '@/lib/auth/auth-context';
import type { Role, User } from '@/types/domain';
import { user as makeUser } from './msw/data';

export interface RenderOptions {
    role?: Role;
    user?: User;
    signedIn?: boolean;
    route?: string;
    queryClient?: QueryClient;
}

export function createAuthValue(options: RenderOptions = {}): AuthContextValue {
    const signedIn = options.signedIn ?? true;
    const user = signedIn ? (options.user ?? makeUser(options.role ?? 'STUDENT')) : null;
    return {
        status: signedIn ? 'authenticated' : 'anonymous',
        user,
        login: vi.fn(async () => user as User),
        logout: vi.fn(async () => undefined),
        reloadUser: vi.fn(async () => undefined),
    };
}

/** Renders `ui` with a fresh QueryClient (no retries), a router and a signed-in test user. */
export function renderWithProviders(
    ui: ReactElement,
    options: RenderOptions = {},
): RenderResult & { queryClient: QueryClient; auth: AuthContextValue } {
    const queryClient = options.queryClient ?? createQueryClient({ retry: false });
    const auth = createAuthValue(options);
    const result = render(ui, {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
                <AuthContext.Provider value={auth}>
                    <MemoryRouter initialEntries={[options.route ?? '/']}>{children}</MemoryRouter>
                </AuthContext.Provider>
            </QueryClientProvider>
        ),
    });
    return { ...result, queryClient, auth };
}

/** Wrapper for renderHook(): QueryClientProvider only. */
export function createHookWrapper(queryClient: QueryClient = createQueryClient({ retry: false })) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}
