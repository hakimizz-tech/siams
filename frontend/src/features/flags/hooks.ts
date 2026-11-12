import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/api/cache';
import { useApiMutation } from '@/lib/api/hooks-utils';
import { qk } from '@/lib/api/query-keys';
import * as api from './api';

export const useFlags = (filters: api.FlagFilters = {}) =>
    useQuery({
        queryKey: qk.flags.list(filters),
        queryFn: ({ signal }) => api.listFlags(filters, signal),
        staleTime: STALE.list,
    });

export const useResolveFlag = () =>
    useApiMutation({
        mutationFn: (v: { id: string; note: string }) => api.resolveFlag(v.id, v.note),
        invalidate: () => [qk.flags.all(), qk.dashboards()],
    });
