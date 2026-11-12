import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/config/routes';
import { createQueryClient } from '@/lib/api/query-client';
import { AuthContext } from '@/lib/auth/auth-context';
import { createAuthValue } from '@/test/render';
import type { Role } from '@/types/domain';
import { ComingSoon, hasPage, lazyPage } from './page-registry';
import { PAGES } from './pages';
import { createTestRouter } from './router';

function renderAt(
    path: string,
    options: { role?: Role; signedIn?: boolean; bootstrapping?: boolean } = {},
) {
    const auth = createAuthValue({ role: options.role, signedIn: options.signedIn });
    if (options.bootstrapping) {
        auth.status = 'bootstrapping';
        auth.user = null;
    }
    const router = createTestRouter([path]);
    render(
        <QueryClientProvider client={createQueryClient({ retry: false })}>
            <AuthContext.Provider value={auth}>
                <RouterProvider router={router} />
            </AuthContext.Provider>
        </QueryClientProvider>,
    );
    return router;
}

describe('route guards', () => {
    it('waits while the session bootstraps (no flash of the login page)', async () => {
        const router = renderAt(ROUTES.dashboard, { bootstrapping: true });
        expect(await screen.findByRole('status')).toHaveTextContent('Loading');
        expect(router.state.location.pathname).toBe(ROUTES.dashboard);
    });

    it('sends anonymous visitors to the login page, remembering where they wanted to go', async () => {
        const router = renderAt('/app/logbook', { signedIn: false });
        await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.login));
        expect(new URLSearchParams(router.state.location.search).get('next')).toBe('/app/logbook');
    });

    it('shows signed-in users the shell with their own navigation', async () => {
        renderAt(ROUTES.dashboard, { role: 'STUDENT' });
        const nav = await screen.findByRole('navigation', { name: 'Main' });
        expect(nav).toHaveTextContent('Logbook');
        expect(nav).not.toHaveTextContent('Users');
    });

    it('redirects /app to the dashboard', async () => {
        const router = renderAt(ROUTES.app, { role: 'COORDINATOR' });
        await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.dashboard));
    });

    it('keeps students out of coordinator pages', async () => {
        const router = renderAt(ROUTES.users, { role: 'STUDENT' });
        await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.forbidden));
    });

    it('lets coordinators into coordinator pages', async () => {
        const router = renderAt(ROUTES.users, { role: 'COORDINATOR' });
        expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe(ROUTES.users);
    });

    it('keeps supervisors out of each other’s pages', async () => {
        const router = renderAt(ROUTES.reviews, { role: 'ACADEMIC_SUPERVISOR' });
        await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.forbidden));
    });

    it('does not crash on unknown paths', async () => {
        renderAt('/definitely/not/a/page', { role: 'STUDENT' });
        await waitFor(() => expect(document.body).not.toBeEmptyDOMElement());
    });
});

describe('page registry', () => {
    it('shows a placeholder for a page file that does not exist yet', async () => {
        const key = 'features/none/pages/missing-page';
        expect(hasPage(key)).toBe(false);
        const route = await lazyPage(key)();
        const Component = route.Component as () => ReactElement;
        render(<Component />);
        expect(screen.getByRole('status')).toHaveTextContent('Page not built yet');
    });

    it('renders the placeholder component with the page name', () => {
        render(<ComingSoon name="pages/landing/landing-page" />);
        expect(screen.getByText('pages/landing/landing-page')).toBeInTheDocument();
    });

    it('keeps the page registry tidy: unique files under pages/ folders', () => {
        const files = Object.values(PAGES);
        expect(new Set(files).size).toBe(files.length);
        for (const file of files)
            expect(file, file).toMatch(
                /^(pages\/(landing|errors)\/|features\/[a-z-]+\/pages\/)[a-z-]+$/,
            );
    });
});
