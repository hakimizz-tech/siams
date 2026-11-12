import type { Role } from '@/types/domain';

/**
 * THE query key factory. Hierarchical on purpose: invalidating `qk.placements.all()` also
 * refreshes every list, detail and timeline under it.
 */
export const qk = {
    me: () => ['me'] as const,

    dashboards: () => ['dashboard'] as const,
    dashboard: (role: Role, params: object = {}) => ['dashboard', role, params] as const,

    placements: {
        all: () => ['placements'] as const,
        list: (filters: object = {}) => ['placements', 'list', filters] as const,
        detail: (id: string) => ['placements', 'detail', id] as const,
        timeline: (id: string) => ['placements', 'detail', id, 'timeline'] as const,
        mine: () => ['placements', 'mine'] as const,
    },

    organizations: {
        all: () => ['organizations'] as const,
        list: (filters: object = {}) => ['organizations', 'list', filters] as const,
    },

    periods: {
        all: () => ['periods'] as const,
        list: (filters: object = {}) => ['periods', 'list', filters] as const,
        detail: (id: string) => ['periods', 'detail', id] as const,
        gradeBands: (id: string) => ['periods', 'detail', id, 'grade-bands'] as const,
    },

    users: {
        all: () => ['users'] as const,
        list: (filters: object = {}) => ['users', 'list', filters] as const,
        supervisors: (role?: Role) => ['users', 'supervisors', role ?? 'all'] as const,
        importJob: (jobId: string) => ['users', 'import', jobId] as const,
    },

    logbook: {
        all: (placementId: string) => ['logbook', placementId] as const,
        list: (placementId: string, filters: object = {}) =>
            ['logbook', placementId, 'list', filters] as const,
        timeline: (placementId: string) => ['logbook', placementId, 'timeline'] as const,
        entry: (entryId: string) => ['logbook', 'entry', entryId] as const,
        feedback: (entryId: string) => ['logbook', 'entry', entryId, 'feedback'] as const,
        pending: () => ['logbook', 'pending'] as const,
        everything: () => ['logbook'] as const,
    },

    flags: {
        all: () => ['flags'] as const,
        list: (filters: object = {}) => ['flags', 'list', filters] as const,
    },

    visits: {
        all: () => ['visits'] as const,
        list: (filters: object = {}) => ['visits', 'list', filters] as const,
        forPlacement: (placementId: string) => ['visits', 'placement', placementId] as const,
    },

    assessmentForms: {
        all: () => ['assessment-forms'] as const,
        forPeriod: (periodId: string) => ['assessment-forms', 'period', periodId] as const,
        detail: (id: string) => ['assessment-forms', 'detail', id] as const,
    },

    assessments: {
        all: () => ['assessments'] as const,
        forPlacement: (placementId: string) => ['assessments', 'placement', placementId] as const,
        detail: (id: string) => ['assessments', 'detail', id] as const,
    },

    finalReport: (placementId: string) => ['final-report', placementId] as const,
    result: (placementId: string) => ['result', placementId] as const,

    notices: {
        all: () => ['notices'] as const,
        list: (filters: object = {}) => ['notices', 'list', filters] as const,
        detail: (id: string) => ['notices', 'detail', id] as const,
    },

    reports: {
        placementSummary: (placementId: string) => ['reports', 'placement', placementId] as const,
        periodSummary: (periodId: string) => ['reports', 'period', periodId] as const,
        exportJob: (jobId: string) => ['reports', 'export', jobId] as const,
        all: () => ['reports'] as const,
    },

    blob: (url: string) => ['blob', url] as const,
} as const;
