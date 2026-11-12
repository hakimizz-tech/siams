import { z } from 'zod';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date');

export const periodSchema = z
    .object({
        name: z.string().trim().min(1, 'Enter a name').max(150),
        type: z.enum(['INTERNSHIP', 'ATTACHMENT']),
        start_date: dateOnly,
        end_date: dateOnly,
        required_hours: z.coerce.number().int().positive('Hours must be above 0'),
        min_visits: z.coerce.number().int().min(0, 'Cannot be negative'),
        assessment_opens_on: z.union([z.literal(''), dateOnly]).optional(),
    })
    .refine((value) => value.end_date >= value.start_date, {
        message: 'The end date must not be before the start date',
        path: ['end_date'],
    });

export const gradeBandsSchema = z
    .array(
        z.object({
            min_percent: z.coerce
                .number()
                .min(0, 'Between 0 and 100')
                .max(100, 'Between 0 and 100'),
            label: z.string().trim().min(1, 'Enter a grade label').max(20),
        }),
    )
    .min(1, 'Add at least one band')
    .superRefine((bands, ctx) => {
        if (!bands.some((band) => band.min_percent === 0)) {
            ctx.addIssue({ code: 'custom', message: 'Include a band that starts at 0' });
        }
        const percents = new Set<number>();
        const labels = new Set<string>();
        for (const band of bands) {
            if (percents.has(band.min_percent) || labels.has(band.label)) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'Band percents and labels must be unique',
                });
                break;
            }
            percents.add(band.min_percent);
            labels.add(band.label);
        }
    });
