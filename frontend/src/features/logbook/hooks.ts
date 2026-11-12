import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/api/cache';
import { useApiMutation } from '@/lib/api/hooks-utils';
import type { PageParams } from '@/lib/api/pagination';
import { qk } from '@/lib/api/query-keys';
import * as api from './api';

export const useLogbookWeeks = (
    placementId: string | undefined,
    filters: api.LogbookFilters = {},
) =>
    useQuery({
        queryKey: qk.logbook.list(placementId ?? '', filters),
        queryFn: ({ signal }) => api.listLogbook(placementId as string, filters, signal),
        enabled: Boolean(placementId),
        staleTime: STALE.list,
    });

export const useLogbookTimeline = (placementId: string | undefined) =>
    useQuery({
        queryKey: qk.logbook.timeline(placementId ?? ''),
        queryFn: ({ signal }) => api.getLogbookTimeline(placementId as string, signal),
        enabled: Boolean(placementId),
        staleTime: STALE.list,
    });

/** Screens with an open form should pass refetchOnWindowFocus: false so typing is never overwritten. */
export const useLogbookEntry = (
    id: string | undefined,
    options: { refetchOnWindowFocus?: boolean } = {},
) =>
    useQuery({
        queryKey: qk.logbook.entry(id ?? ''),
        queryFn: ({ signal }) => api.getEntry(id as string, signal),
        enabled: Boolean(id),
        staleTime: STALE.detail,
        refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
    });

export const useFeedback = (id: string | undefined) =>
    useQuery({
        queryKey: qk.logbook.feedback(id ?? ''),
        queryFn: ({ signal }) => api.listFeedback(id as string, signal),
        enabled: Boolean(id),
        staleTime: STALE.detail,
    });

export const usePendingReviews = (filters: PageParams = {}) =>
    useQuery({
        queryKey: [...qk.logbook.pending(), filters] as const,
        queryFn: ({ signal }) => api.listPendingReviews(filters, signal),
        staleTime: STALE.list,
        refetchOnWindowFocus: true,
    });

// Entry-based mutations do not know the placement id, so they refresh the whole logbook area.
const touched = () =>
    [qk.logbook.everything(), qk.flags.all(), qk.dashboards(), qk.reports.all()] as const;

export const useCreateWeek = () =>
    useApiMutation({
        mutationFn: (v: { placementId: string; body: api.WeekInput }) =>
            api.createWeek(v.placementId, v.body),
        invalidate: (v) => [qk.logbook.all(v.placementId), qk.dashboards()],
    });

export const useUpdateWeek = () =>
    useApiMutation({
        mutationFn: (v: { id: string; body: Partial<api.WeekInput> }) =>
            api.updateWeek(v.id, v.body),
        invalidate: () => [qk.logbook.everything()],
    });

export const useSubmitWeek = () =>
    useApiMutation({ mutationFn: (id: string) => api.submitWeek(id), invalidate: touched });

export const useApproveWeek = () =>
    useApiMutation({
        mutationFn: (v: { id: string; body?: api.ApproveWeekInput }) =>
            api.approveWeek(v.id, v.body),
        invalidate: touched,
    });

export const useReturnWeek = () =>
    useApiMutation({
        mutationFn: (v: { id: string; comment: string }) => api.returnWeek(v.id, v.comment),
        invalidate: touched,
    });

export const useReopenWeek = () =>
    useApiMutation({
        mutationFn: (v: { id: string; reason: string }) => api.reopenWeek(v.id, v.reason),
        invalidate: touched,
    });

export const useAddFeedback = () =>
    useApiMutation({
        mutationFn: (v: { id: string; comment: string }) => api.addFeedback(v.id, v.comment),
        invalidate: (v) => [qk.logbook.feedback(v.id), qk.logbook.entry(v.id), qk.dashboards()],
    });

export const useUploadImage = () =>
    useApiMutation({
        mutationFn: (v: {
            entryId: string;
            file: File;
            caption?: string;
            workDate?: string;
            onProgress?: (percent: number) => void;
        }) => api.uploadImage(v.entryId, v.file, v),
        invalidate: (v) => [qk.logbook.entry(v.entryId)],
    });

export const useDeleteImage = () =>
    useApiMutation({
        mutationFn: (v: { imageId: string; entryId: string }) => api.deleteImage(v.imageId),
        invalidate: (v) => [qk.logbook.entry(v.entryId)],
    });
