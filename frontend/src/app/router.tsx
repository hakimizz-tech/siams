import {
    createBrowserRouter,
    createMemoryRouter,
    Navigate,
    type RouteObject,
} from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { RequireAuth, RequireRole } from '@/lib/auth/guards';
import type { Role } from '@/types/domain';
import { AppLayout } from './layouts/app-layout';
import { PublicLayout } from './layouts/public-layout';
import { RouteError } from './error-boundary';
import { lazyPage } from './page-registry';
import { PAGES } from './pages';

const S: Role[] = ['STUDENT'];
const WS: Role[] = ['WORKPLACE_SUPERVISOR'];
const AS: Role[] = ['ACADEMIC_SUPERVISOR'];
const C: Role[] = ['COORDINATOR'];

const page = (path: string, key: string): RouteObject => ({ path, lazy: lazyPage(key) });
const section = (roles: Role[], children: RouteObject[]): RouteObject => ({
    element: <RequireRole roles={roles} />,
    children,
});

export const routes: RouteObject[] = [
    {
        errorElement: <RouteError />,
        children: [
            {
                element: <PublicLayout />,
                children: [
                    page(ROUTES.landing, PAGES.landing),
                    page(ROUTES.login, PAGES.login),
                    page(ROUTES.forgotPassword, PAGES.forgotPassword),
                    page(ROUTES.resetPassword, PAGES.resetPassword),
                    page(ROUTES.forbidden, PAGES.forbidden),
                    page(ROUTES.serverError, PAGES.serverError),
                ],
            },
            {
                path: ROUTES.app,
                element: (
                    <RequireAuth>
                        <AppLayout />
                    </RequireAuth>
                ),
                children: [
                    { index: true, element: <Navigate to={ROUTES.dashboard} replace /> },
                    page(ROUTES.dashboard, PAGES.dashboard),
                    page(ROUTES.notices, PAGES.notices),
                    page(ROUTES.profile, PAGES.profile),

                    section(S, [
                        page(ROUTES.placement, PAGES.placement),
                        page(ROUTES.logbook, PAGES.logbook),
                        page(ROUTES.logbookEntry, PAGES.logbookEntry),
                        page(ROUTES.finalReport, PAGES.finalReport),
                        page(ROUTES.result, PAGES.result),
                    ]),
                    section(WS, [
                        page(ROUTES.interns, PAGES.interns),
                        page(ROUTES.reviews, PAGES.reviews),
                        page(ROUTES.review, PAGES.review),
                        page(ROUTES.evaluations, PAGES.evaluations),
                        page(ROUTES.evaluation, PAGES.evaluation),
                    ]),
                    section(AS, [
                        page(ROUTES.students, PAGES.students),
                        page(ROUTES.student, PAGES.student),
                        page(ROUTES.visits, PAGES.visits),
                        page(ROUTES.assessment, PAGES.assessment),
                        page(ROUTES.finalReports, PAGES.finalReports),
                    ]),
                    section(
                        [...AS, ...C],
                        [page(ROUTES.flags, PAGES.flags), page(ROUTES.reports, PAGES.reports)],
                    ),
                    section(C, [
                        page(ROUTES.placements, PAGES.placements),
                        page(ROUTES.placementDetail, PAGES.placementDetail),
                        page(ROUTES.organizations, PAGES.organizations),
                        page(ROUTES.users, PAGES.users),
                        page(ROUTES.periods, PAGES.periods),
                        page(ROUTES.rubric, PAGES.rubric),
                        page(ROUTES.results, PAGES.results),
                        page(ROUTES.noticesManage, PAGES.noticesManage),
                    ]),
                ],
            },
            page('*', PAGES.notFound),
        ],
    },
];

export const createAppRouter = () => createBrowserRouter(routes);
export const createTestRouter = (initialEntries: string[]) =>
    createMemoryRouter(routes, { initialEntries });
