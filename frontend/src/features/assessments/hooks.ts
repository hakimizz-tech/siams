import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/api/cache';
import { useApiMutation } from '@/lib/api/hooks-utils';
import { qk } from '@/lib/api/query-keys';
import * as api from './api';

export const useAssessmentForms = (periodId: string | undefined) =>
    useQuery({
        queryKey: qk.assessmentForms.forPeriod(periodId ?? ''),
        queryFn: ({ signal }) => api.listForms(periodId as string, signal),
        enabled: Boolean(periodId),
        staleTime: STALE.reference,
    });

export const useAssessmentForm = (id: string | undefined) =>
    useQuery({
        queryKey: qk.assessmentForms.detail(id ?? ''),
        queryFn: ({ signal }) => api.getForm(id as string, signal),
        enabled: Boolean(id),
        staleTime: STALE.reference,
    });

const formsChanged = () => [qk.assessmentForms.all()] as const;

export const useCreateForm = () =>
    useApiMutation({
        mutationFn: (v: { periodId: string; body: api.FormInput }) =>
            api.createForm(v.periodId, v.body),
        invalidate: formsChanged,
    });

export const useImportForm = () =>
    useApiMutation({
        mutationFn: (body: api.FormInput & { period: string }) => api.importForm(body),
        invalidate: formsChanged,
    });

export const useReplaceForm = () =>
    useApiMutation({
        mutationFn: (v: { id: string; body: api.FormInput }) => api.replaceForm(v.id, v.body),
        invalidate: formsChanged,
    });

export const usePatchForm = () =>
    useApiMutation({
        mutationFn: (v: { id: string; body: api.FormPatchInput }) => api.patchForm(v.id, v.body),
        invalidate: formsChanged,
    });

export const useNewFormVersion = () =>
    useApiMutation({
        mutationFn: (id: string) => api.newFormVersion(id),
        invalidate: formsChanged,
    });

export const useAssessments = (placementId: string | undefined) =>
    useQuery({
        queryKey: qk.assessments.forPlacement(placementId ?? ''),
        queryFn: ({ signal }) => api.listAssessments(placementId as string, signal),
        enabled: Boolean(placementId),
        staleTime: STALE.list,
    });

export const useAssessment = (id: string | undefined) =>
    useQuery({
        queryKey: qk.assessments.detail(id ?? ''),
        queryFn: ({ signal }) => api.getAssessment(id as string, signal),
        enabled: Boolean(id),
        staleTime: STALE.detail,
    });

/** 404 means "not released yet" for a student: a normal state, so no retries. */
export const useResult = (placementId: string | undefined) =>
    useQuery({
        queryKey: qk.result(placementId ?? ''),
        queryFn: ({ signal }) => api.getResult(placementId as string, signal),
        enabled: Boolean(placementId),
        staleTime: STALE.detail,
        retry: false,
    });

const assessmentChanged = (placementId?: string) =>
    [
        qk.assessments.all(),
        ...(placementId ? [qk.result(placementId)] : []),
        qk.dashboards(),
    ] as const;

export const useCreateAssessment = () =>
    useApiMutation({
        mutationFn: (v: { placementId: string; body: api.AssessmentInput }) =>
            api.createAssessment(v.placementId, v.body),
        invalidate: (v) => assessmentChanged(v.placementId),
    });

export const useUpdateAssessment = () =>
    useApiMutation({
        mutationFn: (v: { id: string; body: api.AssessmentUpdateInput }) =>
            api.updateAssessment(v.id, v.body),
        invalidate: () => assessmentChanged(),
    });

export const useSubmitAssessment = () =>
    useApiMutation({
        mutationFn: (v: { id: string; placementId?: string }) => api.submitAssessment(v.id),
        invalidate: (v) => assessmentChanged(v.placementId),
    });

export const useFinalizeResult = () =>
    useApiMutation({
        mutationFn: (placementId: string) => api.finalizeResult(placementId),
        invalidate: (placementId) => [
            qk.result(placementId),
            qk.assessments.all(),
            qk.dashboards(),
            qk.reports.all(),
        ],
    });
