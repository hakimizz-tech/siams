import { http, HttpResponse } from 'msw';
import { server } from './msw/server';

export interface Captured {
    method: string;
    path: string;
    search: string;
    body: string;
    contentType: string | null;
}

/**
 * Answers every /api/v1/* request with an empty JSON page and records what was sent, so a
 * test can assert the exact method, path, query and body of an API call.
 */
export function captureApi(
    response: unknown = { count: 0, next: null, previous: null, results: [] },
) {
    const calls: Captured[] = [];
    server.use(
        http.all('*/api/v1/*', async ({ request }) => {
            const parsed = new URL(request.url);
            calls.push({
                method: request.method,
                path: parsed.pathname,
                search: parsed.search,
                body: await request.clone().text(),
                contentType: request.headers.get('content-type'),
            });
            return HttpResponse.json(response as Record<string, unknown>);
        }),
    );
    return calls;
}
