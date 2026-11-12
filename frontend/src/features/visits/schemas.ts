import { z } from 'zod';

export const visitSchema = z.object({
    mode: z.enum(['PHONE', 'VIDEO', 'ONSITE']),
    scheduled_at: z.string().min(1, 'Choose a date and time'),
    meeting_link: z.union([z.literal(''), z.string().url('Enter a valid link')]).optional(),
    notes: z.string().optional(),
});

export const completeVisitSchema = z.object({
    notes: z.string().trim().min(1, 'Record your findings'),
});

export type VisitValues = z.infer<typeof visitSchema>;
