import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/api/cache';
import { useApiMutation } from '@/lib/api/hooks-utils';
import { qk } from '@/lib/api/query-keys';
import * as api from './api';

/** 404 means "nothing uploaded yet": a normal state, so no retries. */
export const useFinalReport = (placementId: string | undefined) =>
    useQuery({
        queryKey: qk.finalReport(placementId ?? ''),
        queryFn: ({ signal }) => api.getFinalReport(placementId as string, signal),
        enabled: Boolean(placementId),
        staleTime: STALE.detail,
        retry: false,
    });

const changed = (placementId?: string) =>
    [
        ...(placementId ? [qk.finalReport(placementId), qk.result(placementId)] : []),
        qk.dashboards(),
    ] as const;

export const useUploadFinalReport = () =>
    useApiMutation({
        mutationFn: (v: {
            placementId: string;
            file: File;
            title?: string;
            onProgress?: (percent: number) => void;
        }) => api.uploadFinalReport(v.placementId, v.file, v),
        invalidate: (v) => changed(v.placementId),
    });

export const useAcceptReport = () =>
    useApiMutation({
        mutationFn: (v: { id: string; placementId: string }) => api.acceptReport(v.id),
        invalidate: (v) => changed(v.placementId),
    });

export const useReturnReport = () =>
    useApiMutation({
        mutationFn: (v: { id: string; placementId: string; feedback: string }) =>
            api.returnReport(v.id, v.feedback),
        invalidate: (v) => changed(v.placementId),
    });
