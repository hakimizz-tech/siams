/** The forms mirror the backend's rules. These tests pin the rules down. */
import { describe, expect, it } from 'vitest';
import {
    buildAssessmentSchema,
    parseRubricJson,
    toAssessmentPayload,
    weightsAddUp,
    weightsTotal,
} from '@/features/assessments/schemas';
import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    resetPasswordSchema,
} from '@/features/auth/schemas';
import { validateReportFile } from '@/features/final-report/schemas';
import {
    activitySchema,
    reviewSchema,
    validateImageFile,
    weekSchema,
} from '@/features/logbook/schemas';
import { noticeSchema } from '@/features/notices/schemas';
import { gradeBandsSchema, periodSchema } from '@/features/periods/schemas';
import {
    approveSchema,
    assignSchema,
    placementDraftSchema,
    placementSubmitSchema,
    remarksSchema,
} from '@/features/placements/schemas';
import { userSchema, validateCsvFile } from '@/features/users/schemas';
import { visitSchema } from '@/features/visits/schemas';
import type { Criterion } from '@/types/domain';

const paths = (result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[] }> } }) =>
    result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.path.join('.'));
const messages = (result: { success: boolean; error?: { issues: Array<{ message: string }> } }) =>
    result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.message);

const LONG = 'Fixed the login bug and wrote tests.'.padEnd(40, '.');

describe('auth forms', () => {
    it('validates login and reset requests', () => {
        expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
        expect(paths(loginSchema.safeParse({ email: 'nope', password: '' }))).toEqual(
            expect.arrayContaining(['email', 'password']),
        );
        expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
    });

    it('requires matching passwords of at least 8 characters', () => {
        expect(
            resetPasswordSchema.safeParse({
                new_password1: 'longenough',
                new_password2: 'longenough',
            }).success,
        ).toBe(true);
        const mismatch = resetPasswordSchema.safeParse({
            new_password1: 'longenough',
            new_password2: 'different',
        });
        expect(paths(mismatch)).toEqual(['new_password2']);
        expect(
            resetPasswordSchema.safeParse({ new_password1: 'short', new_password2: 'short' })
                .success,
        ).toBe(false);
        expect(
            changePasswordSchema.safeParse({
                old_password: '',
                new_password1: 'longenough',
                new_password2: 'longenough',
            }).success,
        ).toBe(false);
    });
});

describe('placement forms', () => {
    const base = {
        period: 'p1',
        organization: 'o1',
        start_date: '2026-09-08',
        end_date: '2026-12-01',
    };

    it('lets a draft be saved with only the essentials', () => {
        expect(placementDraftSchema.safeParse(base).success).toBe(true);
    });

    it('rejects an end date before the start date', () => {
        const result = placementDraftSchema.safeParse({ ...base, end_date: '2026-09-01' });
        expect(paths(result)).toEqual(['end_date']);
    });

    it('needs the full details to submit (mirrors PlacementService.submit)', () => {
        const empty = placementSubmitSchema.safeParse({
            ...base,
            role_title: '',
            task_description: '',
            proposed_supervisor_name: '',
            proposed_supervisor_email: '',
        });
        expect(paths(empty)).toEqual(
            expect.arrayContaining([
                'role_title',
                'task_description',
                'proposed_supervisor_name',
                'proposed_supervisor_email',
            ]),
        );
        expect(
            placementSubmitSchema.safeParse({
                ...base,
                role_title: 'Intern',
                task_description: 'Build tools',
                proposed_supervisor_name: 'Jane',
                proposed_supervisor_email: 'jane@acme.example',
            }).success,
        ).toBe(true);
    });

    it('requires remarks to return or reject', () => {
        expect(remarksSchema.safeParse({ remarks: '   ' }).success).toBe(false);
        expect(remarksSchema.safeParse({ remarks: 'Add a phone number.' }).success).toBe(true);
    });

    it('needs a workplace supervisor or the invite option to approve', () => {
        expect(
            approveSchema.safeParse({
                academic_supervisor: 'a',
                invite_workplace_supervisor: false,
            }).success,
        ).toBe(false);
        expect(
            approveSchema.safeParse({ academic_supervisor: 'a', invite_workplace_supervisor: true })
                .success,
        ).toBe(true);
        expect(
            approveSchema.safeParse({
                academic_supervisor: 'a',
                workplace_supervisor: 'w',
                invite_workplace_supervisor: false,
            }).success,
        ).toBe(true);
        expect(
            approveSchema.safeParse({ academic_supervisor: '', invite_workplace_supervisor: true })
                .success,
        ).toBe(false);
    });

    it('needs at least one supervisor to reassign', () => {
        expect(assignSchema.safeParse({}).success).toBe(false);
        expect(assignSchema.safeParse({ workplace_supervisor: 'w' }).success).toBe(true);
    });
});

describe('logbook rules', () => {
    const day = { work_date: '2026-11-09', hours: '8', description: LONG };

    it('accepts hours above 0 and up to 12, and a described activity', () => {
        expect(activitySchema.safeParse(day).success).toBe(true);
        expect(activitySchema.safeParse({ ...day, hours: 12 }).success).toBe(true);
    });

    it('rejects 0 hours, more than 12 hours and short descriptions', () => {
        expect(messages(activitySchema.safeParse({ ...day, hours: 0 }))).toContain(
            'Hours must be above 0',
        );
        expect(paths(activitySchema.safeParse({ ...day, hours: 13 }))).toEqual(['hours']);
        expect(paths(activitySchema.safeParse({ ...day, description: 'worked' }))).toEqual([
            'description',
        ]);
    });

    it('keeps days inside the week and unique', () => {
        const week = {
            week_start: '2026-11-09',
            activities: [day, { ...day, work_date: '2026-11-10' }],
        };
        expect(weekSchema.safeParse(week).success).toBe(true);
        expect(
            paths(
                weekSchema.safeParse({
                    ...week,
                    activities: [{ ...day, work_date: '2026-11-16' }],
                }),
            ),
        ).toEqual(['activities.0.work_date']);
        expect(paths(weekSchema.safeParse({ ...week, activities: [day, day] }))).toEqual([
            'activities.1.work_date',
        ]);
        expect(weekSchema.safeParse({ ...week, activities: [] }).success).toBe(false);
    });

    it('lets a supervisor reduce hours only with a comment, never raise them', () => {
        const row = { work_date: '2026-11-09', claimed_hours: 8, approved_hours: 6 };
        expect(paths(reviewSchema.safeParse({ adjustments: [row] }))).toEqual(['comment']);
        expect(reviewSchema.safeParse({ adjustments: [row], comment: 'Left early.' }).success).toBe(
            true,
        );
        expect(
            paths(
                reviewSchema.safeParse({
                    adjustments: [{ ...row, approved_hours: 9 }],
                    comment: 'x',
                }),
            ),
        ).toEqual(['adjustments.0.approved_hours']);
        expect(
            reviewSchema.safeParse({ adjustments: [{ ...row, approved_hours: 8 }] }).success,
        ).toBe(true);
        expect(reviewSchema.safeParse({ adjustments: [] }).success).toBe(true);
    });

    it('checks images before upload', () => {
        expect(validateImageFile({ name: 'a.PNG', size: 1000 }, 0)).toBeNull();
        expect(validateImageFile({ name: 'a.png', size: 1000 }, 5)).toMatch(/at most 5/);
        expect(validateImageFile({ name: 'a.gif', size: 1000 }, 0)).toMatch(/JPEG, PNG or WebP/);
        expect(validateImageFile({ name: 'a.jpg', size: 6 * 1024 * 1024 }, 0)).toMatch(/5 MB/);
    });
});

describe('uploads', () => {
    it('checks the final report', () => {
        expect(validateReportFile({ name: 'report.pdf', size: 1000 })).toBeNull();
        expect(validateReportFile({ name: 'report.DOCX', size: 1000 })).toBeNull();
        expect(validateReportFile({ name: 'report.exe', size: 1000 })).toMatch(/PDF, DOC or DOCX/);
        expect(validateReportFile({ name: 'report.pdf', size: 11 * 1024 * 1024 })).toMatch(/10 MB/);
    });

    it('checks the user CSV', () => {
        expect(validateCsvFile({ name: 'users.csv', size: 100 })).toBeNull();
        expect(validateCsvFile({ name: 'users.xlsx', size: 100 })).toMatch(/\.csv/);
        expect(validateCsvFile({ name: 'users.csv', size: 3 * 1024 * 1024 })).toMatch(/2 MB/);
    });
});

describe('administration forms', () => {
    it('validates periods', () => {
        const period = {
            name: '2027',
            type: 'ATTACHMENT',
            start_date: '2027-01-04',
            end_date: '2027-04-30',
            required_hours: '400',
            min_visits: '2',
        };
        expect(periodSchema.safeParse(period).success).toBe(true);
        expect(paths(periodSchema.safeParse({ ...period, end_date: '2026-12-31' }))).toEqual([
            'end_date',
        ]);
        expect(periodSchema.safeParse({ ...period, required_hours: '0' }).success).toBe(false);
    });

    it('needs grade bands that start at 0 with unique values', () => {
        expect(
            gradeBandsSchema.safeParse([
                { min_percent: '70', label: 'A' },
                { min_percent: '0', label: 'F' },
            ]).success,
        ).toBe(true);
        expect(messages(gradeBandsSchema.safeParse([{ min_percent: '70', label: 'A' }]))).toContain(
            'Include a band that starts at 0',
        );
        expect(
            gradeBandsSchema.safeParse([
                { min_percent: '0', label: 'A' },
                { min_percent: '0', label: 'B' },
            ]).success,
        ).toBe(false);
        expect(
            gradeBandsSchema.safeParse([
                { min_percent: '0', label: 'A' },
                { min_percent: '50', label: 'A' },
            ]).success,
        ).toBe(false);
        expect(gradeBandsSchema.safeParse([{ min_percent: '101', label: 'A' }]).success).toBe(
            false,
        );
    });

    it('requires a registration number for students only', () => {
        const user = { email: 'a@b.co', full_name: 'A', role: 'STUDENT' };
        expect(paths(userSchema.safeParse(user))).toEqual(['registration_number']);
        expect(userSchema.safeParse({ ...user, registration_number: 'S1' }).success).toBe(true);
        expect(userSchema.safeParse({ ...user, role: 'COORDINATOR' }).success).toBe(true);
    });

    it('validates notices and visits', () => {
        const notice = { title: 'T', body: 'B', audience: 'ALL' };
        expect(noticeSchema.safeParse(notice).success).toBe(true);
        expect(
            paths(
                noticeSchema.safeParse({
                    ...notice,
                    publish_at: '2026-11-10T08:00',
                    expires_at: '2026-11-09T08:00',
                }),
            ),
        ).toEqual(['expires_at']);
        expect(
            visitSchema.safeParse({ mode: 'VIDEO', scheduled_at: '2026-11-20T10:00' }).success,
        ).toBe(true);
        expect(
            visitSchema.safeParse({
                mode: 'VIDEO',
                scheduled_at: '2026-11-20T10:00',
                meeting_link: 'not a link',
            }).success,
        ).toBe(false);
        expect(visitSchema.safeParse({ mode: 'FAX', scheduled_at: 'x' }).success).toBe(false);
    });
});

// ---------------------------------------------------------------------------------------------
// The rubric is data: the evaluation form is generated from it.
// ---------------------------------------------------------------------------------------------
const criterion = (overrides: Partial<Criterion>): Criterion => ({
    id: 'c',
    code: 'X',
    section: 'S',
    name: 'N',
    type: 'SCORE',
    max_score: 10,
    weight: 1,
    required: true,
    position: 0,
    ...overrides,
});

const criteria: Criterion[] = [
    criterion({ id: 'req', code: 'W01' }),
    criterion({ id: 'opt', code: 'W02', required: false, position: 1 }),
    criterion({
        id: 'say',
        code: 'W99',
        type: 'COMMENT',
        max_score: null,
        required: true,
        position: 2,
    }),
];

describe('evaluation form generated from the rubric', () => {
    const schema = buildAssessmentSchema(criteria);

    it('accepts a complete form and skips optional scores', () => {
        expect(
            schema.safeParse({ scores: { req: { score: '8' }, say: { remark: 'Strong intern.' } } })
                .success,
        ).toBe(true);
    });

    it('requires required scores and comments', () => {
        const result = schema.safeParse({ scores: {} });
        expect(paths(result)).toEqual(['scores.req.score', 'scores.say.remark']);
        expect(messages(result)).toEqual(['Enter a score', 'Enter a comment']);
    });

    it('keeps scores whole and between 0 and the criterion maximum', () => {
        const base = { say: { remark: 'ok' } };
        expect(messages(schema.safeParse({ scores: { ...base, req: { score: '11' } } }))).toEqual([
            'Enter a score between 0 and 10',
        ]);
        expect(messages(schema.safeParse({ scores: { ...base, req: { score: '-1' } } }))).toEqual([
            'Enter a score between 0 and 10',
        ]);
        expect(messages(schema.safeParse({ scores: { ...base, req: { score: '5.5' } } }))).toEqual([
            'Use a whole number',
        ]);
        expect(schema.safeParse({ scores: { ...base, req: { score: 10 } } }).success).toBe(true);
        expect(schema.safeParse({ scores: { ...base, req: { score: 0 } } }).success).toBe(true);
    });

    it('builds the API payload without empty scores', () => {
        const payload = toAssessmentPayload('form1', criteria, {
            comment: 'Overall good',
            scores: {
                req: { score: '8' },
                opt: { score: '' },
                say: { remark: '  Strong intern.  ' },
            },
        });
        expect(payload).toEqual({
            form: 'form1',
            comment: 'Overall good',
            scores: [
                { criterion: 'req', score: 8, remark: '' },
                { criterion: 'say', score: null, remark: 'Strong intern.' },
            ],
        });
    });
});

describe('rubric import', () => {
    const valid = {
        name: 'Industrial Supervisor Evaluation',
        assessor_role: 'WORKPLACE_SUPERVISOR',
        weight_percent: 60,
        criteria: [
            { code: 'W01', name: 'Punctuality', type: 'SCORE', max_score: 10 },
            { code: 'W99', name: 'Comment', type: 'COMMENT' },
        ],
    };
    const parse = (value: unknown) => parseRubricJson(JSON.stringify(value));

    it('accepts a valid official form', () => {
        const result = parse(valid);
        expect(result.ok).toBe(true);
    });

    it.each([
        ['broken JSON', '{nope', /not valid JSON/],
        ['an array', '[]', /JSON object/],
    ])('rejects %s', (_label, text, pattern) => {
        const result = parseRubricJson(text);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toMatch(pattern);
    });

    it.each([
        ['no name', { ...valid, name: '' }, /needs a name/],
        ['a student role', { ...valid, assessor_role: 'STUDENT' }, /assessor_role/],
        ['weight above 100', { ...valid, weight_percent: 140 }, /weight_percent/],
        ['no criteria', { ...valid, criteria: [] }, /at least one criterion/],
        [
            'duplicate codes',
            { ...valid, criteria: [valid.criteria[0], valid.criteria[0]] },
            /used twice/,
        ],
        [
            'a score without a maximum',
            { ...valid, criteria: [{ code: 'A', name: 'N', type: 'SCORE' }] },
            /max_score/,
        ],
        [
            'an unknown type',
            { ...valid, criteria: [{ code: 'A', name: 'N', type: 'MAGIC' }] },
            /unknown type/,
        ],
    ])('rejects %s', (_label, value, pattern) => {
        const result = parse(value);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toMatch(pattern);
    });

    it('checks that active form weights add up to 100', () => {
        const forms = [
            { weight_percent: '60.00', is_active: true },
            { weight_percent: '40', is_active: true },
            { weight_percent: '30', is_active: false },
        ];
        expect(weightsTotal(forms)).toBe(100);
        expect(weightsAddUp(forms)).toBe(true);
        expect(
            weightsAddUp([
                { weight_percent: 60, is_active: true },
                { weight_percent: 30, is_active: true },
            ]),
        ).toBe(false);
    });
});
