import { get, post } from '@/lib/api/endpoints';
import type { Page, PageParams } from '@/lib/api/pagination';
import type { Flag } from '@/types/domain';

export interface FlagFilters extends PageParams {
    placement?: string;
    type?: string;
    resolved?: boolean;
}

export const listFlags = (filters: FlagFilters = {}, signal?: AbortSignal) =>
    get<Page<Flag>>('/api/v1/flags/', { query: filters, signal });

export const resolveFlag = (id: string, note: string) =>
    post<Flag>('/api/v1/flags/{id}/resolve/', { path: { id }, body: { note } });
