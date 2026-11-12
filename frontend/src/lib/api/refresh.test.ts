import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, setAccessToken } from './auth-token';
import { refreshAccessToken, resetRefreshState } from './refresh';

afterEach(() => {
    Reflect.deleteProperty(navigator, 'locks');
    resetRefreshState();
});

describe('refreshAccessToken', () => {
    it('is single-flight: parallel callers share one request', async () => {
        const fetchToken = vi.fn(async () => 'fresh');
        const results = await Promise.all([
            refreshAccessToken(fetchToken),
            refreshAccessToken(fetchToken),
            refreshAccessToken(fetchToken),
        ]);
        expect(results).toEqual(['fresh', 'fresh', 'fresh']);
        expect(fetchToken).toHaveBeenCalledTimes(1);
        expect(getAccessToken()).toBe('fresh');
    });

    it('allows a new refresh after the previous one finished', async () => {
        const fetchToken = vi.fn().mockResolvedValueOnce('one').mockResolvedValueOnce('two');
        await refreshAccessToken(fetchToken);
        await refreshAccessToken(fetchToken);
        expect(fetchToken).toHaveBeenCalledTimes(2);
        expect(getAccessToken()).toBe('two');
    });

    it('forgets a failed refresh so the next attempt can run', async () => {
        const failing = vi.fn().mockRejectedValue(new Error('401'));
        await expect(refreshAccessToken(failing)).rejects.toThrow('401');
        const working = vi.fn(async () => 'ok');
        await expect(refreshAccessToken(working)).resolves.toBe('ok');
    });

    it('reuses a token another tab shared while this tab waited for the Web Lock', async () => {
        Object.defineProperty(navigator, 'locks', {
            configurable: true,
            value: {
                request: async (_name: string, callback: () => Promise<string>) => {
                    // another tab finishes its refresh and broadcasts the token while we wait
                    setAccessToken('from-other-tab');
                    return callback();
                },
            },
        });
        const fetchToken = vi.fn(async () => 'should-not-be-used');
        await expect(refreshAccessToken(fetchToken)).resolves.toBe('from-other-tab');
        expect(fetchToken).not.toHaveBeenCalled();
    });
});
