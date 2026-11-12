import { describe, expect, it, vi } from 'vitest';
import { ROLES } from '@/types/domain';
import { getConfig, loadConfig, parseConfig } from './env';
import {
    MAX_CSV_MB,
    MAX_HOURS_PER_DAY,
    MAX_IMAGE_MB,
    MAX_IMAGES_PER_WEEK,
    MAX_REPORT_MB,
    MIN_ACTIVITY_CHARS,
    mbToBytes,
} from './limits';
import { NAV } from './nav';
import { ROUTES, buildRoute, to } from './routes';

describe('runtime config', () => {
    it('falls back to defaults for missing or malformed values', () => {
        expect(parseConfig(null)).toEqual({ appName: 'SIAMS', sentryDsn: '' });
        expect(parseConfig({ appName: 5, sentryDsn: 7 })).toEqual({
            appName: 'SIAMS',
            sentryDsn: '',
        });
        expect(parseConfig({ appName: 'Uni Placements', sentryDsn: 'https://x@y/1' })).toEqual({
            appName: 'Uni Placements',
            sentryDsn: 'https://x@y/1',
        });
    });

    it('loads /config.json and survives a missing file', async () => {
        const ok = vi.fn(async () => new Response(JSON.stringify({ appName: 'Custom' })));
        expect((await loadConfig(ok as unknown as typeof fetch)).appName).toBe('Custom');
        expect(getConfig().appName).toBe('Custom');
        const broken = vi.fn(async () => {
            throw new Error('offline');
        });
        await expect(loadConfig(broken as unknown as typeof fetch)).resolves.toBeDefined();
    });
});

describe('limits mirror the backend defaults', () => {
    it('has the documented values', () => {
        expect(MAX_HOURS_PER_DAY).toBe(12);
        expect(MIN_ACTIVITY_CHARS).toBe(30);
        expect(MAX_IMAGES_PER_WEEK).toBe(5);
        expect(MAX_IMAGE_MB).toBe(5);
        expect(MAX_REPORT_MB).toBe(10);
        expect(MAX_CSV_MB).toBe(2);
        expect(mbToBytes(1)).toBe(1024 * 1024);
    });
});

describe('routes', () => {
    it('has unique paths, all application pages under /app', () => {
        const paths = Object.values(ROUTES);
        expect(new Set(paths).size).toBe(paths.length);
        const publicPaths = [
            '/',
            '/login',
            '/forgot-password',
            '/reset-password/:uid/:token',
            '/forbidden',
            '/error',
        ];
        for (const path of paths) {
            if (!publicPaths.includes(path)) expect(path.startsWith('/app'), path).toBe(true);
        }
    });

    it('builds parameterised paths and refuses missing parameters', () => {
        expect(to.logbookEntry('abc')).toBe('/app/logbook/abc');
        expect(to.placementDetail('p 1')).toBe('/app/placements/p%201');
        expect(buildRoute(ROUTES.resetPassword, { uid: 'u', token: 't' })).toBe(
            '/reset-password/u/t',
        );
        expect(() => buildRoute(ROUTES.review, {})).toThrow(/entryId/);
    });
});

describe('navigation', () => {
    it('defines items for every role, all pointing to known routes, without duplicates', () => {
        const known = new Set<string>(Object.values(ROUTES));
        for (const role of ROLES) {
            const items = NAV[role];
            expect(items.length, role).toBeGreaterThan(1);
            expect(new Set(items.map((item) => item.to)).size, role).toBe(items.length);
            for (const item of items) expect(known.has(item.to), `${role}: ${item.to}`).toBe(true);
        }
    });

    it('keeps coordinator-only links away from other roles', () => {
        for (const role of ROLES.filter((r) => r !== 'COORDINATOR')) {
            const targets = NAV[role].map((item) => item.to);
            expect(targets, role).not.toContain(ROUTES.users);
            expect(targets, role).not.toContain(ROUTES.rubric);
            expect(targets, role).not.toContain(ROUTES.periods);
        }
    });
});
