import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/api/cache';
import { useApiMutation } from '@/lib/api/hooks-utils';
import { qk } from '@/lib/api/query-keys';
import * as api from './api';

export const useNotices = (filters: api.NoticeFilters = {}) =>
    useQuery({
        queryKey: qk.notices.list(filters),
        queryFn: ({ signal }) => api.listNotices(filters, signal),
        staleTime: STALE.list,
    });

export const useNotice = (id: string | undefined) =>
    useQuery({
        queryKey: qk.notices.detail(id ?? ''),
        queryFn: ({ signal }) => api.getNotice(id as string, signal),
        enabled: Boolean(id),
        staleTime: STALE.detail,
    });

// Every role's dashboard shows notices, so a notice change refreshes all dashboards.
const changed = () => [qk.notices.all(), qk.dashboards()] as const;

export const useCreateNotice = () =>
    useApiMutation({
        mutationFn: (body: api.NoticeInput) => api.createNotice(body),
        invalidate: changed,
    });

export const useUpdateNotice = () =>
    useApiMutation({
        mutationFn: (v: { id: string; body: Partial<api.NoticeInput> }) =>
            api.updateNotice(v.id, v.body),
        invalidate: changed,
    });

export const useArchiveNotice = () =>
    useApiMutation({ mutationFn: (id: string) => api.archiveNotice(id), invalidate: changed });
