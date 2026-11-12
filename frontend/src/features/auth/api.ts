import { patch, post } from '@/lib/api/endpoints';
import type { User } from '@/types/domain';

export interface PasswordResetConfirmInput {
    uid: string;
    token: string;
    new_password1: string;
    new_password2: string;
}

export interface PasswordChangeInput {
    old_password?: string;
    new_password1: string;
    new_password2: string;
}

export interface ProfileInput {
    full_name?: string;
    phone?: string;
}

interface Detail {
    detail?: string;
}

export const requestPasswordReset = (email: string) =>
    post<Detail>('/api/v1/auth/password/reset/', { body: { email } });

export const confirmPasswordReset = (body: PasswordResetConfirmInput) =>
    post<Detail>('/api/v1/auth/password/reset/confirm/', { body });

export const changePassword = (body: PasswordChangeInput) =>
    post<Detail>('/api/v1/auth/password/change/', { body });

export const updateMe = (body: ProfileInput) => patch<User>('/api/v1/users/me/', { body });
