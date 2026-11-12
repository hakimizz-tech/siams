import { addDays, parseISO } from 'date-fns';
import { z } from 'zod';
import {
    IMAGE_ACCEPT,
    MAX_HOURS_PER_DAY,
    MAX_IMAGES_PER_WEEK,
    MAX_IMAGE_MB,
    MIN_ACTIVITY_CHARS,
    mbToBytes,
} from '@/config/limits';
import { toDateOnly } from '@/lib/format';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date');

export const activitySchema = z.object({
    work_date: dateOnly,
    hours: z.coerce
        .number()
        .gt(0, 'Hours must be above 0')
        .max(MAX_HOURS_PER_DAY, `At most ${MAX_HOURS_PER_DAY} hours a day`),
    description: z
        .string()
        .trim()
        .min(
            MIN_ACTIVITY_CHARS,
            `Describe what you did (at least ${MIN_ACTIVITY_CHARS} characters)`,
        ),
});

/** One logbook week: daily lines inside the week, no repeated day. */
export const weekSchema = z
    .object({
        week_start: dateOnly,
        summary: z.string().optional(),
        activities: z.array(activitySchema).min(1, 'Add at least one day'),
    })
    .superRefine((value, ctx) => {
        const start = value.week_start;
        const end = toDateOnly(addDays(parseISO(start), 6));
        const seen = new Set<string>();
        value.activities.forEach((activity, index) => {
            if (activity.work_date < start || activity.work_date > end) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'This day is outside the week',
                    path: ['activities', index, 'work_date'],
                });
            }
            if (seen.has(activity.work_date)) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'This day is entered twice',
                    path: ['activities', index, 'work_date'],
                });
            }
            seen.add(activity.work_date);
        });
    });

/** Supervisor approval. Adjusted hours may never exceed claimed hours and need a comment. */
export const reviewSchema = z
    .object({
        adjustments: z.array(
            z.object({
                work_date: dateOnly,
                claimed_hours: z.coerce.number().min(0),
                approved_hours: z.coerce.number().min(0, 'Cannot be negative'),
            }),
        ),
        comment: z.string().optional(),
    })
    .superRefine((value, ctx) => {
        let adjusted = false;
        value.adjustments.forEach((row, index) => {
            if (row.approved_hours > row.claimed_hours) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'Approved hours cannot exceed the hours claimed',
                    path: ['adjustments', index, 'approved_hours'],
                });
            }
            if (row.approved_hours < row.claimed_hours) adjusted = true;
        });
        if (adjusted && !value.comment?.trim()) {
            ctx.addIssue({
                code: 'custom',
                message: 'A comment is required when you adjust hours',
                path: ['comment'],
            });
        }
    });

export const returnWeekSchema = z.object({
    comment: z.string().trim().min(1, 'A comment is required'),
});
export const reopenWeekSchema = z.object({
    reason: z.string().trim().min(1, 'A reason is required'),
});
export const feedbackSchema = z.object({ comment: z.string().trim().min(1, 'Write a comment') });

const IMAGE_EXTENSIONS: string[] = Object.values(IMAGE_ACCEPT).flat();

/** Client-side image check (UX only). `currentCount` = images already on the week. */
export function validateImageFile(
    file: { name: string; size: number },
    currentCount: number,
): string | null {
    if (currentCount >= MAX_IMAGES_PER_WEEK) {
        return `A week can have at most ${MAX_IMAGES_PER_WEEK} images.`;
    }
    const lower = file.name.toLowerCase();
    if (!IMAGE_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
        return 'Use a JPEG, PNG or WebP image.';
    }
    if (file.size > mbToBytes(MAX_IMAGE_MB)) return `The image is larger than ${MAX_IMAGE_MB} MB.`;
    return null;
}

export type WeekValues = z.infer<typeof weekSchema>;
export type ReviewValues = z.infer<typeof reviewSchema>;
