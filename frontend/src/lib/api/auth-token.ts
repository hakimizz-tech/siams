/**
 * The access token lives ONLY in this module variable: never in localStorage,
 * sessionStorage or cookies we set (XSS cannot read what is not in web storage).
 * The refresh token is the backend's HttpOnly cookie and is invisible to JavaScript.
 */
type TokenListener = (token: string | null) => void;

let accessToken: string | null = null;
const tokenListeners = new Set<TokenListener>();
const expiredListeners = new Set<() => void>();

export const getAccessToken = (): string | null => accessToken;

export function setAccessToken(token: string | null): void {
    accessToken = token;
    tokenListeners.forEach((listener) => listener(token));
}

export const clearAccessToken = (): void => setAccessToken(null);

export function subscribeToken(listener: TokenListener): () => void {
    tokenListeners.add(listener);
    return () => {
        tokenListeners.delete(listener);
    };
}

/** Raised when a refresh fails: the session is over and the UI must return to login. */
export function emitSessionExpired(): void {
    expiredListeners.forEach((listener) => listener());
}

export function onSessionExpired(listener: () => void): () => void {
    expiredListeners.add(listener);
    return () => {
        expiredListeners.delete(listener);
    };
}
