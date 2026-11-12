export const AUTH_PATHS = {
    login: '/api/v1/auth/login/',
    logout: '/api/v1/auth/logout/',
    refresh: '/api/v1/auth/token/refresh/',
    passwordReset: '/api/v1/auth/password/reset/',
    passwordResetConfirm: '/api/v1/auth/password/reset/confirm/',
    passwordChange: '/api/v1/auth/password/change/',
} as const;

/** A 401 from these endpoints is a real answer, not an expired token: never refresh and retry. */
const NO_REFRESH: readonly string[] = [
    AUTH_PATHS.login,
    AUTH_PATHS.refresh,
    AUTH_PATHS.passwordReset,
    AUTH_PATHS.passwordResetConfirm,
];

export function skipsRefresh(url: string | undefined): boolean {
    if (!url) return false;
    return NO_REFRESH.some((path) => url.startsWith(path));
}
