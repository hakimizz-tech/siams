import { del, get, patch, post, upload } from '@/lib/api/endpoints';
import type { Page, PageParams } from '@/lib/api/pagination';
import type {
    Feedback,
    LogbookEntry,
    LogbookImage,
    LogbookStatus,
    LogbookTimelineItem,
} from '@/types/domain';

export interface DailyActivityInput {
    work_date: string;
    hours: number | string;
    description: string;
}

export interface WeekInput {
    week_start: string;
    summary?: string;
    activities: DailyActivityInput[];
}

export interface ApproveWeekInput {
    adjustments?: Array<{ work_date: string; approved_hours: number | string }>;
    comment?: string;
}

export interface LogbookFilters extends PageParams {
    status?: LogbookStatus;
}

export const listLogbook = (
    placementId: string,
    filters: LogbookFilters = {},
    signal?: AbortSignal,
) =>
    get<Page<LogbookEntry>>('/api/v1/placements/{placement_id}/logbook/', {
        path: { placement_id: placementId },
        query: filters,
        signal,
    });

/** Every expected week with its status, including MISSING weeks. */
export const getLogbookTimeline = (placementId: string, signal?: AbortSignal) =>
    get<LogbookTimelineItem[]>('/api/v1/placements/{placement_id}/logbook/timeline/', {
        path: { placement_id: placementId },
        signal,
    });

export const createWeek = (placementId: string, body: WeekInput) =>
    post<LogbookEntry>('/api/v1/placements/{placement_id}/logbook/', {
        path: { placement_id: placementId },
        body,
    });

export const getEntry = (id: string, signal?: AbortSignal) =>
    get<LogbookEntry>('/api/v1/logbook/{id}/', { path: { id }, signal });

/** The `activities` list REPLACES the existing one. */
export const updateWeek = (id: string, body: Partial<WeekInput>) =>
    patch<LogbookEntry>('/api/v1/logbook/{id}/', { path: { id }, body });

export const submitWeek = (id: string) =>
    post<LogbookEntry>('/api/v1/logbook/{id}/submit/', { path: { id } });

export const approveWeek = (id: string, body: ApproveWeekInput = {}) =>
    post<LogbookEntry>('/api/v1/logbook/{id}/approve/', { path: { id }, body });

export const returnWeek = (id: string, comment: string) =>
    post<LogbookEntry>('/api/v1/logbook/{id}/return/', { path: { id }, body: { comment } });

export const reopenWeek = (id: string, reason: string) =>
    post<LogbookEntry>('/api/v1/logbook/{id}/reopen/', { path: { id }, body: { reason } });

export const listFeedback = (id: string, signal?: AbortSignal) =>
    get<Feedback[]>('/api/v1/logbook/{id}/feedback/', { path: { id }, signal });

export const addFeedback = (id: string, comment: string) =>
    post<Feedback>('/api/v1/logbook/{id}/feedback/', { path: { id }, body: { comment } });

export const listPendingReviews = (filters: PageParams = {}, signal?: AbortSignal) =>
    get<Page<LogbookEntry>>('/api/v1/logbook/pending/', { query: filters, signal });

export function uploadImage(
    entryId: string,
    file: File,
    options: { caption?: string; workDate?: string; onProgress?: (percent: number) => void } = {},
) {
    const form = new FormData();
    form.append('image', file);
    if (options.caption) form.append('caption', options.caption);
    if (options.workDate) form.append('work_date', options.workDate);
    return upload<LogbookImage>('/api/v1/logbook/{id}/images/', form, {
        path: { id: entryId },
        onProgress: options.onProgress,
    });
}

export const deleteImage = (imageId: string) =>
    del('/api/v1/logbook/images/{image_id}/', { path: { image_id: imageId } });

/** Private file: fetch with useProtectedObjectUrl / downloadFile, never as a plain <img src>. */
export const imageFileUrl = (imageId: string) => `/api/v1/logbook/images/${imageId}/file/`;
