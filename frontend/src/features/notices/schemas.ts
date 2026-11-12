import { z } from 'zod';

export const noticeSchema = z
    .object({
        title: z.string().trim().min(1, 'Enter a title').max(200),
        body: z.string().trim().min(1, 'Write the notice'),
        audience: z.enum(['ALL', 'STUDENTS', 'ACADEMIC_SUPERVISORS', 'WORKPLACE_SUPERVISORS']),
        period: z.string().optional(),
        pinned: z.boolean().optional(),
        publish_at: z.string().optional(),
        expires_at: z.string().optional(),
        send_email: z.boolean().optional(),
    })
    .refine(
        (value) => !value.publish_at || !value.expires_at || value.expires_at > value.publish_at,
        {
            message: 'The notice must expire after it is published',
            path: ['expires_at'],
        },
    );

export type NoticeValues = z.infer<typeof noticeSchema>;
