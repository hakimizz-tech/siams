import { describe, expect, it } from 'vitest';
import { ROLES } from '@/types/domain';
import { PERMISSIONS, can, type Action } from './permissions';
import { safeNext } from './redirect';

describe('permissions', () => {
    it('lists at least one valid role for every action', () => {
        for (const [action, roles] of Object.entries(PERMISSIONS)) {
            expect(roles.length, action).toBeGreaterThan(0);
            for (const role of roles) expect(ROLES, action).toContain(role);
        }
    });

    it('gives each role the right powers', () => {
        expect(can({ role: 'COORDINATOR' }, 'placement:approve')).toBe(true);
        expect(can({ role: 'STUDENT' }, 'placement:approve')).toBe(false);
        expect(can({ role: 'STUDENT' }, 'logbook:write')).toBe(true);
        expect(can({ role: 'COORDINATOR' }, 'logbook:write')).toBe(false);
        expect(can({ role: 'WORKPLACE_SUPERVISOR' }, 'logbook:approve')).toBe(true);
        expect(can({ role: 'ACADEMIC_SUPERVISOR' }, 'logbook:approve')).toBe(false);
        expect(can({ role: 'ACADEMIC_SUPERVISOR' }, 'report:review')).toBe(true);
        expect(can({ role: 'COORDINATOR' }, 'result:finalize')).toBe(true);
        expect(can({ role: 'ACADEMIC_SUPERVISOR' }, 'result:finalize')).toBe(false);
    });

    it('denies anonymous users everything', () => {
        for (const action of Object.keys(PERMISSIONS) as Action[]) {
            expect(can(null, action)).toBe(false);
            expect(can(undefined, action)).toBe(false);
        }
    });
});

describe('safeNext (open-redirect protection)', () => {
    it('accepts application paths', () => {
        expect(safeNext('/app/logbook')).toBe('/app/logbook');
        expect(safeNext(encodeURIComponent('/app/logbook?week=3'))).toBe('/app/logbook?week=3');
        expect(safeNext('/app')).toBe('/app');
    });

    it('falls back for everything else', () => {
        const fallback = '/app/dashboard';
        expect(safeNext(null)).toBe(fallback);
        expect(safeNext('')).toBe(fallback);
        expect(safeNext('https://evil.example')).toBe(fallback);
        expect(safeNext('//evil.example/app')).toBe(fallback);
        expect(safeNext('/login')).toBe(fallback);
        expect(safeNext('/application')).toBe(fallback);
        expect(safeNext('/app/..\\evil')).toBe(fallback);
        expect(safeNext('/app/x://y')).toBe(fallback);
        expect(safeNext('%E0%A4%A')).toBe(fallback); // malformed encoding
    });

    it('uses a custom fallback when given', () => {
        expect(safeNext('https://evil.example', '/app/notices')).toBe('/app/notices');
    });
});
