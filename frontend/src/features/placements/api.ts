import { get, patch, post } from '@/lib/api/endpoints';
import type { Page, PageParams } from '@/lib/api/pagination';
import type { Placement, PlacementStatus, TimelineEvent } from '@/types/domain';

export interface PlacementFilters extends PageParams {
    period?: string;
    status?: PlacementStatus;
    student?: string;
    organization?: string;
    supervisor?: string;
}

export interface PlacementCreateInput {
    student?: string; // coordinators only
    period: string;
    organization: string;
    role_title?: string;
    department?: string;
    task_description?: string;
    start_date: string;
    end_date: string;
    proposed_supervisor_name?: string;
    proposed_supervisor_email?: string;
    proposed_supervisor_phone?: string;
}

export type PlacementUpdateInput = Partial<Omit<PlacementCreateInput, 'student' | 'period'>>;

export interface ApproveInput {
    academic_supervisor: string;
    workplace_supervisor?: string | null;
    invite_workplace_supervisor?: boolean;
    remarks?: string;
}

export interface AssignInput {
    academic_supervisor?: string;
    workplace_supervisor?: string;
}

const P = '/api/v1/placements/{id}/';

export const listPlacements = (filters: PlacementFilters = {}, signal?: AbortSignal) =>
    get<Page<Placement>>('/api/v1/placements/', { query: filters, signal });

export const getMyPlacement = (signal?: AbortSignal) =>
    get<Placement>('/api/v1/placements/me/', { signal });

export const getPlacement = (id: string, signal?: AbortSignal) =>
    get<Placement>(P, { path: { id }, signal });

export const getPlacementTimeline = (id: string, signal?: AbortSignal) =>
    get<TimelineEvent[]>('/api/v1/placements/{id}/timeline/', { path: { id }, signal });

export const createPlacement = (body: PlacementCreateInput) =>
    post<Placement>('/api/v1/placements/', { body });

export const updatePlacement = (id: string, body: PlacementUpdateInput) =>
    patch<Placement>(P, { path: { id }, body });

export const submitPlacement = (id: string) =>
    post<Placement>('/api/v1/placements/{id}/submit/', { path: { id } });

export const approvePlacement = (id: string, body: ApproveInput) =>
    post<Placement>('/api/v1/placements/{id}/approve/', { path: { id }, body });

export const returnPlacement = (id: string, remarks: string) =>
    post<Placement>('/api/v1/placements/{id}/return/', { path: { id }, body: { remarks } });

export const rejectPlacement = (id: string, remarks: string) =>
    post<Placement>('/api/v1/placements/{id}/reject/', { path: { id }, body: { remarks } });

export const assignSupervisors = (id: string, body: AssignInput) =>
    post<Placement>('/api/v1/placements/{id}/assign-supervisors/', { path: { id }, body });

export const completePlacement = (id: string) =>
    post<Placement>('/api/v1/placements/{id}/complete/', { path: { id } });

export const terminatePlacement = (id: string, reason: string) =>
    post<Placement>('/api/v1/placements/{id}/terminate/', { path: { id }, body: { reason } });
