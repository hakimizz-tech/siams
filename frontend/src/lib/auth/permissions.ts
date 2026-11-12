import type { Role } from '@/types/domain';

/**
 * Mirrors the backend permission matrix. This only HIDES controls that the API would refuse:
 * the backend authorises every call again (403 wrong role, 404 out of scope).
 */
const S: Role = 'STUDENT';
const WS: Role = 'WORKPLACE_SUPERVISOR';
const AS: Role = 'ACADEMIC_SUPERVISOR';
const C: Role = 'COORDINATOR';

export const PERMISSIONS = {
    'placement:create': [S, C],
    'placement:edit': [S, C],
    'placement:submit': [S],
    'placement:approve': [C],
    'placement:return': [C],
    'placement:reject': [C],
    'placement:assign': [C],
    'placement:complete': [C],
    'placement:terminate': [C],
    'organization:create': [S, C],
    'organization:verify': [C],
    'period:manage': [C],
    'user:manage': [C],
    'logbook:write': [S],
    'logbook:approve': [WS],
    'logbook:return': [WS],
    'logbook:reopen': [C],
    'logbook:feedback': [WS, AS],
    'flag:resolve': [C, AS],
    'visit:schedule': [AS],
    'rubric:manage': [C],
    'assessment:record': [WS, AS],
    'report:upload': [S],
    'report:review': [AS],
    'result:finalize': [C],
    'notice:manage': [C],
    'export:run': [C, AS],
} as const satisfies Record<string, readonly Role[]>;

export type Action = keyof typeof PERMISSIONS;

export function can(user: { role: Role } | null | undefined, action: Action): boolean {
    if (!user) return false;
    return (PERMISSIONS[action] as readonly Role[]).includes(user.role);
}
