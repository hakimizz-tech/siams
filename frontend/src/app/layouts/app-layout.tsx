/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronsUpDown, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { NAV } from '@/config/nav';
import { ROUTES } from '@/config/routes';
import { useLogout } from '@/features/auth';
import { useAuth } from '@/lib/auth/use-auth';
import { RoleBadge } from '@/components/shared/role-badge';

export function AppLayout() {
  const { user } = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const items: any[] = (NAV as any)[(user as any)?.role ?? ''] ?? [];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 py-3 text-lg font-semibold">
          <Link to={ROUTES.dashboard as string}>SIAMS</Link>
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label="Main">
            <SidebarGroup>
              <SidebarMenu>
                {items.map((item) => {
                  const to: string = item.to ?? item.path ?? item.href;
                  const label: string = item.label ?? item.title;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={to}>
                      <SidebarMenuButton asChild isActive={pathname === to || pathname.startsWith(`${to}/`)}>
                        <NavLink to={to}>
                          {Icon && typeof Icon !== 'string' && <Icon className="size-4" aria-hidden />}
                          <span>{label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 text-xs text-muted-foreground">{(user as any)?.email}</div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b px-4">
          <SidebarTrigger aria-label="Toggle navigation" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <UserIcon className="size-4" aria-hidden />
                {(user as any)?.full_name ?? 'Account'}
                <ChevronsUpDown className="size-3" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5">{user && <RoleBadge role={(user as any).role} />}</div>
              <DropdownMenuItem onSelect={() => navigate(ROUTES.profile as string)}>
                <UserIcon className="mr-2 size-4" aria-hidden /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={async () => {
                  try {
                    await logout.mutateAsync(undefined as never);
                  } finally {
                    navigate(ROUTES.login as string, { replace: true });
                  }
                }}
              >
                <LogOut className="mr-2 size-4" aria-hidden /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="mx-auto w-full max-w-[1280px] p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AppLayout;
