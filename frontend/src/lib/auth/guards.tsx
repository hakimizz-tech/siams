import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import type { Role } from '@/types/domain';
import { useAuth } from './use-auth';

/** Shown while the session bootstraps (silent refresh), so there is no flash of the login page. */
function BootSplash() {
    return (
            <div role="status" aria-live="polite" className="p-6 text-sm text-muted-foreground">
                Loading…
            </div>
    );
}

export function RequireAuth({ children }: { children?: ReactNode }) {
    const { status } = useAuth();
    const location = useLocation();
    if (status === 'bootstrapping') return <BootSplash />;
    if (status === 'anonymous') {
        const next = encodeURIComponent(`${location.pathname}${location.search}`);
        return <Navigate to={`${ROUTES.login}?next=${next}`} replace />;
    }
    return <>{children ?? <Outlet />}</>;
}

/** UX only: the API refuses the call anyway. Wrong role goes to the Forbidden page. */
export function RequireRole({ roles, children }: { roles: readonly Role[]; children?: ReactNode }) {
    const { user } = useAuth();
    if (!user || !roles.includes(user.role)) return <Navigate to={ROUTES.forbidden} replace />;
    return <>{children ?? <Outlet />}</>;
}
