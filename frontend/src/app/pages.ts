/**
 * Page registry: which file renders which route. A route lights up as soon as its file exists
 * (default export = the page component); until then it shows a "not built yet" placeholder.
 * Paths are relative to src/ and have no extension.
 */
export const PAGES = {
    landing: 'pages/landing/landing-page',
    notFound: 'pages/errors/not-found',
    forbidden: 'pages/errors/forbidden',
    serverError: 'pages/errors/server-error',

    login: 'features/auth/pages/login-page',
    forgotPassword: 'features/auth/pages/forgot-password-page',
    resetPassword: 'features/auth/pages/reset-password-page',
    profile: 'features/auth/pages/profile-page',

    dashboard: 'features/dashboards/pages/dashboard-page',
    notices: 'features/notices/pages/notices-page',
    noticesManage: 'features/notices/pages/notices-manage-page',

    placement: 'features/placements/pages/placement-page',
    logbook: 'features/logbook/pages/logbook-page',
    logbookEntry: 'features/logbook/pages/logbook-entry-page',
    finalReport: 'features/final-report/pages/final-report-page',
    result: 'features/assessments/pages/result-page',

    interns: 'features/reports/pages/interns-page',
    reviews: 'features/logbook/pages/reviews-page',
    review: 'features/logbook/pages/review-page',
    evaluations: 'features/assessments/pages/evaluations-page',
    evaluation: 'features/assessments/pages/evaluation-page',

    students: 'features/reports/pages/students-page',
    student: 'features/placements/pages/student-detail-page',
    visits: 'features/visits/pages/visits-page',
    assessment: 'features/assessments/pages/assessment-page',
    finalReports: 'features/final-report/pages/final-reports-page',
    flags: 'features/flags/pages/flags-page',

    placements: 'features/placements/pages/placements-page',
    placementDetail: 'features/placements/pages/placement-detail-page',
    organizations: 'features/organizations/pages/organizations-page',
    users: 'features/users/pages/users-page',
    periods: 'features/periods/pages/periods-page',
    rubric: 'features/assessments/pages/rubric-page',
    results: 'features/assessments/pages/results-page',
    reports: 'features/reports/pages/reports-page',
} as const;
