/**
 * THE axios instance. This is (with errors.ts and endpoints.ts) the only place allowed to import
 * axios (enforced by ESLint). No baseURL: paths are taken verbatim from the OpenAPI schema
 * (`/api/v1/...`), and the browser sends them to the same origin (Nginx).
 */
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { AUTH_PATHS, skipsRefresh } from './auth-paths';
import { emitSessionExpired, getAccessToken } from './auth-token';
import { toApiError } from './errors';
import { refreshAccessToken } from './refresh';

const baseOptions = {
    timeout: 30_000,
    withCredentials: true,
    headers: { Accept: 'application/json' },
};

export const http = axios.create(baseOptions);

/** No interceptors: used for the refresh call itself (avoids recursion). */
const rawHttp = axios.create(baseOptions);

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

async function fetchRefreshedToken(): Promise<string> {
    const response = await rawHttp.post<{ access?: string }>(AUTH_PATHS.refresh, {});
    if (!response.data.access) throw new Error('The refresh response had no access token.');
    return response.data.access;
}

/** Ask the backend for a new access token using the HttpOnly refresh cookie. */
export const refreshSession = (): Promise<string> => refreshAccessToken(fetchRefreshedToken);

http.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token && !config.headers.has('Authorization')) {
        config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
});

http.interceptors.response.use(undefined, async (error: unknown) => {
    if (
        axios.isAxiosError(error) &&
        error.response?.status === 401 &&
        error.config &&
        !skipsRefresh(error.config.url)
    ) {
        const original = error.config as RetriableConfig;
        if (!original._retried) {
            original._retried = true; // retry ONCE, never in a loop
            // A late 401 (sent with an older token) must reuse a token that was refreshed meanwhile.
            const usedHeader = original.headers.get('Authorization');
            const current = getAccessToken();
            if (current && usedHeader !== `Bearer ${current}`) {
                original.headers.set('Authorization', `Bearer ${current}`);
                return http.request(original);
            }
            let token: string;
            try {
                token = await refreshSession();
            } catch {
                emitSessionExpired();
                throw toApiError(error);
            }
            original.headers.set('Authorization', `Bearer ${token}`);
            return http.request(original);
        }
    }
    throw toApiError(error);
});
