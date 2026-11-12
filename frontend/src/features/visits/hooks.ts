import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/api/cache';
import { useApiMutation } from '@/lib/api/hooks-utils';
import { qk } from '@/lib/api/query-keys';
import * as api from './api';

export const useVisits = (filters: api.VisitFilters = {}) =>
    useQuery({
        queryKey: qk.visits.list(filters),
        queryFn: ({ signal }) => api.listVisits(filters, signal),
        staleTime: STALE.list,
    });

export const usePlacementVisits = (placementId: string | undefined) =>
    useQuery({
        queryKey: qk.visits.forPlacement(placementId ?? ''),
        queryFn: ({ signal }) => api.listPlacementVisits(placementId as string, signal),
        enabled: Boolean(placementId),
        staleTime: STALE.list,
    });

const touched = () => [qk.visits.all(), qk.dashboards()] as const;

export const useScheduleVisit = () =>
    useApiMutation({
        mutationFn: (v: { placementId: string; body: api.VisitInput }) =>
            api.scheduleVisit(v.placementId, v.body),
        invalidate: touched,
    });

export const useUpdateVisit = () =>
    useApiMutation({
        mutationFn: (v: { id: string; body: Parameters<typeof api.updateVisit>[1] }) =>
            api.updateVisit(v.id, v.body),
        invalidate: touched,
    });

export const useCompleteVisit = () =>
    useApiMutation({
        mutationFn: (v: { id: string; notes: string }) => api.completeVisit(v.id, v.notes),
        invalidate: touched,
    });
