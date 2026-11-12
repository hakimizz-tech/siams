import { get, post } from '@/lib/api/endpoints';
import type { ExportJob, JobStart, PeriodSummary, PlacementSummary } from '@/types/domain';

export const getPlacementSummary = (placementId: string, signal?: AbortSignal) =>
    get<PlacementSummary>('/api/v1/placements/{placement_id}/summary/', {
        path: { placement_id: placementId },
        signal,
    });

/** The coordinator's one-page summary (academic supervisors see only their own students). */
export const getPeriodSummary = (periodId: string, signal?: AbortSignal) =>
    get<PeriodSummary>('/api/v1/reports/periods/{period_id}/summary/', {
        path: { period_id: periodId },
        signal,
    });

export const startExport = (periodId: string) =>
    post<JobStart>('/api/v1/reports/export/', {
        body: { report: 'period_summary', period: periodId },
    });

export const getExportJob = (jobId: string, signal?: AbortSignal) =>
    get<ExportJob>('/api/v1/reports/export/{job_id}/', { path: { job_id: jobId }, signal });

/** Prefer the `download_url` returned by the job status; this is the same endpoint. */
export const exportFileUrl = (jobId: string) => `/api/v1/reports/export/${jobId}/file/`;
