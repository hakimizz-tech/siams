import { ROUTES } from '@/config/routes';

/**
 * After login, only same-site application paths are accepted for `next`.
 * Anything else (other origins, protocol-relative URLs, other sections) is replaced by the default.
 */
export function safeNext(
    next: string | null | undefined,
    fallback: string = ROUTES.dashboard,
): string {
    if (!next) return fallback;
    let decoded: string;
    try {
        decoded = decodeURIComponent(next);
    } catch {
        return fallback;
    }
    const insideApp =
        decoded === ROUTES.app ||
        decoded.startsWith(`${ROUTES.app}/`) ||
        decoded.startsWith(`${ROUTES.app}?`);
    if (!insideApp) return fallback;
    if (decoded.startsWith('//') || decoded.includes('://') || decoded.includes('\\'))
        return fallback;
    return decoded;
}
