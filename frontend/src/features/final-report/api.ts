import { get, post, upload } from '@/lib/api/endpoints';
import type { FinalReport } from '@/types/domain';

export const getFinalReport = (placementId: string, signal?: AbortSignal) =>
    get<FinalReport>('/api/v1/placements/{placement_id}/final-report/', {
        path: { placement_id: placementId },
        signal,
    });

/** Upload, or replace while SUBMITTED or RETURNED. Locked once ACCEPTED (the API answers 409). */
export function uploadFinalReport(
    placementId: string,
    file: File,
    options: { title?: string; onProgress?: (percent: number) => void } = {},
) {
    const form = new FormData();
    form.append('document', file);
    if (options.title) form.append('title', options.title);
    return upload<FinalReport>('/api/v1/placements/{placement_id}/final-report/', form, {
        path: { placement_id: placementId },
        onProgress: options.onProgress,
    });
}

export const acceptReport = (id: string) =>
    post<FinalReport>('/api/v1/final-reports/{id}/accept/', { path: { id } });

export const returnReport = (id: string, feedback: string) =>
    post<FinalReport>('/api/v1/final-reports/{id}/return/', { path: { id }, body: { feedback } });

/** Private file: download with downloadFile(url, name). The report payload also carries download_url. */
export const reportFileUrl = (id: string) => `/api/v1/final-reports/${id}/file/`;
