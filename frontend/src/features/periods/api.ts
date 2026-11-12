import { get, patch, post, put } from '@/lib/api/endpoints';
import type { Page, PageParams } from '@/lib/api/pagination';
import type { GradeBand, Period } from '@/types/domain';

export interface PeriodInput {
    name: string;
    type: 'INTERNSHIP' | 'ATTACHMENT';
    start_date: string;
    end_date: string;
    required_hours: number;
    min_visits: number;
    assessment_opens_on?: string | null;
}

export interface GradeBandInput {
    min_percent: number | string;
    label: string;
}

export const listPeriods = (filters: PageParams = {}, signal?: AbortSignal) =>
    get<Page<Period>>('/api/v1/periods/', { query: filters, signal });

export const getPeriod = (id: string, signal?: AbortSignal) =>
    get<Period>('/api/v1/periods/{id}/', { path: { id }, signal });

export const createPeriod = (body: PeriodInput) => post<Period>('/api/v1/periods/', { body });

export const updatePeriod = (id: string, body: Partial<PeriodInput>) =>
    patch<Period>('/api/v1/periods/{id}/', { path: { id }, body });

export const getGradeBands = (periodId: string, signal?: AbortSignal) =>
    get<GradeBand[]>('/api/v1/periods/{period_id}/grade-bands/', {
        path: { period_id: periodId },
        signal,
    });

export const setGradeBands = (periodId: string, bands: GradeBandInput[]) =>
    put<GradeBand[]>('/api/v1/periods/{period_id}/grade-bands/', {
        path: { period_id: periodId },
        body: bands,
    });
