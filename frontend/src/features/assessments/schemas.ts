import { z } from 'zod';
import type { AssessmentForm, Criterion } from '@/types/domain';
import type { AssessmentInput, FormInput } from './api';

// Evaluation form generated from the rubric data returned by the API. Nothing about the
// institution's rubric is hard-coded in the frontend.
const entry = z.object({
    score: z.union([z.string(), z.number()]).nullish(),
    remark: z.string().optional(),
});

const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === '';

export function buildAssessmentSchema(criteria: Criterion[]) {
    return z
        .object({ comment: z.string().optional(), scores: z.record(z.string(), entry) })
        .superRefine((value, ctx) => {
            for (const criterion of criteria) {
                const current = value.scores[criterion.id];
                if (criterion.type === 'COMMENT') {
                    if (criterion.required && !current?.remark?.trim()) {
                        ctx.addIssue({
                            code: 'custom',
                            message: 'Enter a comment',
                            path: ['scores', criterion.id, 'remark'],
                        });
                    }
                    continue;
                }
                const raw = current?.score;
                if (isEmpty(raw)) {
                    if (criterion.required) {
                        ctx.addIssue({
                            code: 'custom',
                            message: 'Enter a score',
                            path: ['scores', criterion.id, 'score'],
                        });
                    }
                    continue;
                }
                const number = Number(raw);
                const max = criterion.max_score ?? 0;
                if (!Number.isInteger(number)) {
                    ctx.addIssue({
                        code: 'custom',
                        message: 'Use a whole number',
                        path: ['scores', criterion.id, 'score'],
                    });
                } else if (number < 0 || number > max) {
                    ctx.addIssue({
                        code: 'custom',
                        message: `Enter a score between 0 and ${max}`,
                        path: ['scores', criterion.id, 'score'],
                    });
                }
            }
        });
}

export type AssessmentFormValues = {
    comment?: string;
    scores: Record<string, { score?: string | number | null; remark?: string }>;
};

/** Form values to the API body (empty scores are left out). */
export function toAssessmentPayload(
    formId: string,
    criteria: Criterion[],
    values: AssessmentFormValues,
): AssessmentInput {
    const scores: AssessmentInput['scores'] = [];
    for (const criterion of criteria) {
        const current = values.scores[criterion.id];
        if (criterion.type === 'COMMENT') {
            if (current?.remark?.trim()) {
                scores.push({
                    criterion: criterion.id,
                    score: null,
                    remark: current.remark.trim(),
                });
            }
        } else if (!isEmpty(current?.score)) {
            scores.push({
                criterion: criterion.id,
                score: Number(current?.score),
                remark: current?.remark ?? '',
            });
        }
    }
    return { form: formId, comment: values.comment ?? '', scores };
}

// Rubric import: the coordinator pastes or uploads the official form as JSON.
export type RubricParse = { ok: true; data: FormInput } | { ok: false; error: string };

const ASSESSOR_ROLES = ['WORKPLACE_SUPERVISOR', 'ACADEMIC_SUPERVISOR'] as const;

export function parseRubricJson(text: string): RubricParse {
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        return { ok: false, error: 'This is not valid JSON.' };
    }
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        return { ok: false, error: 'The form must be a JSON object.' };
    }
    const form = raw as Record<string, unknown>;
    if (typeof form.name !== 'string' || !form.name.trim())
        return { ok: false, error: 'The form needs a name.' };
    if (!ASSESSOR_ROLES.includes(form.assessor_role as (typeof ASSESSOR_ROLES)[number])) {
        return {
            ok: false,
            error: 'assessor_role must be WORKPLACE_SUPERVISOR or ACADEMIC_SUPERVISOR.',
        };
    }
    const weight = Number(form.weight_percent);
    if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
        return { ok: false, error: 'weight_percent must be a number from 0 to 100.' };
    }
    if (!Array.isArray(form.criteria) || form.criteria.length === 0) {
        return { ok: false, error: 'The form needs at least one criterion.' };
    }
    const codes = new Set<string>();
    for (const item of form.criteria as Array<Record<string, unknown>>) {
        const code = typeof item?.code === 'string' ? item.code.trim() : '';
        if (!code || typeof item.name !== 'string' || !item.name.trim()) {
            return { ok: false, error: 'Every criterion needs a code and a name.' };
        }
        if (codes.has(code)) return { ok: false, error: `Criterion code "${code}" is used twice.` };
        codes.add(code);
        const type = item.type ?? 'SCORE';
        if (type !== 'SCORE' && type !== 'COMMENT') {
            return { ok: false, error: `Criterion "${code}" has an unknown type.` };
        }
        if (type === 'SCORE' && !(Number(item.max_score) > 0)) {
            return { ok: false, error: `Criterion "${code}" needs a max_score above 0.` };
        }
    }
    return { ok: true, data: form as unknown as FormInput };
}

/** Active form weights must add up to 100 before results can be finalized. */
export function weightsTotal(
    forms: Pick<AssessmentForm, 'weight_percent' | 'is_active'>[],
): number {
    return forms
        .filter((form) => form.is_active)
        .reduce((sum, form) => sum + Number(form.weight_percent), 0);
}

export const weightsAddUp = (
    forms: Pick<AssessmentForm, 'weight_percent' | 'is_active'>[],
): boolean => Math.abs(weightsTotal(forms) - 100) < 0.005;
