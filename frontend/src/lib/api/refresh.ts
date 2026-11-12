import { getAccessToken, setAccessToken } from './auth-token';

/**
 * Token refresh orchestration (no axios here: the caller supplies `fetchToken`).
 *
 * - single-flight per tab: ten parallel 401s cause ONE refresh request;
 * - Web Locks serialise refresh across tabs. The backend rotates and blacklists refresh
 *   tokens, so two tabs refreshing at once would make the second one fail and log the user out;
 * - BroadcastChannel shares the new access token with the other tabs.
 */
const LOCK_NAME = 'siams-refresh';
const CHANNEL_NAME = 'siams-auth';

type Message = { type: 'token'; token: string } | { type: 'logout' };

let inflight: Promise<string> | null = null;
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
    if (typeof BroadcastChannel === 'undefined') return null;
    channel ??= new BroadcastChannel(CHANNEL_NAME);
    return channel;
}

function post(message: Message): void {
    getChannel()?.postMessage(message);
}

/** Listen for other tabs. Returns a cleanup function. */
export function initAuthSync(onLogout: () => void): () => void {
    const bc = getChannel();
    if (!bc) return () => undefined;
    const handler = (event: MessageEvent<Message>) => {
        if (event.data.type === 'token') setAccessToken(event.data.token);
        else if (event.data.type === 'logout') onLogout();
    };
    bc.addEventListener('message', handler);
    return () => bc.removeEventListener('message', handler);
}

export function broadcastLogout(): void {
    post({ type: 'logout' });
}

async function runRefresh(fetchToken: () => Promise<string>): Promise<string> {
    const startedWith = getAccessToken();
    const task = async (): Promise<string> => {
        // Another tab may have refreshed while we waited for the lock: reuse its token.
        const current = getAccessToken();
        if (current && current !== startedWith) return current;
        const token = await fetchToken();
        setAccessToken(token);
        post({ type: 'token', token });
        return token;
    };
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        return navigator.locks.request(LOCK_NAME, task);
    }
    return task();
}

export function refreshAccessToken(fetchToken: () => Promise<string>): Promise<string> {
    inflight ??= runRefresh(fetchToken).finally(() => {
        inflight = null;
    });
    return inflight;
}

/** Test helper: forget in-flight state between tests. */
export function resetRefreshState(): void {
    inflight = null;
}
