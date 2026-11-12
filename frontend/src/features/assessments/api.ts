import { get, patch, post, put } from '@/lib/api/endpoints';
import type {
    Assessment,
    AssessmentForm,
    CriterionType,
    PlacementResult,
    Role,
} from '@/types/domain';

export interface CriterionInput {
    code: string;
    section?: string;
    name: string;
    type?: CriterionType;
    max_score?: number | null;
    weight?: number | string;
    required?: boolean;
}

export interface FormInput {
    name: string;
    assessor_role: Extract<Role, 'WORKPLACE_SUPERVISOR' | 'ACADEMIC_SUPERVISOR'>;
    weight_percent: number | string;
    is_active?: boolean;
    criteria: CriterionInput[];
}

export interface FormPatchInput {
    name?: string;
    weight_percent?: number | string;
    is_active?: boolean;
}

export interface AssessmentInput {
    form: string;
    comment?: string;
    scores: Array<{ criterion: string; score?: number | null; remark?: string }>;
}

export interface AssessmentUpdateInput {
    comment?: string;
    scores?: AssessmentInput['scores'];
}

//  rubric forms (coordinator manages; supervisors and students read)
export const listForms = (periodId: string, signal?: AbortSignal) =>
    get<AssessmentForm[]>('/api/v1/periods/{period_id}/assessment-forms/', {
        path: { period_id: periodId },
        signal,
    });

export const createForm = (periodId: string, body: FormInput) =>
    post<AssessmentForm>('/api/v1/periods/{period_id}/assessment-forms/', {
        path: { period_id: periodId },
        body,
    });

/** The institution's official form as JSON, plus the period id. */
export const importForm = (body: FormInput & { period: string }) =>
    post<AssessmentForm>('/api/v1/assessment-forms/import/', { body });

export const getForm = (id: string, signal?: AbortSignal) =>
    get<AssessmentForm>('/api/v1/assessment-forms/{id}/', { path: { id }, signal });

export const replaceForm = (id: string, body: FormInput) =>
    put<AssessmentForm>('/api/v1/assessment-forms/{id}/', { path: { id }, body });

export const patchForm = (id: string, body: FormPatchInput) =>
    patch<AssessmentForm>('/api/v1/assessment-forms/{id}/', { path: { id }, body });

export const newFormVersion = (id: string) =>
    post<AssessmentForm>('/api/v1/assessment-forms/{id}/new-version/', { path: { id } });

//  assessments
export const listAssessments = (placementId: string, signal?: AbortSignal) =>
    get<Assessment[]>('/api/v1/placements/{placement_id}/assessments/', {
        path: { placement_id: placementId },
        signal,
    });

export const createAssessment = (placementId: string, body: AssessmentInput) =>
    post<Assessment>('/api/v1/placements/{placement_id}/assessments/', {
        path: { placement_id: placementId },
        body,
    });

export const getAssessment = (id: string, signal?: AbortSignal) =>
    get<Assessment>('/api/v1/assessments/{id}/', { path: { id }, signal });

export const updateAssessment = (id: string, body: AssessmentUpdateInput) =>
    patch<Assessment>('/api/v1/assessments/{id}/', { path: { id }, body });

export const submitAssessment = (id: string) =>
    post<Assessment>('/api/v1/assessments/{id}/submit/', { path: { id } });

//  result
/** Preview for coordinator and academic supervisor; the released result for a student (404 before). */
export const getResult = (placementId: string, signal?: AbortSignal) =>
    get<PlacementResult>('/api/v1/placements/{placement_id}/result/', {
        path: { placement_id: placementId },
        signal,
    });

export const finalizeResult = (placementId: string) =>
    post<PlacementResult>('/api/v1/placements/{placement_id}/finalize/', {
        path: { placement_id: placementId },
    });
