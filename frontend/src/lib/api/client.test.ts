import { http as mswHttp, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { envelope, url } from '@/test/msw/handlers';
import { AUTH_PATHS } from './auth-paths';
import { getAccessToken, onSessionExpired, setAccessToken } from './auth-token';
import { http } from './client';
import { ApiError } from './errors';

const PROTECTED = '/api/v1/protected/';

/** `/protected/` only accepts the refreshed token; /refresh/ hands it out (or fails). */
function mockSession(options: { refreshFails?: boolean; neverAuthorised?: boolean } = {}) {
    const counts = { refresh: 0, protected: 0 };
    server.use(
        mswHttp.post(url(AUTH_PATHS.refresh), () => {
            counts.refresh += 1;
            return options.refreshFails
                ? envelope(401, 'not_authenticated', 'Session ended.')
                : HttpResponse.json({ access: 'new-token' });
        }),
        mswHttp.get(url(PROTECTED), ({ request }) => {
            counts.protected += 1;
            const authorised =
                !options.neverAuthorised &&
                request.headers.get('authorization') === 'Bearer new-token';
            return authorised
                ? HttpResponse.json({ ok: true })
                : envelope(401, 'not_authenticated', 'Expired.');
        }),
    );
    return counts;
}

describe('request interceptor', () => {
    it('sends the in-memory access token as a Bearer header', async () => {
        let seen: string | null = null;
        server.use(
            mswHttp.get(url('/api/v1/echo/'), ({ request }) => {
                seen = request.headers.get('authorization');
                return HttpResponse.json({});
            }),
        );
        setAccessToken('abc');
        await http.get('/api/v1/echo/');
        expect(seen).toBe('Bearer abc');
    });

    it('sends no Authorization header when signed out', async () => {
        let seen: string | null = 'unset';
        server.use(
            mswHttp.get(url('/api/v1/echo/'), ({ request }) => {
                seen = request.headers.get('authorization');
                return HttpResponse.json({});
            }),
        );
        await http.get('/api/v1/echo/');
        expect(seen).toBeNull();
    });
});

describe('401 handling', () => {
    it('refreshes once and retries the original request', async () => {
        const counts = mockSession();
        setAccessToken('old-token');
        const response = await http.get(PROTECTED);
        expect(response.data).toEqual({ ok: true });
        expect(counts).toEqual({ refresh: 1, protected: 2 });
        expect(getAccessToken()).toBe('new-token');
    });

    it('shares ONE refresh between parallel 401s', async () => {
        const counts = mockSession();
        setAccessToken('old-token');
        const responses = await Promise.all(Array.from({ length: 5 }, () => http.get(PROTECTED)));
        expect(responses.every((r) => r.data.ok === true)).toBe(true);
        expect(counts.refresh).toBe(1);
    });

    it('ends the session when the refresh fails', async () => {
        const counts = mockSession({ refreshFails: true });
        const expired = vi.fn();
        const stop = onSessionExpired(expired);
        setAccessToken('old-token');
        await expect(http.get(PROTECTED)).rejects.toMatchObject({ status: 401 });
        stop();
        expect(expired).toHaveBeenCalledTimes(1);
        expect(counts.refresh).toBe(1);
        expect(counts.protected).toBe(1); // never retried without a token
    });

    it('retries only once: a second 401 is final (no loop)', async () => {
        const counts = mockSession({ neverAuthorised: true });
        setAccessToken('old-token');
        await expect(http.get(PROTECTED)).rejects.toBeInstanceOf(ApiError);
        expect(counts).toEqual({ refresh: 1, protected: 2 });
    });

    it('never refreshes after a 401 from the login endpoint', async () => {
        let refreshCalls = 0;
        server.use(
            mswHttp.post(url(AUTH_PATHS.login), () =>
                envelope(401, 'not_authenticated', 'Bad credentials.'),
            ),
            mswHttp.post(url(AUTH_PATHS.refresh), () => {
                refreshCalls += 1;
                return HttpResponse.json({ access: 'x' });
            }),
        );
        await expect(
            http.post(AUTH_PATHS.login, { email: 'a', password: 'b' }),
        ).rejects.toMatchObject({
            status: 401,
            message: 'Bad credentials.',
        });
        expect(refreshCalls).toBe(0);
    });
});

describe('error normalisation', () => {
    it('turns business-rule failures into ApiError', async () => {
        server.use(
            mswHttp.post(url('/api/v1/thing/'), () =>
                envelope(422, 'dates_outside_period', 'Dates must lie inside the period.'),
            ),
        );
        const error = await http.post('/api/v1/thing/', {}).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ status: 422, code: 'dates_outside_period' });
    });

    it('turns a dropped connection into status 0', async () => {
        server.use(mswHttp.get(url('/api/v1/down/'), () => HttpResponse.error()));
        await expect(http.get('/api/v1/down/')).rejects.toMatchObject({
            status: 0,
            code: 'network_error',
        });
    });
});
