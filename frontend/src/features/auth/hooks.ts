import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/errors';
import { useApiMutation } from '@/lib/api/hooks-utils';
import { useAuth } from '@/lib/auth/use-auth';
import type { User } from '@/types/domain';
import * as api from './api';

export function useLogin() {
    const { login } = useAuth();
    return useMutation<User, ApiError, { email: string; password: string }>({
        mutationFn: ({ email, password }) => login(email, password),
    });
}

export function useLogout() {
    const { logout } = useAuth();
    return useMutation<void, ApiError, void>({ mutationFn: () => logout() });
}

export const useRequestPasswordReset = () =>
    useApiMutation({ mutationFn: (email: string) => api.requestPasswordReset(email) });

export const useConfirmPasswordReset = () =>
    useApiMutation({
        mutationFn: (body: api.PasswordResetConfirmInput) => api.confirmPasswordReset(body),
    });

export const useChangePassword = () =>
    useApiMutation({ mutationFn: (body: api.PasswordChangeInput) => api.changePassword(body) });

export function useUpdateMe() {
    const { reloadUser } = useAuth();
    return useApiMutation({
        mutationFn: (body: api.ProfileInput) => api.updateMe(body),
        onSuccess: () => {
            void reloadUser();
        },
    });
}
