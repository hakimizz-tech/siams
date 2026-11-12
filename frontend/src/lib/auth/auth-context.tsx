import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearAccessToken, onSessionExpired } from '@/lib/api/auth-token';
import { refreshSession } from '@/lib/api/client';
import { broadcastLogout, initAuthSync } from '@/lib/api/refresh';
import type { User } from '@/types/domain';
import { fetchMe, loginRequest, logoutRequest } from './session-api';

export type SessionStatus = 'bootstrapping' | 'anonymous' | 'authenticated';

export interface AuthContextValue {
    status: SessionStatus;
    user: User | null;
    login: (email: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
    reloadUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface SessionState {
    status: SessionStatus;
    user: User | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [state, setState] = useState<SessionState>({ status: 'bootstrapping', user: null });

    const endSession = useCallback(() => {
        clearAccessToken();
        queryClient.clear(); // nothing from this user may be shown to the next one
        setState({ status: 'anonymous', user: null });
    }, [queryClient]);

    // Bootstrap: the HttpOnly refresh cookie (if any) yields a fresh access token.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await refreshSession();
                const user = await fetchMe();
                if (!cancelled) setState({ status: 'authenticated', user });
            } catch {
                if (!cancelled) {
                    clearAccessToken();
                    setState({ status: 'anonymous', user: null });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => onSessionExpired(endSession), [endSession]);
    useEffect(() => initAuthSync(endSession), [endSession]);

    const login = useCallback(async (email: string, password: string) => {
        await loginRequest(email, password);
        const user = await fetchMe();
        setState({ status: 'authenticated', user });
        return user;
    }, []);

    const logout = useCallback(async () => {
        try {
            await logoutRequest();
        } catch {
            // the local session ends regardless
        }
        broadcastLogout();
        endSession();
    }, [endSession]);

    const reloadUser = useCallback(async () => {
        const user = await fetchMe();
        setState({ status: 'authenticated', user });
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({ ...state, login, logout, reloadUser }),
        [state, login, logout, reloadUser],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
