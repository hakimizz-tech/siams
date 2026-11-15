import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { clearAccessToken } from '@/lib/api/auth-token';
import { resetRefreshState } from '@/lib/api/refresh';
import { server } from './msw/server';

//  jsdom gaps that Radix / shadcn components rely on
if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
}

class ResizeObserverStub {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

Element.prototype.scrollIntoView ??= vi.fn() as unknown as Element['scrollIntoView'];
Element.prototype.hasPointerCapture ??= vi.fn(
    () => false,
) as unknown as Element['hasPointerCapture'];
Element.prototype.releasePointerCapture ??= vi.fn() as unknown as Element['releasePointerCapture'];

if (!URL.createObjectURL) URL.createObjectURL = vi.fn(() => 'blob:mock');
if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn();

//  API mocking: any request a test did not expect is an ERROR -
const unhandledRequests: string[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' } as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server.events as any).on('request:unhandled', ({ request }: { request: Request }) => {
    unhandledRequests.push(`${request.method} ${request.url}`);
  });
});

afterEach(() => {
    cleanup();
    server.resetHandlers();
    clearAccessToken();
    resetRefreshState();
});

afterAll(() => server.close());

// An API request that a test did not mock is a failure (MSW's own option is not honoured by this version).
afterEach(() => {
  const pending = unhandledRequests.splice(0);
  if (pending.length > 0) {
    throw new Error(`Unhandled API requests (add an MSW handler):\n${pending.join('\n')}`);
  }
});
