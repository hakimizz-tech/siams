import { z } from 'zod';
import { MAX_CSV_MB, mbToBytes } from '@/config/limits';
import { ROLES } from '@/types/domain';

export const userSchema = z
    .object({
        email: z.string().min(1, 'Enter an email').email('Enter a valid email address'),
        full_name: z.string().trim().min(1, 'Enter a name').max(150),
        role: z.enum(ROLES),
        phone: z.string().max(32).optional(),
        registration_number: z.string().max(50).optional(),
        programme: z.string().max(150).optional(),
        year_of_study: z.coerce.number().int().min(1).max(10).optional(),
        organization: z.string().optional(),
        job_title: z.string().max(150).optional(),
        department: z.string().max(150).optional(),
        send_invite: z.boolean().optional(),
    })
    .refine((value) => value.role !== 'STUDENT' || Boolean(value.registration_number?.trim()), {
        message: 'Students need a registration number',
        path: ['registration_number'],
    });

export type UserValues = z.infer<typeof userSchema>;

/** Client-side check before uploading a CSV (the server validates again). */
export function validateCsvFile(file: { name: string; size: number }): string | null {
    if (!file.name.toLowerCase().endsWith('.csv')) return 'Upload a .csv file.';
    if (file.size > mbToBytes(MAX_CSV_MB)) return `The file is larger than ${MAX_CSV_MB} MB.`;
    return null;
}
