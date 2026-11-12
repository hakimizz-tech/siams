import { get, patch, post } from '@/lib/api/endpoints';
import type { Page, PageParams } from '@/lib/api/pagination';
import type { Visit, VisitMode, VisitStatus } from '@/types/domain';

export interface VisitFilters extends PageParams {
    status?: VisitStatus;
    date_from?: string;
    date_to?: string;
}

export interface VisitInput {
    mode: VisitMode;
    scheduled_at: string;
    meeting_link?: string;
    notes?: string;
}

export const listVisits = (filters: VisitFilters = {}, signal?: AbortSignal) =>
    get<Page<Visit>>('/api/v1/visits/', { query: filters, signal });

export const listPlacementVisits = (placementId: string, signal?: AbortSignal) =>
    get<Page<Visit>>('/api/v1/placements/{placement_id}/visits/', {
        path: { placement_id: placementId },
        signal,
    });

export const scheduleVisit = (placementId: string, body: VisitInput) =>
    post<Visit>('/api/v1/placements/{placement_id}/visits/', {
        path: { placement_id: placementId },
        body,
    });

export const updateVisit = (id: string, body: Partial<VisitInput> & { status?: VisitStatus }) =>
    patch<Visit>('/api/v1/visits/{id}/', { path: { id }, body });

export const completeVisit = (id: string, notes: string) =>
    post<Visit>('/api/v1/visits/{id}/complete/', { path: { id }, body: { notes } });
