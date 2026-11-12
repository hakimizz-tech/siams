import { NavLink, Outlet } from 'react-router-dom';
import { getConfig } from '@/config/env';
import { NAV } from '@/config/nav';
import { useAuth } from '@/lib/auth/use-auth';

/**
 * Functional shell for signed-in users: navigation per role, user, sign out, content.
 * Visual design is yours: replace the markup with the shadcn Sidebar, Breadcrumb and Sheet.
 */
export function AppLayout() {
    const { user, logout } = useAuth();
    const items = user ? NAV[user.role] : [];
    return (
        <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr]">
            <aside className="border-b p-4 md:border-r md:border-b-0">
                <p className="mb-4 text-lg font-semibold">{getConfig().appName}</p>
                <nav aria-label="Main">
                    <ul className="space-y-1">
                        {items.map((item) => (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    className={({ isActive }) =>
                                        `block rounded-md px-3 py-2 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
                                    }
                                >
                                    {item.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
            <div className="flex min-w-0 flex-col">
                <header className="flex items-center justify-between border-b px-6 py-3">
                    <span className="text-muted-foreground">{user?.full_name}</span>
                    <button type="button" className="underline" onClick={() => void logout()}>
                        Sign out
                    </button>
                </header>
                <main className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
