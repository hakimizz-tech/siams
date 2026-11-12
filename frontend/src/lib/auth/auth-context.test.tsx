import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as mswHttp, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { getAccessToken } from '@/lib/api/auth-token';
import { createQueryClient } from '@/lib/api/query-client';
import { envelope, signedInHandlers, url } from '@/test/msw/handlers';
import { user as makeUser } from '@/test/msw/data';
import { server } from '@/test/msw/server';
import { AuthProvider } from './auth-context';
import { useAuth } from './use-auth';

function Probe() {
    const { status, user, login, logout } = useAuth();
    return (
        <div>
            <p data-testid="status">{status}</p>
            <p data-testid="email">{user?.email ?? 'nobody'}</p>
            <button type="button" onClick={() => void login('a@example.com', 'pw')}>
                sign in
            </button>
            <button type="button" onClick={() => void logout()}>
                sign out
            </button>
        </div>
    );
}

function setup() {
    const queryClient = createQueryClient({ retry: false });
    render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <Probe />
            </AuthProvider>
        </QueryClientProvider>,
    );
    return queryClient;
}

describe('AuthProvider', () => {
    it('restores a session from the refresh cookie', async () => {
        const me = makeUser('COORDINATOR');
        server.use(...signedInHandlers(me));
        setup();
        expect(screen.getByTestId('status')).toHaveTextContent('bootstrapping');
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
        );
        expect(screen.getByTestId('email')).toHaveTextContent(me.email);
        expect(getAccessToken()).toBe('access-token');
    });

    it('becomes anonymous when there is no valid refresh cookie', async () => {
        setup(); // default handlers answer 401
        await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
        expect(getAccessToken()).toBeNull();
    });

    it('logs in: stores the access token and loads the user', async () => {
        const me = makeUser('STUDENT');
        server.use(
            mswHttp.post(url('/api/v1/auth/login/'), () =>
                HttpResponse.json({ access: 'login-token' }),
            ),
            mswHttp.get(url('/api/v1/users/me/'), () => HttpResponse.json(me)),
        );
        setup();
        await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
        await userEvent.click(screen.getByRole('button', { name: 'sign in' }));
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
        );
        expect(getAccessToken()).toBe('login-token');
        expect(screen.getByTestId('email')).toHaveTextContent(me.email);
    });

    it('logs out: calls the API, clears the token and wipes the query cache', async () => {
        let logoutCalls = 0;
        server.use(
            ...signedInHandlers(makeUser('STUDENT')),
            mswHttp.post(url('/api/v1/auth/logout/'), () => {
                logoutCalls += 1;
                return new HttpResponse(null, { status: 204 });
            }),
        );
        const queryClient = setup();
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
        );
        queryClient.setQueryData(['placements'], { secret: 'previous user data' });

        await userEvent.click(screen.getByRole('button', { name: 'sign out' }));

        await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
        expect(logoutCalls).toBe(1);
        expect(getAccessToken()).toBeNull();
        expect(queryClient.getQueryData(['placements'])).toBeUndefined();
    });

    it('still ends the local session when the logout call fails', async () => {
        server.use(
            ...signedInHandlers(makeUser('STUDENT')),
            mswHttp.post(url('/api/v1/auth/logout/'), () => envelope(500, 'error', 'Boom')),
        );
        setup();
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
        );
        await userEvent.click(screen.getByRole('button', { name: 'sign out' }));
        await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    });
});

describe('useAuth', () => {
    it('throws outside the provider', () => {
        const spy = console.error;
        console.error = () => undefined; // React logs the thrown error
        expect(() => render(<Probe />)).toThrow(/AuthProvider/);
        console.error = spy;
    });
});
