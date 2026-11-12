import { del, get, patch, post } from '@/lib/api/endpoints';
import type { Page, PageParams } from '@/lib/api/pagination';
import type { Notice, NoticeAudience } from '@/types/domain';

export interface NoticeFilters extends PageParams {
    period?: string;
}

export interface NoticeInput {
    title: string;
    body: string;
    audience: NoticeAudience;
    period?: string | null;
    pinned?: boolean;
    publish_at?: string | null;
    expires_at?: string | null;
    send_email?: boolean;
}

export const listNotices = (filters: NoticeFilters = {}, signal?: AbortSignal) =>
    get<Page<Notice>>('/api/v1/notices/', { query: filters, signal });

export const getNotice = (id: string, signal?: AbortSignal) =>
    get<Notice>('/api/v1/notices/{id}/', { path: { id }, signal });

export const createNotice = (body: NoticeInput) => post<Notice>('/api/v1/notices/', { body });

export const updateNotice = (id: string, body: Partial<NoticeInput>) =>
    patch<Notice>('/api/v1/notices/{id}/', { path: { id }, body });

/** DELETE archives the notice. */
export const archiveNotice = (id: string) => del('/api/v1/notices/{id}/', { path: { id } });
