/** Every route path lives here. Components never write path strings by hand. */
export const ROUTES = {
    landing: '/',
    login: '/login',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password/:uid/:token',
    forbidden: '/forbidden',
    serverError: '/error',

    app: '/app',
    dashboard: '/app/dashboard',
    notices: '/app/notices',
    noticesManage: '/app/notices/manage',
    profile: '/app/profile',

    // student
    placement: '/app/placement',
    logbook: '/app/logbook',
    logbookEntry: '/app/logbook/:entryId',
    finalReport: '/app/final-report',
    result: '/app/result',

    // industrial (workplace) supervisor
    interns: '/app/interns',
    reviews: '/app/reviews',
    review: '/app/reviews/:entryId',
    evaluations: '/app/evaluations',
    evaluation: '/app/evaluations/:placementId',

    // academic supervisor
    students: '/app/students',
    student: '/app/students/:placementId',
    visits: '/app/visits',
    assessment: '/app/assessments/:placementId',
    finalReports: '/app/final-reports',
    flags: '/app/flags',

    // coordinator
    placements: '/app/placements',
    placementDetail: '/app/placements/:id',
    organizations: '/app/organizations',
    users: '/app/users',
    periods: '/app/periods',
    rubric: '/app/rubric',
    results: '/app/results',
    reports: '/app/reports',
} as const;

export function buildRoute(pattern: string, params: Record<string, string>): string {
    return pattern.replace(/:(\w+)/g, (_, key: string) => {
        const value = params[key];
        if (value === undefined) throw new Error(`Missing route parameter "${key}" for ${pattern}`);
        return encodeURIComponent(value);
    });
}

export const to = {
    logbookEntry: (entryId: string) => buildRoute(ROUTES.logbookEntry, { entryId }),
    review: (entryId: string) => buildRoute(ROUTES.review, { entryId }),
    evaluation: (placementId: string) => buildRoute(ROUTES.evaluation, { placementId }),
    student: (placementId: string) => buildRoute(ROUTES.student, { placementId }),
    assessment: (placementId: string) => buildRoute(ROUTES.assessment, { placementId }),
    placementDetail: (id: string) => buildRoute(ROUTES.placementDetail, { id }),
};
