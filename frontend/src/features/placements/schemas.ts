import { z } from 'zod';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date');
const optionalEmail = z.union([z.literal(''), z.string().email('Enter a valid email address')]);

const placementBase = z.object({
    period: z.string().min(1, 'Choose an internship period'),
    organization: z.string().min(1, 'Choose or add an organisation'),
    role_title: z.string().max(150).optional(),
    department: z.string().max(150).optional(),
    task_description: z.string().optional(),
    start_date: dateOnly,
    end_date: dateOnly,
    proposed_supervisor_name: z.string().max(150).optional(),
    proposed_supervisor_email: optionalEmail.optional(),
    proposed_supervisor_phone: z.string().max(32).optional(),
});

const datesInOrder = (value: { start_date: string; end_date: string }) =>
    value.end_date >= value.start_date;
const ORDER_ERROR = {
    message: 'The end date must not be before the start date',
    path: ['end_date'],
};

/** Saving a draft needs very little. */
export const placementDraftSchema = placementBase.refine(datesInOrder, ORDER_ERROR);

/** Submitting needs the full details (mirrors PlacementService.submit on the backend). */
export const placementSubmitSchema = placementBase
    .extend({
        role_title: z.string().trim().min(1, 'Enter your role title').max(150),
        task_description: z.string().trim().min(1, 'Describe your tasks'),
        proposed_supervisor_name: z.string().trim().min(1, 'Enter your supervisor’s name').max(150),
        proposed_supervisor_email: z
            .string()
            .min(1, 'Enter your supervisor’s email')
            .email('Enter a valid email address'),
    })
    .refine(datesInOrder, ORDER_ERROR);

export const remarksSchema = z.object({
    remarks: z.string().trim().min(1, 'Remarks are required'),
});
export const terminateSchema = z.object({
    reason: z.string().trim().min(1, 'A reason is required'),
});

export const approveSchema = z
    .object({
        academic_supervisor: z.string().min(1, 'Choose an academic supervisor'),
        workplace_supervisor: z.string().optional(),
        invite_workplace_supervisor: z.boolean(),
        remarks: z.string().optional(),
    })
    .refine((value) => Boolean(value.workplace_supervisor) || value.invite_workplace_supervisor, {
        message: 'Choose a workplace supervisor or invite the one the student proposed',
        path: ['workplace_supervisor'],
    });

export const assignSchema = z
    .object({
        academic_supervisor: z.string().optional(),
        workplace_supervisor: z.string().optional(),
    })
    .refine((value) => Boolean(value.academic_supervisor) || Boolean(value.workplace_supervisor), {
        message: 'Choose at least one supervisor to change',
        path: ['academic_supervisor'],
    });

export type PlacementDraftValues = z.infer<typeof placementDraftSchema>;
export type PlacementSubmitValues = z.infer<typeof placementSubmitSchema>;
export type ApproveValues = z.infer<typeof approveSchema>;
