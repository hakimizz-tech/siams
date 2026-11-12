import { z } from 'zod';

const email = z.string().min(1, 'Enter your email').email('Enter a valid email address');
const newPassword = z.string().min(8, 'Use at least 8 characters');

export const loginSchema = z.object({
    email,
    password: z.string().min(1, 'Enter your password'),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
    .object({ new_password1: newPassword, new_password2: z.string().min(1, 'Repeat the password') })
    .refine((value) => value.new_password1 === value.new_password2, {
        message: 'The passwords do not match',
        path: ['new_password2'],
    });

export const changePasswordSchema = z
    .object({
        old_password: z.string().min(1, 'Enter your current password'),
        new_password1: newPassword,
        new_password2: z.string().min(1, 'Repeat the password'),
    })
    .refine((value) => value.new_password1 === value.new_password2, {
        message: 'The passwords do not match',
        path: ['new_password2'],
    });

export const profileSchema = z.object({
    full_name: z.string().trim().min(1, 'Enter your name').max(150),
    phone: z.string().max(32).optional(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
