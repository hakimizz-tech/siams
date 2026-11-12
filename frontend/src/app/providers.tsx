import { lazy, Suspense, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { createQueryClient } from '@/lib/api/query-client';
import { AuthProvider } from '@/lib/auth/auth-context';

const Devtools = lazy(() =>
    import('@tanstack/react-query-devtools').then((module) => ({
        default: module.ReactQueryDevtools,
    })),
);

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => createQueryClient());
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <TooltipProvider>{children}</TooltipProvider>
                <Toaster />
            </AuthProvider>
            {import.meta.env.DEV && (
                <Suspense fallback={null}>
                    <Devtools initialIsOpen={false} />
                </Suspense>
            )}
        </QueryClientProvider>
    );
}
