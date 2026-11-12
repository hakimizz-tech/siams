import { http, HttpResponse } from 'msw';
import type { User } from '@/types/domain';

/** `*` prefix: matches whatever origin the test environment resolves relative URLs against. */
export const url = (path: string) => `*${path}`;

/** The backend's error envelope. */
export const envelope = (
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
) => HttpResponse.json({ code, message, details }, { status });

/** By default nobody is signed in: the silent refresh at startup answers 401. */
export const defaultHandlers = [
    http.post(url('/api/v1/auth/token/refresh/'), () =>
        envelope(401, 'not_authenticated', 'No active session.'),
    ),
];

/** A signed-in session: silent refresh works and /users/me/ returns `user`. */
export const signedInHandlers = (user: User, access = 'access-token') => [
    http.post(url('/api/v1/auth/token/refresh/'), () => HttpResponse.json({ access })),
    http.get(url('/api/v1/users/me/'), () => HttpResponse.json(user)),
];
