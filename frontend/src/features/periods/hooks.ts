import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/api/cache';
import { useApiMutation } from '@/lib/api/hooks-utils';
import type { PageParams } from '@/lib/api/pagination';
import { qk } from '@/lib/api/query-keys';
import * as api from './api';

export const usePeriods = (filters: PageParams = {}) =>
    useQuery({
        queryKey: qk.periods.list(filters),
        queryFn: ({ signal }) => api.listPeriods(filters, signal),
        staleTime: STALE.reference,
    });

export const usePeriod = (id: string | undefined) =>
    useQuery({
        queryKey: qk.periods.detail(id ?? ''),
        queryFn: ({ signal }) => api.getPeriod(id as string, signal),
        enabled: Boolean(id),
        staleTime: STALE.reference,
    });

export const useGradeBands = (periodId: string | undefined) =>
    useQuery({
        queryKey: qk.periods.gradeBands(periodId ?? ''),
        queryFn: ({ signal }) => api.getGradeBands(periodId as string, signal),
        enabled: Boolean(periodId),
        staleTime: STALE.reference,
    });

export const useCreatePeriod = () =>
    useApiMutation({
        mutationFn: (body: api.PeriodInput) => api.createPeriod(body),
        invalidate: () => [qk.periods.all()],
    });

export const useUpdatePeriod = () =>
    useApiMutation({
        mutationFn: (v: { id: string; body: Partial<api.PeriodInput> }) =>
            api.updatePeriod(v.id, v.body),
        invalidate: () => [qk.periods.all(), qk.dashboards()],
    });

export const useSetGradeBands = () =>
    useApiMutation({
        mutationFn: (v: { periodId: string; bands: api.GradeBandInput[] }) =>
            api.setGradeBands(v.periodId, v.bands),
        invalidate: (v) => [qk.periods.gradeBands(v.periodId), qk.result(v.periodId)],
    });
