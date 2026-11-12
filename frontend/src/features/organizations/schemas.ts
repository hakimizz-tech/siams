import { z } from 'zod';

export const organizationSchema = z.object({
    name: z.string().trim().min(1, 'Enter the organisation name').max(150),
    address: z.string().max(255).optional(),
    county: z.string().max(80).optional(),
    contact_email: z
        .union([z.literal(''), z.string().email('Enter a valid email address')])
        .optional(),
    contact_phone: z.string().max(32).optional(),
});

export type OrganizationValues = z.infer<typeof organizationSchema>;
