import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/api/cache';
import { useApiMutation } from '@/lib/api/hooks-utils';
import { usePollJob } from '@/lib/api/jobs';
import { qk } from '@/lib/api/query-keys';
import * as api from './api';

export const usePlacementSummary = (placementId: string | undefined) =>
    useQuery({
        queryKey: qk.reports.placementSummary(placementId ?? ''),
        queryFn: ({ signal }) => api.getPlacementSummary(placementId as string, signal),
        enabled: Boolean(placementId),
        staleTime: STALE.detail,
    });

export const usePeriodSummary = (periodId: string | undefined) =>
    useQuery({
        queryKey: qk.reports.periodSummary(periodId ?? ''),
        queryFn: ({ signal }) => api.getPeriodSummary(periodId as string, signal),
        enabled: Boolean(periodId),
        staleTime: STALE.list,
    });

export const useStartExport = () =>
    useApiMutation({ mutationFn: (periodId: string) => api.startExport(periodId) });

/** Poll the export started by useStartExport; when SUCCESS, call downloadFile(data.download_url). */
export const useExportJob = (jobId: string | null | undefined) =>
    usePollJob({ jobId, queryKey: qk.reports.exportJob(jobId ?? ''), fetcher: api.getExportJob });
