import type { Role } from '@/types/domain';
import { ROUTES } from './routes';

export interface NavItem {
    label: string;
    to: string;
}

/** Sidebar items per role: a role never sees a link it cannot use. */
export const NAV: Record<Role, NavItem[]> = {
    STUDENT: [
        { label: 'Dashboard', to: ROUTES.dashboard },
        { label: 'My placement', to: ROUTES.placement },
        { label: 'Logbook', to: ROUTES.logbook },
        { label: 'Final report', to: ROUTES.finalReport },
        { label: 'Result', to: ROUTES.result },
        { label: 'Notices', to: ROUTES.notices },
    ],
    WORKPLACE_SUPERVISOR: [
        { label: 'Dashboard', to: ROUTES.dashboard },
        { label: 'Interns', to: ROUTES.interns },
        { label: 'Weekly reviews', to: ROUTES.reviews },
        { label: 'Evaluations', to: ROUTES.evaluations },
        { label: 'Notices', to: ROUTES.notices },
    ],
    ACADEMIC_SUPERVISOR: [
        { label: 'Dashboard', to: ROUTES.dashboard },
        { label: 'Students', to: ROUTES.students },
        { label: 'Visits', to: ROUTES.visits },
        { label: 'Final reports', to: ROUTES.finalReports },
        { label: 'Flags', to: ROUTES.flags },
        { label: 'Reports', to: ROUTES.reports },
        { label: 'Notices', to: ROUTES.notices },
    ],
    COORDINATOR: [
        { label: 'Dashboard', to: ROUTES.dashboard },
        { label: 'Placements', to: ROUTES.placements },
        { label: 'Organizations', to: ROUTES.organizations },
        { label: 'Users', to: ROUTES.users },
        { label: 'Periods', to: ROUTES.periods },
        { label: 'Rubric', to: ROUTES.rubric },
        { label: 'Results', to: ROUTES.results },
        { label: 'Reports', to: ROUTES.reports },
        { label: 'Flags', to: ROUTES.flags },
        { label: 'Notices', to: ROUTES.noticesManage },
    ],
};
