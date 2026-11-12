import { describe, expect, it } from 'vitest';
import { captureApi } from '@/test/capture';
import { buildUrl, cleanQuery, del, get, patch, post, put } from './endpoints';

describe('buildUrl', () => {
    it('fills {param} placeholders and encodes them', () => {
        expect(buildUrl('/api/v1/placements/{id}/submit/', { id: 'abc' })).toBe(
            '/api/v1/placements/abc/submit/',
        );
        expect(buildUrl('/api/v1/x/{a}/y/{b}/', { a: 1, b: 'a b/c' })).toBe(
            '/api/v1/x/1/y/a%20b%2Fc/',
        );
    });

    it('refuses to build a URL with a missing parameter', () => {
        expect(() => buildUrl('/api/v1/placements/{id}/', {})).toThrow(
            /Missing path parameter "id"/,
        );
    });

    it('leaves URLs without placeholders alone', () => {
        expect(buildUrl('/api/v1/placements/')).toBe('/api/v1/placements/');
    });
});

describe('cleanQuery', () => {
    it('drops undefined, null and empty values but keeps zero and false', () => {
        expect(cleanQuery({ a: undefined, b: null, c: '', d: 0, e: false, f: 'x' })).toEqual({
            d: 0,
            e: false,
            f: 'x',
        });
    });
});

describe('request helpers', () => {
    it('GET sends a clean query string', async () => {
        const calls = captureApi();
        await get('/api/v1/placements/', { query: { status: 'APPROVED', search: '', page: 2 } });
        expect(calls).toHaveLength(1);
        expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/v1/placements/' });
        expect(new URLSearchParams(calls[0]?.search).get('status')).toBe('APPROVED');
        expect(new URLSearchParams(calls[0]?.search).has('search')).toBe(false);
        expect(new URLSearchParams(calls[0]?.search).get('page')).toBe('2');
    });

    it('POST, PUT, PATCH and DELETE use the right verb, path and JSON body', async () => {
        const calls = captureApi();
        await post('/api/v1/placements/', { body: { a: 1 } });
        await put('/api/v1/periods/{period_id}/grade-bands/', {
            path: { period_id: 'p1' },
            body: [],
        });
        await patch('/api/v1/placements/{id}/', { path: { id: 'p1' }, body: { role_title: 'X' } });
        await del('/api/v1/notices/{id}/', { path: { id: 'n1' } });
        expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
            'POST /api/v1/placements/',
            'PUT /api/v1/periods/p1/grade-bands/',
            'PATCH /api/v1/placements/p1/',
            'DELETE /api/v1/notices/n1/',
        ]);
        expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({ a: 1 });
        expect(JSON.parse(calls[2]?.body ?? '{}')).toEqual({ role_title: 'X' });
    });
});
