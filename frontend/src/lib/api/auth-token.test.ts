import { describe, expect, it, vi } from 'vitest';
import {
    clearAccessToken,
    emitSessionExpired,
    getAccessToken,
    onSessionExpired,
    setAccessToken,
    subscribeToken,
} from './auth-token';
import { AUTH_PATHS, skipsRefresh } from './auth-paths';

describe('access token store', () => {
    it('keeps the token in memory only', () => {
        setAccessToken('abc');
        expect(getAccessToken()).toBe('abc');
        expect(localStorage.length).toBe(0);
        expect(sessionStorage.length).toBe(0);
        clearAccessToken();
        expect(getAccessToken()).toBeNull();
    });

    it('notifies subscribers until they unsubscribe', () => {
        const listener = vi.fn();
        const stop = subscribeToken(listener);
        setAccessToken('one');
        stop();
        setAccessToken('two');
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith('one');
    });

    it('broadcasts session expiry', () => {
        const listener = vi.fn();
        const stop = onSessionExpired(listener);
        emitSessionExpired();
        stop();
        emitSessionExpired();
        expect(listener).toHaveBeenCalledTimes(1);
    });
});

describe('skipsRefresh', () => {
    it('never refreshes for login, refresh and password reset', () => {
        expect(skipsRefresh(AUTH_PATHS.login)).toBe(true);
        expect(skipsRefresh(AUTH_PATHS.refresh)).toBe(true);
        expect(skipsRefresh(AUTH_PATHS.passwordReset)).toBe(true);
        expect(skipsRefresh(AUTH_PATHS.passwordResetConfirm)).toBe(true);
    });

    it('refreshes for every other call, including logout and password change', () => {
        expect(skipsRefresh('/api/v1/placements/')).toBe(false);
        expect(skipsRefresh(AUTH_PATHS.logout)).toBe(false);
        expect(skipsRefresh(AUTH_PATHS.passwordChange)).toBe(false);
        expect(skipsRefresh(undefined)).toBe(false);
    });
});
